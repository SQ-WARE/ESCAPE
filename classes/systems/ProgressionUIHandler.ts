import { Player, PlayerUIEvent, type EventPayloads } from 'hytopia';
import PlayerStatsSystem from './PlayerStatsSystem';
import WeaponProgressionSystem from './WeaponProgressionSystem';
import ProgressionSystem from './ProgressionSystem';
import AchievementSystem from './AchievementSystem';
import type GamePlayer from '../GamePlayer';

export class ProgressionUIHandler {
  private gamePlayer: GamePlayer;
  private player: Player;

  constructor(gamePlayer: GamePlayer) {
    this.gamePlayer = gamePlayer;
    this.player = gamePlayer.player;
  }

  public load(): void {
    try {
      this.player.ui.load('ui/progression.html');
      this.player.ui.off(PlayerUIEvent.DATA, this.handleProgressionUIData);
      this.player.ui.on(PlayerUIEvent.DATA, this.handleProgressionUIData);
      this.player.ui.lockPointer(false);
      
      // Proactively send initial data to avoid race where client requests before handler attaches
      setTimeout(() => {
        try {
          if (this.gamePlayer.isInMenu) {
            this.sendProgressOverview();
          }
        } catch {}
      }, 120);
    } catch {}
  }

  public unload(): void {
    try {
      this.player.ui.off(PlayerUIEvent.DATA, this.handleProgressionUIData);
    } catch {}
  }

  private handleProgressionUIData = (event: EventPayloads[PlayerUIEvent.DATA]) => {
    const { data } = event;
    switch (data.type) {
      case 'requestProgressOverview':
        this.sendProgressOverview();
        break;
      case 'openProgression':
        this.sendWeaponProgress();
        break;
      case 'backToMenu':
        this.gamePlayer.loadMenu();
        break;
    }
  }

  private sendWeaponProgress(): void {
    try {
      const rows = WeaponProgressionSystem.buildMenuRows(this.player);
      this.player.ui.sendData({ type: 'weapon-progress', rows });
    } catch {}
  }

  public sendProgressOverview(): void {
    try {
      const data = (this.player.getPersistedData?.() as any) || {};
      const currency = Math.max(0, Math.floor((data as any)?.currency ?? 0));
      const stats = PlayerStatsSystem.get(this.player);
      const weapons = WeaponProgressionSystem.buildMenuRows(this.player);
      const progression = ProgressionSystem.get(this.player);
      
      // Force refresh achievement progress with current stats
      const kills = Math.floor((data as any)?.kills ?? 0);
      const deaths = Math.floor((data as any)?.deaths ?? 0);
      const accuracy = Math.floor((data as any)?.accuracy ?? 0);
      const extractions = Math.floor((data as any)?.extractions ?? 0);
      const raids = Math.floor((data as any)?.raids ?? 0);
      const playtime = Math.floor((data as any)?.playtime ?? 0);
      const headshots = Math.floor((data as any)?.headshots ?? 0);
      const currentKillStreak = Math.floor((data as any)?.currentKillStreak ?? 0);
      const weaponKills = (data as any)?.weaponKills || {};
      
      // Fix any achievement data issues first
      AchievementSystem.fixAchievementData(this.player);
      
      // Update all achievements with current stats
      AchievementSystem.checkAllAchievements(this.player, {
        kills,
        deaths,
        accuracy,
        level: progression.level,
        currency,
        extractions,
        raids,
        playtime,
        headshots,
        currentKillStreak,
        weaponKills
      });
      
      // Get updated achievement data with guaranteed initialization
      const achievements = AchievementSystem.getWithInitialization(this.player);
      
      // Calculate additional stats for Combat Record
      const totalKills = weapons.reduce((sum, w) => sum + w.kills, 0);
      
      // Calculate real activity data
      const lastSessionTime = Math.floor((data as any)?.lastSessionTime ?? 0);
      const totalSessions = Math.floor((data as any)?.totalSessions ?? 0);
      const bestKillStreak = Math.floor((data as any)?.bestKillStreak ?? 0);
      const totalDamageDealt = Math.floor((data as any)?.totalDamageDealt ?? 0);
      const totalDamageTaken = Math.floor((data as any)?.totalDamageTaken ?? 0);
      const longestSurvival = Math.floor((data as any)?.longestSurvival ?? 0); // in minutes
      
      // Generate real activity feed
      const activities = this.generateActivityFeed(data);
      
      const progressData = { 
        type: 'progress-overview', 
        kills: stats.kills, 
        deaths: stats.deaths, 
        currency, 
        weapons,
        level: progression.level,
        xp: progression.xp,
        xpNext: ProgressionSystem.getXpForNextLevel(progression.level),
        totalKills,
        playtime,
        extractions,
        raids,
        accuracy,
        achievements,
        // Additional real data
        lastSessionTime,
        totalSessions,
        bestKillStreak,
        totalDamageDealt,
        totalDamageTaken,
        headshots,
        longestSurvival,
        activities
      };
        
      this.player.ui.sendData(progressData);
    } catch (error) {
      // Error sending progress overview
    }
  }

  private generateActivityFeed(data: any): Array<{icon: string, text: string, time: string}> {
    const activities = [];
    const now = Date.now();
    
    // Add recent achievements
    const recentAchievements = (data as any)?.recentAchievements || [];
    recentAchievements.slice(0, 2).forEach((achievement: any) => {
      activities.push({
        icon: '🏆',
        text: `Achievement: ${achievement.title}`,
        time: this.formatTimeAgo(achievement.unlockedAt)
      });
    });
    
    // Add recent extractions
    const lastExtraction = (data as any)?.lastExtractionTime;
    if (lastExtraction && (now - lastExtraction) < 24 * 60 * 60 * 1000) { // Within 24 hours
      activities.push({
        icon: '✅',
        text: 'Successful Extraction',
        time: this.formatTimeAgo(lastExtraction)
      });
    }
    
    // Add recent level ups
    const lastLevelUp = (data as any)?.lastLevelUpTime;
    if (lastLevelUp && (now - lastLevelUp) < 7 * 24 * 60 * 60 * 1000) { // Within 7 days
      activities.push({
        icon: '⭐',
        text: 'Level Up Achieved',
        time: this.formatTimeAgo(lastLevelUp)
      });
    }
    
    // Add recent kills
    const lastKill = (data as any)?.lastKillTime;
    if (lastKill && (now - lastKill) < 60 * 60 * 1000) { // Within 1 hour
      activities.push({
        icon: '🎯',
        text: 'Enemy Eliminated',
        time: this.formatTimeAgo(lastKill)
      });
    }
    
    // Add weapon mastery progress
    const recentWeaponProgress = (data as any)?.recentWeaponProgress || [];
    recentWeaponProgress.slice(0, 1).forEach((progress: any) => {
      activities.push({
        icon: '🔫',
        text: `${progress.weaponName} Mastery Progress`,
        time: this.formatTimeAgo(progress.timestamp)
      });
    });
    
    // Sort by time (most recent first) and limit to 4 items
    return activities
      .sort((a, b) => this.parseTimeAgo(b.time) - this.parseTimeAgo(a.time))
      .slice(0, 4);
  }

  private formatTimeAgo(timestamp: number): string {
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  }

  private parseTimeAgo(timeStr: string): number {
    if (timeStr === 'Just now') return 0;
    if (timeStr.includes('m ago')) return parseInt(timeStr) * 60 * 1000;
    if (timeStr.includes('h ago')) return parseInt(timeStr) * 60 * 60 * 1000;
    if (timeStr.includes('d ago')) return parseInt(timeStr) * 24 * 60 * 60 * 1000;
    return 0;
  }
}
