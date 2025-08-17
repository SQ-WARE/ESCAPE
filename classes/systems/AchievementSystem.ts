import type { Player } from 'hytopia';

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  category: 'combat' | 'progression' | 'exploration' | 'collection' | 'social' | 'mastery' | 'challenge' | 'seasonal';
  requirement: number;
  xpReward: number;
  completed: boolean;
  progress: number;
  completedAt?: number;
  rarity?: 'common' | 'rare' | 'epic' | 'legendary';
  secret?: boolean;
  repeatable?: boolean;
  maxCompletions?: number;
  completions?: number;
}

export interface AchievementData {
  achievements: Record<string, Achievement>;
  totalCompleted: number;
  totalXP: number;
  totalSecretFound: number;
  totalLegendary: number;
}

/**
 * AchievementSystem manages player achievements, progress tracking, and rewards.
 * Stored under `achievements: { achievements, totalCompleted, totalXP, totalSecretFound, totalLegendary }` in persisted data.
 */
export default class AchievementSystem {
  private static readonly ACHIEVEMENTS: Record<string, Omit<Achievement, 'completed' | 'progress' | 'completedAt' | 'completions'>> = {
    // === CORE PROGRESSION ACHIEVEMENTS ===
    'first_blood': {
      id: 'first_blood',
      title: 'First Blood',
      description: 'Get your first kill',
      icon: '🎯',
      category: 'combat',
      requirement: 1,
      xpReward: 150,
      rarity: 'common'
    },
    'combat_initiate': {
      id: 'combat_initiate',
      title: 'Combat Initiate',
      description: 'Reach 50 total kills',
      icon: '⚔️',
      category: 'combat',
      requirement: 50,
      xpReward: 300,
      rarity: 'common'
    },
    'combat_veteran': {
      id: 'combat_veteran',
      title: 'Combat Veteran',
      description: 'Reach 500 total kills',
      icon: '🗡️',
      category: 'combat',
      requirement: 500,
      xpReward: 1000,
      rarity: 'rare'
    },
    'combat_master': {
      id: 'combat_master',
      title: 'Combat Master',
      description: 'Reach 2500 total kills',
      icon: '⚔️',
      category: 'combat',
      requirement: 2500,
      xpReward: 2500,
      rarity: 'epic'
    },
    'combat_legend': {
      id: 'combat_legend',
      title: 'Combat Legend',
      description: 'Reach 10000 total kills',
      icon: '👑',
      category: 'combat',
      requirement: 10000,
      xpReward: 7500,
      rarity: 'legendary'
    },

    // === SURVIVAL ACHIEVEMENTS ===
    'first_extraction': {
      id: 'first_extraction',
      title: 'First Extraction',
      description: 'Complete your first extraction',
      icon: '✅',
      category: 'combat',
      requirement: 1,
      xpReward: 200,
      rarity: 'common'
    },
    'survivor': {
      id: 'survivor',
      title: 'Survivor',
      description: 'Complete 50 extractions',
      icon: '🛡️',
      category: 'combat',
      requirement: 50,
      xpReward: 750,
      rarity: 'rare'
    },
    'extraction_master': {
      id: 'extraction_master',
      title: 'Extraction Master',
      description: 'Complete 250 extractions',
      icon: '🚁',
      category: 'combat',
      requirement: 250,
      xpReward: 2000,
      rarity: 'epic'
    },
    'extraction_legend': {
      id: 'extraction_legend',
      title: 'Extraction Legend',
      description: 'Complete 1000 extractions',
      icon: '🚁',
      category: 'combat',
      requirement: 1000,
      xpReward: 5000,
      rarity: 'legendary'
    },

    // === SKILL ACHIEVEMENTS ===
    'sharpshooter': {
      id: 'sharpshooter',
      title: 'Sharpshooter',
      description: 'Achieve 60%+ accuracy',
      icon: '🎯',
      category: 'combat',
      requirement: 60,
      xpReward: 1000,
      rarity: 'rare'
    },
    'dead_eye': {
      id: 'dead_eye',
      title: 'Dead Eye',
      description: 'Achieve 80%+ accuracy',
      icon: '🎯',
      category: 'combat',
      requirement: 80,
      xpReward: 2500,
      rarity: 'legendary'
    },
    'headshot_master': {
      id: 'headshot_master',
      title: 'Headshot Master',
      description: 'Get 500 headshot kills',
      icon: '🎯',
      category: 'combat',
      requirement: 500,
      xpReward: 2000,
      rarity: 'epic'
    },
    'precision_legend': {
      id: 'precision_legend',
      title: 'Precision Legend',
      description: 'Get 2000 headshot kills',
      icon: '🎯',
      category: 'combat',
      requirement: 2000,
      xpReward: 6000,
      rarity: 'legendary'
    },

    // === PERFORMANCE ACHIEVEMENTS ===
    'kill_streak_5': {
      id: 'kill_streak_5',
      title: 'Kill Streak',
      description: 'Get 5 kills in a single raid',
      icon: '🔥',
      category: 'combat',
      requirement: 5,
      xpReward: 400,
      rarity: 'rare',
      repeatable: true,
      maxCompletions: 5
    },
    'kill_frenzy': {
      id: 'kill_frenzy',
      title: 'Kill Frenzy',
      description: 'Get 10 kills in a single raid',
      icon: '🔥',
      category: 'combat',
      requirement: 10,
      xpReward: 800,
      rarity: 'epic',
      repeatable: true,
      maxCompletions: 3
    },
    'kill_storm': {
      id: 'kill_storm',
      title: 'Kill Storm',
      description: 'Get 15 kills in a single raid',
      icon: '🔥',
      category: 'combat',
      requirement: 15,
      xpReward: 2000,
      rarity: 'legendary',
      repeatable: true,
      maxCompletions: 2
    },

    // === LEVEL PROGRESSION ===
    'rising_star': {
      id: 'rising_star',
      title: 'Rising Star',
      description: 'Reach level 15',
      icon: '⭐',
      category: 'progression',
      requirement: 15,
      xpReward: 300,
      rarity: 'common'
    },
    'veteran': {
      id: 'veteran',
      title: 'Veteran',
      description: 'Reach level 35',
      icon: '🌟',
      category: 'progression',
      requirement: 35,
      xpReward: 750,
      rarity: 'rare'
    },
    'legend': {
      id: 'legend',
      title: 'Legend',
      description: 'Reach level 75',
      icon: '💫',
      category: 'progression',
      requirement: 75,
      xpReward: 2000,
      rarity: 'epic'
    },
    'mythic': {
      id: 'mythic',
      title: 'Mythic',
      description: 'Reach level 150',
      icon: '✨',
      category: 'progression',
      requirement: 150,
      xpReward: 6000,
      rarity: 'legendary'
    },

    // === WEALTH ACHIEVEMENTS ===
    'wealth_builder': {
      id: 'wealth_builder',
      title: 'Wealth Builder',
      description: 'Earn 50,000 credits',
      icon: '💰',
      category: 'progression',
      requirement: 50000,
      xpReward: 500,
      rarity: 'rare'
    },
    'millionaire': {
      id: 'millionaire',
      title: 'Millionaire',
      description: 'Earn 1,000,000 credits',
      icon: '💎',
      category: 'progression',
      requirement: 1000000,
      xpReward: 2500,
      rarity: 'epic'
    },
    'billionaire': {
      id: 'billionaire',
      title: 'Billionaire',
      description: 'Earn 1,000,000,000 credits',
      icon: '💎',
      category: 'progression',
      requirement: 1000000000,
      xpReward: 10000,
      rarity: 'legendary'
    },

    // === EXPLORATION ACHIEVEMENTS ===
    'first_mission': {
      id: 'first_mission',
      title: 'First Mission',
      description: 'Complete your first raid',
      icon: '🎖️',
      category: 'exploration',
      requirement: 1,
      xpReward: 100,
      rarity: 'common'
    },
    'mission_veteran': {
      id: 'mission_veteran',
      title: 'Mission Veteran',
      description: 'Complete 100 raids',
      icon: '🎯',
      category: 'exploration',
      requirement: 100,
      xpReward: 750,
      rarity: 'rare'
    },
    'mission_master': {
      id: 'mission_master',
      title: 'Mission Master',
      description: 'Complete 500 raids',
      icon: '🏅',
      category: 'exploration',
      requirement: 500,
      xpReward: 2000,
      rarity: 'epic'
    },
    'mission_legend': {
      id: 'mission_legend',
      title: 'Mission Legend',
      description: 'Complete 2000 raids',
      icon: '🏅',
      category: 'exploration',
      requirement: 2000,
      xpReward: 7500,
      rarity: 'legendary'
    },

    // === WEAPON MASTERY ===
    'weapon_master': {
      id: 'weapon_master',
      title: 'Weapon Master',
      description: 'Get 1000 kills with any weapon category',
      icon: '🔫',
      category: 'mastery',
      requirement: 1000,
      xpReward: 1500,
      rarity: 'epic'
    },
    'weapon_grandmaster': {
      id: 'weapon_grandmaster',
      title: 'Weapon Grandmaster',
      description: 'Get 5000 kills with any weapon category',
      icon: '🏆',
      category: 'mastery',
      requirement: 5000,
      xpReward: 5000,
      rarity: 'legendary'
    },

    // === CHALLENGE ACHIEVEMENTS ===
    'speed_runner': {
      id: 'speed_runner',
      title: 'Speed Runner',
      description: 'Complete a raid in under 3 minutes',
      icon: '⚡',
      category: 'challenge',
      requirement: 1,
      xpReward: 1000,
      rarity: 'epic',
      repeatable: true,
      maxCompletions: 3
    },
    'untouchable': {
      id: 'untouchable',
      title: 'Untouchable',
      description: 'Complete a raid without taking damage',
      icon: '🛡️',
      category: 'challenge',
      requirement: 1,
      xpReward: 2000,
      rarity: 'legendary',
      repeatable: true,
      maxCompletions: 2
    },
    'solo_warrior': {
      id: 'solo_warrior',
      title: 'Solo Warrior',
      description: 'Extract alone from a full raid',
      icon: '🚁',
      category: 'challenge',
      requirement: 1,
      xpReward: 1500,
      rarity: 'epic',
      repeatable: true,
      maxCompletions: 3
    },

    // === SOCIAL ACHIEVEMENTS ===
    'team_player': {
      id: 'team_player',
      title: 'Team Player',
      description: 'Complete 25 raids with a party',
      icon: '👥',
      category: 'social',
      requirement: 25,
      xpReward: 500,
      rarity: 'rare'
    },
    'party_leader': {
      id: 'party_leader',
      title: 'Party Leader',
      description: 'Lead 50 successful raids',
      icon: '👑',
      category: 'social',
      requirement: 50,
      xpReward: 2000,
      rarity: 'epic'
    },

    // === SECRET ACHIEVEMENTS ===
    'secret_finder': {
      id: 'secret_finder',
      title: 'Secret Finder',
      description: 'Discover a hidden achievement',
      icon: '🔍',
      category: 'challenge',
      requirement: 1,
      xpReward: 750,
      rarity: 'rare',
      secret: true
    },
    'hidden_master': {
      id: 'hidden_master',
      title: 'Hidden Master',
      description: 'Find all secret achievements',
      icon: '🔍',
      category: 'challenge',
      requirement: 3,
      xpReward: 3000,
      rarity: 'legendary',
      secret: true
    }
  };

  public static get(player: Player): AchievementData {
    try {
      const data = (player.getPersistedData?.() as any) || {};
      const achievementData = (data as any)?.achievements || {};
      
      // Initialize achievements if they don't exist
      const achievements: Record<string, Achievement> = {};
      let totalCompleted = 0;
      let totalXP = 0;
      let totalSecretFound = 0;
      let totalLegendary = 0;

      for (const [id, achievement] of Object.entries(this.ACHIEVEMENTS)) {
        const saved = achievementData[id] || {};
        const completed = saved.completed || false;
        const progress = saved.progress || 0;
        const completedAt = saved.completedAt;
        const completions = saved.completions || 0;

        achievements[id] = {
          ...achievement,
          completed,
          progress,
          completedAt,
          completions
        };

        if (completed) {
          totalCompleted++;
          totalXP += achievement.xpReward;
          if (achievement.secret) totalSecretFound++;
          if (achievement.rarity === 'legendary') totalLegendary++;
        }
      }

      return { achievements, totalCompleted, totalXP, totalSecretFound, totalLegendary };
    } catch {
      return { achievements: {}, totalCompleted: 0, totalXP: 0, totalSecretFound: 0, totalLegendary: 0 };
    }
  }

  public static set(player: Player, achievementData: AchievementData): void {
    try {
      player.setPersistedData({ achievements: achievementData });
    } catch {}
  }

  public static updateProgress(player: Player, achievementId: string, progress: number): boolean {
    try {
      const data = this.get(player);
      const achievement = data.achievements[achievementId];
      
      if (!achievement) {
        return false;
      }

      // Handle repeatable achievements
      if (achievement.repeatable && achievement.completed) {
        const maxCompletions = achievement.maxCompletions || 1;
        if (achievement.completions && achievement.completions >= maxCompletions) {
          return false;
        }
      } else if (achievement.completed) {
        return false;
      }

      const newProgress = Math.min(progress, achievement.requirement);
      const wasCompleted = achievement.completed;
      
      achievement.progress = newProgress;
      
      if (newProgress >= achievement.requirement && !wasCompleted) {
        achievement.completed = true;
        achievement.completedAt = Date.now();
        achievement.completions = (achievement.completions || 0) + 1;
        
        data.totalCompleted++;
        data.totalXP += achievement.xpReward;
        if (achievement.secret) data.totalSecretFound++;
        if (achievement.rarity === 'legendary') data.totalLegendary++;
        
        // Award XP to player
        this._awardXP(player, achievement.xpReward);
        
        // Notify player
        this._notifyCompletion(player, achievement);
        
        this.set(player, data);
        return true;
      } else {
        this.set(player, data);
        return false;
      }
    } catch {
      return false;
    }
  }

  public static checkCombatAchievements(player: Player, kills: number, deaths: number, accuracy: number): void {
    this.updateProgress(player, 'first_blood', kills);
    this.updateProgress(player, 'combat_initiate', kills);
    this.updateProgress(player, 'combat_veteran', kills);
    this.updateProgress(player, 'combat_master', kills);
    this.updateProgress(player, 'combat_legend', kills);
    this.updateProgress(player, 'sharpshooter', accuracy);
    this.updateProgress(player, 'dead_eye', accuracy);
  }

  public static checkExtractionAchievements(player: Player, extractions: number): void {
    this.updateProgress(player, 'first_extraction', extractions);
    this.updateProgress(player, 'survivor', extractions);
    this.updateProgress(player, 'extraction_master', extractions);
    this.updateProgress(player, 'extraction_legend', extractions);
  }

  public static checkProgressionAchievements(player: Player, level: number, currency: number): void {
    this.updateProgress(player, 'rising_star', level);
    this.updateProgress(player, 'veteran', level);
    this.updateProgress(player, 'legend', level);
    this.updateProgress(player, 'mythic', level);
    this.updateProgress(player, 'wealth_builder', currency);
    this.updateProgress(player, 'millionaire', currency);
    this.updateProgress(player, 'billionaire', currency);
  }

  public static checkExplorationAchievements(player: Player, raids: number, playtime: number): void {
    this.updateProgress(player, 'first_mission', raids);
    this.updateProgress(player, 'mission_veteran', raids);
    this.updateProgress(player, 'mission_master', raids);
    this.updateProgress(player, 'mission_legend', raids);
  }

  public static checkAccuracyAchievements(player: Player, accuracy: number): void {
    // Accuracy achievements are now handled in checkCombatAchievements
  }

  public static checkWeaponMasteryAchievements(player: Player, weaponKills: Record<string, number>): void {
    // Check for highest weapon category kills
    const maxKills = Math.max(...Object.values(weaponKills));
    this.updateProgress(player, 'weapon_master', maxKills);
    this.updateProgress(player, 'weapon_grandmaster', maxKills);
  }

  public static checkHeadshotAchievements(player: Player, headshotKills: number): void {
    this.updateProgress(player, 'headshot_master', headshotKills);
    this.updateProgress(player, 'precision_legend', headshotKills);
  }

  public static checkKillStreakAchievements(player: Player, currentStreak: number): void {
    this.updateProgress(player, 'kill_streak_5', currentStreak);
    this.updateProgress(player, 'kill_frenzy', currentStreak);
    this.updateProgress(player, 'kill_storm', currentStreak);
  }

  public static checkSpeedRunAchievements(player: Player, raidTime: number): void {
    if (raidTime <= 180) { // 3 minutes
      this.updateProgress(player, 'speed_runner', 1);
    }
  }

  public static checkSocialAchievements(player: Player, partyRaids: number, revives: number): void {
    this.updateProgress(player, 'team_player', partyRaids);
    this.updateProgress(player, 'party_leader', partyRaids);
  }

  public static checkSeasonalAchievements(player: Player): void {
    // Seasonal achievements removed for streamlined progression
  }

  public static getAllAchievements(): Record<string, Omit<Achievement, 'completed' | 'progress' | 'completedAt' | 'completions'>> {
    return this.ACHIEVEMENTS;
  }

  public static getAchievementsByCategory(category: string): Record<string, Omit<Achievement, 'completed' | 'progress' | 'completedAt' | 'completions'>> {
    const filtered: Record<string, Omit<Achievement, 'completed' | 'progress' | 'completedAt' | 'completions'>> = {};
    
    for (const [id, achievement] of Object.entries(this.ACHIEVEMENTS)) {
      if (achievement.category === category) {
        filtered[id] = achievement;
      }
    }
    
    return filtered;
  }

  public static getAchievementsByRarity(rarity: string): Record<string, Omit<Achievement, 'completed' | 'progress' | 'completedAt' | 'completions'>> {
    const filtered: Record<string, Omit<Achievement, 'completed' | 'progress' | 'completedAt' | 'completions'>> = {};
    
    for (const [id, achievement] of Object.entries(this.ACHIEVEMENTS)) {
      if (achievement.rarity === rarity) {
        filtered[id] = achievement;
      }
    }
    
    return filtered;
  }

  public static getSecretAchievements(): Record<string, Omit<Achievement, 'completed' | 'progress' | 'completedAt' | 'completions'>> {
    const filtered: Record<string, Omit<Achievement, 'completed' | 'progress' | 'completedAt' | 'completions'>> = {};
    
    for (const [id, achievement] of Object.entries(this.ACHIEVEMENTS)) {
      if (achievement.secret) {
        filtered[id] = achievement;
      }
    }
    
    return filtered;
  }

  public static getRepeatableAchievements(): Record<string, Omit<Achievement, 'completed' | 'progress' | 'completedAt' | 'completions'>> {
    const filtered: Record<string, Omit<Achievement, 'completed' | 'progress' | 'completedAt' | 'completions'>> = {};
    
    for (const [id, achievement] of Object.entries(this.ACHIEVEMENTS)) {
      if (achievement.repeatable) {
        filtered[id] = achievement;
      }
    }
    
    return filtered;
  }

  public static getAchievementStats(player: Player): {
    total: number;
    completed: number;
    completionRate: number;
    totalXP: number;
    secretFound: number;
    legendary: number;
    byCategory: Record<string, { total: number; completed: number; }>;
    byRarity: Record<string, { total: number; completed: number; }>;
  } {
    const data = this.get(player);
    const allAchievements = this.getAllAchievements();
    
    const stats = {
      total: Object.keys(allAchievements).length,
      completed: data.totalCompleted,
      completionRate: Math.round((data.totalCompleted / Object.keys(allAchievements).length) * 100),
      totalXP: data.totalXP,
      secretFound: data.totalSecretFound,
      legendary: data.totalLegendary,
      byCategory: {} as Record<string, { total: number; completed: number; }>,
      byRarity: {} as Record<string, { total: number; completed: number; }>
    };

         // Calculate by category
     for (const achievement of Object.values(allAchievements)) {
       if (!stats.byCategory[achievement.category]) {
         stats.byCategory[achievement.category] = { total: 0, completed: 0 };
       }
       stats.byCategory[achievement.category]!.total++;
       
       if (data.achievements[achievement.id]?.completed) {
         stats.byCategory[achievement.category]!.completed++;
       }
     }

     // Calculate by rarity
     for (const achievement of Object.values(allAchievements)) {
       if (achievement.rarity) {
         if (!stats.byRarity[achievement.rarity]) {
           stats.byRarity[achievement.rarity] = { total: 0, completed: 0 };
         }
         stats.byRarity[achievement.rarity]!.total++;
         
         if (data.achievements[achievement.id]?.completed) {
           stats.byRarity[achievement.rarity]!.completed++;
         }
       }
     }

    return stats;
  }

  private static _awardXP(player: Player, amount: number): void {
    try {
      // Import here to avoid circular dependency
      const ProgressionSystem = require('./ProgressionSystem').default;
      ProgressionSystem.addXP(player, amount, false);
    } catch {}
  }

  private static _notifyCompletion(player: Player, achievement: Achievement): void {
    try {
      // Track recent achievement for activity feed
      const data = (player.getPersistedData?.() as any) || {};
      const recentAchievements = (data as any)?.recentAchievements || [];
      
      recentAchievements.unshift({
        title: achievement.title,
        unlockedAt: Date.now()
      });
      
      // Keep only last 10 achievements
      if (recentAchievements.length > 10) {
        recentAchievements.splice(10);
      }
      
      player.setPersistedData({
        ...data,
        recentAchievements
      });
      
      player.ui?.sendData({
        type: 'achievement-unlocked',
        title: achievement.title,
        description: achievement.description,
        icon: achievement.icon,
        xpReward: achievement.xpReward,
        rarity: achievement.rarity,
        secret: achievement.secret,
        repeatable: achievement.repeatable,
        completions: achievement.completions
      });
    } catch {}
  }
}
