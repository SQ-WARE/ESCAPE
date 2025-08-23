import type GamePlayer from '../GamePlayer';
import type { World } from 'hytopia';
import { DeathSystem } from './DeathSystem';

interface Session {
  id: string;
  label: string;
  durationSeconds: number;
  startTimeMs: number;
}

interface SessionSummary {
  id: string;
  label: string;
  endsAt: number; // epoch ms
  secondsLeft: number;
  durationSeconds: number;
  worldHour: number;
  worldMinute: number;
  worldTimeFormatted: string; // 12-hour format with AM/PM
}

/**
 * SessionManager maintains two rotating sessions with overlapping timers.
 * Players deploy into a specific session; if the timer expires before extraction,
 * they are marked MIA and returned to the main menu.
 */
export default class SessionManager {
  private static _instance: SessionManager | undefined;
  public static get instance(): SessionManager {
    if (!this._instance) this._instance = new SessionManager();
    return this._instance;
  }

  private readonly _sessions: Session[] = [];
  private readonly _playerAssignments: Map<string, { sessionId: string, player: GamePlayer }> = new Map();
  private _tickHandle: NodeJS.Timeout | null = null;
  private readonly _sessionWorlds: Map<string, World> = new Map();
  private _lobbyWorld: World | null = null;
  private readonly _clockConfig: Record<string, { baseHour: number; minutesPerRealSecond: number }> = {};
  private readonly _transfersInProgress: Set<string> = new Set();
  private readonly _lastWarnings: Map<string, number> = new Map();
  private readonly _menuPlayers: Set<GamePlayer> = new Set();

  // Default: 45 minutes per session; staggered by half so one is always mid-cycle
  private readonly _defaultDurationSeconds = 45 * 60;

  private constructor() {}

  public initialize(): void {
    if (this._sessions.length > 0) return;
    const now = Date.now();
    const d = this._defaultDurationSeconds;
    const cycleMs = d * 1000;
    // Normalize starts to the current cycle so both sessions are active with different time left
    const baseStart = now - (now % cycleMs); // start of current alpha cycle
    const alphaStart = baseStart;
    const omegaStart = baseStart - Math.floor(cycleMs / 2); // half-cycle earlier so omega ends sooner/later
    this._sessions.push({ id: 'alpha', label: 'ALPHA', durationSeconds: d, startTimeMs: alphaStart });
    this._sessions.push({ id: 'omega', label: 'OMEGA', durationSeconds: d, startTimeMs: omegaStart });
    // Configure world clocks: ALPHA starts midday, OMEGA starts late night
    this._clockConfig['alpha'] = { baseHour: 0, minutesPerRealSecond: 0.5 }; // 6h progression over 12m
    this._clockConfig['omega'] = { baseHour: 0, minutesPerRealSecond: 0.5 }; // 6h progression over 12m
    
    
    
    // Start ticking
    this._startTicking();
  }

  public getMenuSessionSummaries(): SessionSummary[] {
    return this._sessions.map(s => this._toSummary(s));
  }

  public getBestSessionIdForNewDeploy(): string {
    const summaries = this.getMenuSessionSummaries();
    // Prefer the session with more time remaining
    summaries.sort((a, b) => b.secondsLeft - a.secondsLeft);
    return summaries[0]?.id || 'alpha';
  }

  public getSecondsLeftForSession(sessionId: string): number | undefined {
    const s = this._sessions.find(x => x.id === sessionId);
    if (!s) return undefined;
    return this._secondsLeft(s);
  }

  public setSessionWorld(sessionId: string, world: World): void {
    this._sessionWorlds.set(sessionId, world);
  }

  public setLobbyWorld(world: World): void {
    this._lobbyWorld = world;
  }

  public getLobbyWorld(): World | null { return this._lobbyWorld; }

  public isTransferringById(playerId: string | undefined): boolean {
    if (!playerId) return false;
    return this._transfersInProgress.has(playerId);
  }

  public markTransferStartById(playerId: string | undefined): void {
    if (!playerId) return;
    this._transfersInProgress.add(playerId);
  }

  public markTransferEndById(playerId: string | undefined): void {
    if (!playerId) return;
    this._transfersInProgress.delete(playerId);
  }

  /**
   * Called by UI flow before deploying. Ensures a session is selected and warns when ending soon.
   * Returns true if deploy may proceed, false if blocked (e.g., no session selected).
   */
  public beforeDeploy(gamePlayer: GamePlayer): boolean {
    const sid = this.getPlayerSessionId(gamePlayer);
    if (!sid) {
      try { gamePlayer.player.ui.sendData({ type: 'notification', message: 'Select a session (ALPHA or OMEGA) to deploy', color: 'FF0000' }); } catch {}
      return false;
    }
    const left = this.getSecondsLeftForSession(sid);
    if (typeof left === 'number' && left <= 0) {
      try { gamePlayer.player.ui.sendData({ type: 'notification', message: 'Selected session just ended. Please reselect.', color: 'FF0000' }); } catch {}
      return false;
    }
    this._ensurePlayerInSessionWorld(gamePlayer, sid);
    if (typeof left === 'number' && left <= 120) {
      try { gamePlayer.player.ui.sendData({ type: 'notification', message: `Warning: ${sid.toUpperCase()} ends in ${left}s`, color: 'FF0000' }); } catch {}
    }
    
    
    
    return true;
  }

  /**
   * Handles session selection from the menu. Assigns and warns if ending soon.
   */
  public handleSelectSession(gamePlayer: GamePlayer, sessionId: string): void {
    if (!this._sessions.some(s => s.id === sessionId)) {
      try { gamePlayer.player.ui.sendData({ type: 'notification', message: 'Invalid session selected', color: 'FF0000' }); } catch {}
      return;
    }
    this.assignPlayerToSession(gamePlayer, sessionId);
    const left = this.getSecondsLeftForSession(sessionId);
    if (typeof left === 'number' && left <= 120) {
      try { gamePlayer.player.ui.sendData({ type: 'notification', message: `Session ends in ${left}s`, color: 'FFA000' }); } catch {}
    }
  }

  /**
   * Returns session-related fields to merge into the menu-hud payload.
   */
  public getMenuHudExtras(gamePlayer: GamePlayer): { sessions: SessionSummary[]; assignedSessionId?: string } {
    // Track this player as being in the menu
    this._menuPlayers.add(gamePlayer);
    return {
      sessions: this.getMenuSessionSummaries(),
      assignedSessionId: this.getPlayerSessionId(gamePlayer),
    };
  }

  public removeMenuPlayer(gamePlayer: GamePlayer): void {
    this._menuPlayers.delete(gamePlayer);
  }

  /**
   * Hook called by game flow when a player successfully extracts.
   */
  public onExtractionSuccess(gamePlayer: GamePlayer): void {
    this.clearPlayer(gamePlayer);
  }

  public assignPlayerToSession(gamePlayer: GamePlayer, sessionId: string): void {
    const playerId = gamePlayer?.player?.id || gamePlayer?.player?.username;
    if (!playerId) return;
    if (!this._sessions.some(s => s.id === sessionId)) {
      sessionId = this.getBestSessionIdForNewDeploy();
    }
    this._playerAssignments.set(playerId, { sessionId, player: gamePlayer });
    
  }

  public clearPlayer(gamePlayer: GamePlayer): void {
    const playerId = gamePlayer?.player?.id || gamePlayer?.player?.username;
    if (!playerId) return;
    this._playerAssignments.delete(playerId);
    // Clear warning tracking for this player
    this._lastWarnings.delete(`lastWarning_${playerId}`);
    // Remove from menu players tracking
    this._menuPlayers.delete(gamePlayer);
  }

  public clearPlayerById(playerId: string | undefined): void {
    if (!playerId) return;
    this._playerAssignments.delete(playerId);
    // Clear warning tracking for this player
    this._lastWarnings.delete(`lastWarning_${playerId}`);
  }

  public getPlayerSessionId(gamePlayer: GamePlayer): string | undefined {
    const playerId = gamePlayer?.player?.id || gamePlayer?.player?.username;
    if (!playerId) return undefined;
    return this._playerAssignments.get(playerId)?.sessionId;
  }

  private _startTicking(): void {
    if (this._tickHandle) return;
    this._tickHandle = setInterval(() => {
      const now = Date.now();
      // Rotate sessions that have ended
      let sessionsRestarted = false;
      for (const s of this._sessions) {
        const endMs = s.startTimeMs + s.durationSeconds * 1000;
        if (now >= endMs) {
          // Restart session immediately back-to-back
          s.startTimeMs = endMs;
          sessionsRestarted = true;
        }
      }

      // Notify menu players when sessions restart
      if (sessionsRestarted) {
        this._notifyMenuPlayersOfSessionUpdate();
      }

      // Update menu players with fresh session data (including world time) every second
      this._notifyMenuPlayersOfSessionUpdate();

      // Per-player HUD updates and MIA enforcement
      // Iterate over a copy of entries to avoid mutation issues during MIA clears
      const entries = Array.from(this._playerAssignments.entries());
      
      for (const [playerId, assignment] of entries) {
        try {
          const gp = assignment.player;
          if (!gp || !gp.currentEntity) {
            // Player is not in-raid (likely at menu). Keep session assignment so they can deploy later.
            continue;
          }
          const session = this._sessions.find(s => s.id === assignment.sessionId);
          if (!session) {
            // No matching session (should not happen since sessions rotate in place). Skip updates.
            continue;
          }
          const secondsLeft = this._secondsLeft(session);

          // Push HUD timer update
          try {
            const { hour, minute, formatted } = this._computeWorldClock(session.id);
            gp.player.ui.sendData({ type: 'raid-timer', secondsLeft, totalSeconds: session.durationSeconds, sessionId: session.id, worldHour: hour, worldMinute: minute, worldTimeFormatted: formatted });
          } catch {}

          // Enhanced raid ending warnings - prevent duplicates by tracking last warning
          const lastWarningKey = `lastWarning_${playerId}`;
          const lastWarning = this._lastWarnings.get(lastWarningKey) || 0;
          
          if (secondsLeft === 900 || secondsLeft === 600 || secondsLeft === 300 || secondsLeft === 180 || secondsLeft === 120 || secondsLeft === 90 || secondsLeft === 60 || secondsLeft === 45 || secondsLeft === 30 || secondsLeft === 20 || secondsLeft === 15 || secondsLeft === 10 || secondsLeft === 5) {
            // Only send warning if we haven't sent one for this exact time recently
            if (lastWarning !== secondsLeft) {
              try {
                let message: string;
                if (secondsLeft >= 60) {
                  const minutes = Math.floor(secondsLeft / 60);
                  message = `⚠️ WARNING! Raid ends in ${minutes}m ${secondsLeft % 60}s - Find an extraction zone or you will be MIA!`;
                } else {
                  message = `🚨 CRITICAL! Raid ends in ${secondsLeft}s - EXTRACT NOW or lose everything!`;
                }
                gp.player.ui.sendData({ type: 'notification', message, color: 'FF0000' });
                this._lastWarnings.set(lastWarningKey, secondsLeft);
              } catch {}
            }
          }

          // Continuous warning for last 30 seconds - prevent spam
          if (secondsLeft <= 30 && secondsLeft > 0 && secondsLeft % 10 === 0) {
            // Only send every 10 seconds instead of every 5 to reduce spam
            if (lastWarning !== secondsLeft) {
              try {
                const message = `🚨 FINAL WARNING! ${secondsLeft}s remaining - EXTRACT IMMEDIATELY!`;
                gp.player.ui.sendData({ type: 'notification', message, color: 'FF0000' });
                this._lastWarnings.set(lastWarningKey, secondsLeft);
              } catch {}
            }
          }

          // Time over → MIA
          if (secondsLeft <= 0) {
            try {
              // Mark MIA and clear mapping
              if (gp.currentEntity) {
                DeathSystem.instance.handleMIA(gp.currentEntity);
              } else {
                // Player not in raid but still assigned to session - clear assignment
          
              }
            } catch (error) {
              // Error handling MIA
            }
            // Remove player assignment after MIA handling
            this._playerAssignments.delete(playerId);
            // Clear warning tracking for this player
            this._lastWarnings.delete(lastWarningKey);
          }
        } catch (error) {
          
        }
      }
    }, 1000);
  }

  private _toSummary(s: Session): SessionSummary {
    const secondsLeft = this._secondsLeft(s);
    const endsAt = s.startTimeMs + s.durationSeconds * 1000;
    const clock = this._computeWorldClock(s.id);
    return { 
      id: s.id, 
      label: s.label, 
      endsAt, 
      secondsLeft, 
      durationSeconds: s.durationSeconds, 
      worldHour: clock.hour, 
      worldMinute: clock.minute,
      worldTimeFormatted: clock.formatted
    };
  }

  private _secondsLeft(s: Session): number {
    const now = Date.now();
    const endMs = s.startTimeMs + s.durationSeconds * 1000;
    const secondsLeft = Math.max(0, Math.ceil((endMs - now) / 1000));
    

    
    return secondsLeft;
  }

  private _notifyMenuPlayersOfSessionUpdate(): void {
    // Send updated session data to all menu players
    for (const gamePlayer of this._menuPlayers) {
      try {
        if (gamePlayer && gamePlayer.player && gamePlayer.player.ui) {
          const sessionExtras = this.getMenuHudExtras(gamePlayer);
          gamePlayer.player.ui.sendData({
            type: 'menu-hud',
            ...sessionExtras,
          });
        }
      } catch (error) {
        // Remove invalid menu players
        this._menuPlayers.delete(gamePlayer);
      }
    }
  }

  private _computeWorldClock(sessionId: string): { hour: number; minute: number; formatted: string } {
    const s = this._sessions.find(x => x.id === sessionId);
    if (!s) return { hour: 0, minute: 0, formatted: '12:00 AM' };
    const cfg = this._clockConfig[sessionId] || { baseHour: 12, minutesPerRealSecond: 0.5 };
    const elapsedSec = Math.max(0, Math.floor((Date.now() - s.startTimeMs) / 1000));
    const elapsedMinutes = Math.floor(elapsedSec * cfg.minutesPerRealSecond);
    
    let hour: number;
    let minute: number;
    
    if (sessionId === 'alpha') {
      // Alpha world: stay in day time range (6:00-18:00, 12 hours)
      const dayMinutes = (cfg.baseHour * 60 + elapsedMinutes) % (12 * 60); // 12-hour cycle
      hour = (Math.floor(dayMinutes / 60) + 6) % 24; // Offset to 6:00-18:00 range, wrap around
      minute = dayMinutes % 60;
    } else if (sessionId === 'omega') {
      // Omega world: stay in night time range (18:00-6:00, 12 hours)
      const nightMinutes = (cfg.baseHour * 60 + elapsedMinutes) % (12 * 60); // 12-hour cycle
      hour = (Math.floor(nightMinutes / 60) + 18) % 24; // Offset to 18:00-6:00 range, wrap around
      minute = nightMinutes % 60;
    } else {
      // Fallback: full 24-hour cycle
      const fullCycleMinutes = (cfg.baseHour * 60 + elapsedMinutes) % (24 * 60);
      hour = Math.floor(fullCycleMinutes / 60);
      minute = fullCycleMinutes % 60;
    }
    
    // Format to 12-hour time with AM/PM
    const period = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    const formatted = `${displayHour}:${minute.toString().padStart(2, '0')} ${period}`;
    
    return { hour, minute, formatted };
  }

  private _ensurePlayerInSessionWorld(gamePlayer: GamePlayer, sessionId: string): void {
    try {
      const targetWorld = this._sessionWorlds.get(sessionId);
      if (!targetWorld) {
        
        return;
      }
      if (gamePlayer.player.world !== targetWorld) {
        const pid = gamePlayer?.player?.id || gamePlayer?.player?.username;
        
        this.markTransferStartById(pid);
        gamePlayer.player.joinWorld(targetWorld);
      }
    } catch (error) {
      
    }
  }
}


