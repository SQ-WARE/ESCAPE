import type { Player } from 'hytopia';
import GamePlayerEntity from '../GamePlayerEntity';

export interface ProgressionData {
  level: number;
  xp: number;
}

/**
 * ProgressionSystem manages XP and Level per player.
 * Stored under `progression: { level, xp }` in persisted data.
 */
export default class ProgressionSystem {
  public static get(player: Player): ProgressionData {
    try {
      const data = (player.getPersistedData?.() as any) || {};
      const prog = (data as any)?.progression || {};
      const level = Math.max(1, Math.floor(prog.level ?? 1));
      const xp = Math.max(0, Math.floor(prog.xp ?? 0));
      return { level, xp };
    } catch {
      return { level: 1, xp: 0 };
    }
  }

  public static set(player: Player, progression: ProgressionData): void {
    const level = Math.max(1, Math.floor(progression.level));
    const xp = Math.max(0, Math.floor(progression.xp));
    try {
      player.setPersistedData({ progression: { level, xp } });
    } catch {}
  }

  public static addXP(player: Player, amount: number, notify: boolean = true): void {
    const { level, xp } = this.get(player);
    const newXP = Math.max(0, xp + Math.floor(amount));
    const { newLevel, remainingXP } = this._applyLevelUps(level, newXP);
    this.set(player, { level: newLevel, xp: remainingXP });
    
    // Check progression achievements if level increased
    if (newLevel > level) {
      try {
        const AchievementSystem = require('./AchievementSystem').default;
        const data = (player.getPersistedData?.() as any) || {};
        const currency = Math.floor((data as any)?.currency ?? 0);
        AchievementSystem.checkProgressionAchievements(player, newLevel, currency);
        
        // Track level up timestamp
        player.setPersistedData({
          ...data,
          lastLevelUpTime: Date.now()
        });
      } catch {}
    }
    
    if (notify) {
      if (amount > 0) this._notify(player, `+${amount} XP`);
      if (newLevel > level) this._notify(player, `Level Up! ${level} → ${newLevel}`);
    }
  }

  public static addKillXP(killer: GamePlayerEntity, victim?: GamePlayerEntity): void {
    const xp = victim && victim !== killer ? 100 : 25; // PvP > misc
    this.addXP(killer.player, xp);
  }

  public static addDeathXP(playerEntity: GamePlayerEntity): void {
    this.addXP(playerEntity.player, 10); // small consolation
  }

  public static addPlaytimeXP(player: Player, elapsedMs: number): void {
    const seconds = Math.floor(elapsedMs / 1000);
    const xp = Math.floor(seconds / 30); // 1 XP per 30s
    if (xp > 0) this.addXP(player, xp, false);
  }

  private static _applyLevelUps(level: number, xp: number): { newLevel: number, remainingXP: number } {
    let currentLevel = level;
    let currentXP = xp;
    while (currentXP >= this._xpForNextLevel(currentLevel)) {
      currentXP -= this._xpForNextLevel(currentLevel);
      currentLevel += 1;
    }
    return { newLevel: currentLevel, remainingXP: currentXP };
  }

  private static _xpForNextLevel(level: number): number {
    // Simple curve: next = 100 + 25*(level-1)  (Level 1->2:100, 2->3:125, ...)
    return 100 + 25 * Math.max(0, level - 1);
  }

  public static getXpForNextLevel(level: number): number {
    return this._xpForNextLevel(level);
  }

  private static _notify(player: Player, message: string): void {
    try {
      player.ui?.sendData({ type: 'notification', message, color: '64B5F6' });
    } catch {}
  }
}


