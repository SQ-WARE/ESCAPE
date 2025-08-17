import type { Player } from 'hytopia';

export interface PlayerStatsData {
  kills: number;
  deaths: number;
  headshots: number;
  currentKillStreak: number;
  bestKillStreak: number;
  weaponKills: Record<string, number>;
}

export default class PlayerStatsSystem {
  private static _key = 'stats';

  public static get(player: Player): PlayerStatsData {
    try {
      const data = (player.getPersistedData?.() as any) || {};
      const stats = (data as any)?.[this._key] || {};
      return {
        kills: Math.max(0, Math.floor(stats.kills ?? 0)),
        deaths: Math.max(0, Math.floor(stats.deaths ?? 0)),
        headshots: Math.max(0, Math.floor(stats.headshots ?? 0)),
        currentKillStreak: Math.max(0, Math.floor(stats.currentKillStreak ?? 0)),
        bestKillStreak: Math.max(0, Math.floor(stats.bestKillStreak ?? 0)),
        weaponKills: stats.weaponKills || {},
      };
    } catch {
      return { kills: 0, deaths: 0, headshots: 0, currentKillStreak: 0, bestKillStreak: 0, weaponKills: {} };
    }
  }

  public static set(player: Player, stats: PlayerStatsData): void {
    try {
      player.setPersistedData({ 
        [this._key]: { 
          kills: Math.max(0, stats.kills), 
          deaths: Math.max(0, stats.deaths),
          headshots: Math.max(0, stats.headshots),
          currentKillStreak: Math.max(0, stats.currentKillStreak),
          bestKillStreak: Math.max(0, stats.bestKillStreak),
          weaponKills: stats.weaponKills || {}
        } 
      });
    } catch {}
  }

  public static addKill(player: Player, weaponCategory?: string, isHeadshot: boolean = false): void {
    const s = this.get(player);
    s.kills += 1;
    
    // Update kill streak
    s.currentKillStreak += 1;
    if (s.currentKillStreak > s.bestKillStreak) {
      s.bestKillStreak = s.currentKillStreak;
    }
    
    this.set(player, s);
    
    // Track weapon kill if category provided
    if (weaponCategory) {
      this.addWeaponKill(player, weaponCategory);
    }
    
    // Track headshot if applicable
    if (isHeadshot) {
      this.addHeadshot(player);
    }
    
    // Check kill streak achievements
    this.updateKillStreak(player, s.currentKillStreak);
    
    // Track kill timestamp and update session count
    try {
      const data = (player.getPersistedData?.() as any) || {};
      const currentSessions = Math.floor((data as any)?.totalSessions ?? 0);
      player.setPersistedData({
        ...data,
        lastKillTime: Date.now(),
        totalSessions: currentSessions + 1
      });
    } catch {}
    
    // Check combat achievements
    try {
      const AchievementSystem = require('./AchievementSystem').default;
      const data = (player.getPersistedData?.() as any) || {};
      const accuracy = Math.floor((data as any)?.accuracy ?? 0);
      AchievementSystem.checkCombatAchievements(player, s.kills, s.deaths, accuracy);
    } catch {}
  }

  public static addDeath(player: Player): void {
    const s = this.get(player);
    s.deaths += 1;
    // Reset kill streak on death
    s.currentKillStreak = 0;
    this.set(player, s);
  }

  public static addHeadshot(player: Player): void {
    const s = this.get(player);
    s.headshots += 1;
    this.set(player, s);
    
    // Check headshot achievements
    try {
      const AchievementSystem = require('./AchievementSystem').default;
      AchievementSystem.checkHeadshotAchievements(player, s.headshots);
    } catch {}
  }

  public static addWeaponKill(player: Player, weaponCategory: string): void {
    const s = this.get(player);
    if (!s.weaponKills[weaponCategory]) {
      s.weaponKills[weaponCategory] = 0;
    }
    s.weaponKills[weaponCategory] += 1;
    this.set(player, s);
    
    // Check weapon mastery achievements
    try {
      const AchievementSystem = require('./AchievementSystem').default;
      AchievementSystem.checkWeaponMasteryAchievements(player, s.weaponKills);
    } catch {}
  }

  public static updateKillStreak(player: Player, newStreak: number): void {
    const s = this.get(player);
    s.currentKillStreak = newStreak;
    if (newStreak > s.bestKillStreak) {
      s.bestKillStreak = newStreak;
    }
    this.set(player, s);
    
    // Check kill streak achievements
    try {
      const AchievementSystem = require('./AchievementSystem').default;
      AchievementSystem.checkKillStreakAchievements(player, newStreak);
    } catch {}
  }

  public static resetKillStreak(player: Player): void {
    const s = this.get(player);
    s.currentKillStreak = 0;
    this.set(player, s);
  }
}


