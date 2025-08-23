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
  awarded: boolean; // Critical: Flag to track if XP has been awarded
  rarity?: 'common' | 'rare' | 'epic' | 'legendary';
  secret?: boolean;
  repeatable?: boolean;
  maxCompletions?: number;
  completions?: number;
  lastNotificationTime?: number; // Track when last notification was sent
}

export interface AchievementData {
  achievements: Record<string, Achievement>;
  totalCompleted: number;
  totalXP: number;
  totalSecretFound: number;
  totalLegendary: number;
  lastAchievementCheck?: number;
  recentAchievements?: Array<{ title: string; unlockedAt: number }>;
}

/**
 * Optimized AchievementSystem with robust duplicate prevention
 * Key Features:
 * - Persistent awarded flags to prevent duplicate XP
 * - Streamlined achievement checking
 * - Comprehensive duplicate prevention
 * - Performance optimized
 */
export default class AchievementSystem {
  private static readonly ACHIEVEMENTS: Record<string, Omit<Achievement, 'completed' | 'progress' | 'completedAt' | 'completions' | 'lastNotificationTime' | 'awarded'>> = {
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

  // Global notification tracking to prevent duplicates
  private static readonly RECENT_NOTIFICATIONS = new Map<string, number>();
  private static readonly NOTIFICATION_COOLDOWN = 3000; // 3 seconds
  private static readonly ACHIEVEMENT_CHECK_COOLDOWN = 1000; // 1 second

  /**
   * Initialize achievements for a player with proper flags
   * Only initializes the achievement system, doesn't pre-populate all achievements
   */
  public static initialize(player: Player): void {
    try {
      const data = this.getPersistedData(player);
      
      // If achievements already exist, just ensure flags are correct
      if (data.achievements && Object.keys(data.achievements).length > 0) {
        this.ensureFlagsCorrect(player);
        return;
      }
      
      // Initialize with empty achievements - only add them when actually tracked
      const initialData: AchievementData = {
        achievements: {}, // Start with empty achievements
        totalCompleted: 0,
        totalXP: 0,
        totalSecretFound: 0,
        totalLegendary: 0,
        lastAchievementCheck: 0
      };
      
      this.setPersistedData(player, initialData);

    } catch (error) {
      // Initialize error
    }
  }

  /**
   * Get achievement data from persistence
   */
  public static get(player: Player): AchievementData {
    try {
      const data = this.getPersistedData(player);
      
      // Initialize if needed
      if (!data.achievements || Object.keys(data.achievements).length === 0) {
        this.initialize(player);
        return this.getPersistedData(player);
      }
      
      return data;
    } catch (error) {
      return this.getDefaultData();
    }
  }

  /**
   * Update achievement progress with robust duplicate prevention
   */
  public static updateProgress(player: Player, achievementId: string, progress: number): boolean {
    try {
      // Ensure initialized
      this.initialize(player);
      
      const data = this.get(player);
      let achievement = data.achievements[achievementId];
      
      // If achievement doesn't exist in player data, add it only when progress starts
      if (!achievement) {
        const achievementDef = this.ACHIEVEMENTS[achievementId];
        if (!achievementDef) {
    
          return false;
        }
        
        // Only add achievement if there's actual progress (not 0)
        if (progress > 0) {
    
          achievement = {
            ...achievementDef,
            completed: false,
            progress: 0,
            completions: 0,
            awarded: false,
            lastNotificationTime: 0
          } as Achievement;
          
          data.achievements[achievementId] = achievement;
        } else {
          // No progress yet, don't add to player data
          return false;
        }
      }

      // Early exit if already completed and not repeatable
      if (achievement.completed && !achievement.repeatable) {
        return false;
      }

      // Handle repeatable achievements
      if (achievement.repeatable && achievement.completed) {
        const maxCompletions = achievement.maxCompletions || 1;
        if (achievement.completions && achievement.completions >= maxCompletions) {
          return false;
        }
        // Reset awarded flag for next completion
        if (achievement.awarded) {
          achievement.awarded = false;
        }
      }

      // Early exit if already completed and awarded (non-repeatable)
      if (achievement.completed && achievement.awarded && !achievement.repeatable) {
        return false;
      }

      const newProgress = Math.min(progress, achievement.requirement);
      const wasCompleted = achievement.completed;
      
      // Update progress
      achievement.progress = newProgress;
      
      // Check if achievement should be completed
      if (newProgress >= achievement.requirement && !wasCompleted) {
        return this.completeAchievement(player, achievement, data);
      }
      
      // Save progress changes
      this.setPersistedData(player, data);
      return false;
    } catch (error) {
      return false;
    }
  }

  /**
   * Complete an achievement with proper flag management
   */
  private static completeAchievement(player: Player, achievement: Achievement, data: AchievementData): boolean {
    // Double-check completion status
    if (achievement.completed) {
      return false;
    }
    
    // Mark as completed
    achievement.completed = true;
    achievement.completedAt = Date.now();
    achievement.completions = (achievement.completions || 0) + 1;
    
    // Update totals
    data.totalCompleted++;
    data.totalXP += achievement.xpReward;
    if (achievement.secret) data.totalSecretFound++;
    if (achievement.rarity === 'legendary') data.totalLegendary++;
    
    // Award XP only if not already awarded
    if (!achievement.awarded) {
      
      this._awardXP(player, achievement.xpReward);
      achievement.awarded = true; // Critical: Mark as awarded
    } else {
      
    }
    
    // Send notification
    this._notifyCompletion(player, achievement);
    
    // Persist immediately
    this.setPersistedData(player, data);
    return true;
  }

  /**
   * Comprehensive achievement check with debouncing
   */
  public static checkAllAchievements(player: Player, stats: {
    kills?: number;
    deaths?: number;
    accuracy?: number;
    level?: number;
    currency?: number;
    extractions?: number;
    raids?: number;
    playtime?: number;
    headshots?: number;
    currentKillStreak?: number;
    weaponKills?: Record<string, number>;
    raidTime?: number;
    partyRaids?: number;
    revives?: number;
  }): void {
    try {
      // Debounce checks
      if (!this._shouldCheckAchievements(player)) {
        return;
      }
      
      // Combat achievements
      if (stats.kills !== undefined) {
        this.updateProgress(player, 'first_blood', stats.kills);
        this.updateProgress(player, 'combat_initiate', stats.kills);
        this.updateProgress(player, 'combat_veteran', stats.kills);
        this.updateProgress(player, 'combat_master', stats.kills);
        this.updateProgress(player, 'combat_legend', stats.kills);
      }
      
      if (stats.accuracy !== undefined) {
        this.updateProgress(player, 'sharpshooter', stats.accuracy);
        this.updateProgress(player, 'dead_eye', stats.accuracy);
      }
      
      // Extraction achievements
      if (stats.extractions !== undefined) {
        this.updateProgress(player, 'first_extraction', stats.extractions);
        this.updateProgress(player, 'survivor', stats.extractions);
        this.updateProgress(player, 'extraction_master', stats.extractions);
        this.updateProgress(player, 'extraction_legend', stats.extractions);
      }
      
      // Progression achievements
      if (stats.level !== undefined) {
        this.updateProgress(player, 'rising_star', stats.level);
        this.updateProgress(player, 'veteran', stats.level);
        this.updateProgress(player, 'legend', stats.level);
        this.updateProgress(player, 'mythic', stats.level);
      }
      
      if (stats.currency !== undefined) {
        this.updateProgress(player, 'wealth_builder', stats.currency);
        this.updateProgress(player, 'millionaire', stats.currency);
        this.updateProgress(player, 'billionaire', stats.currency);
      }
      
      // Exploration achievements
      if (stats.raids !== undefined) {
        this.updateProgress(player, 'first_mission', stats.raids);
        this.updateProgress(player, 'mission_veteran', stats.raids);
        this.updateProgress(player, 'mission_master', stats.raids);
        this.updateProgress(player, 'mission_legend', stats.raids);
      }
      
      // Weapon mastery
      if (stats.weaponKills) {
        const maxKills = Math.max(...Object.values(stats.weaponKills));
        this.updateProgress(player, 'weapon_master', maxKills);
        this.updateProgress(player, 'weapon_grandmaster', maxKills);
      }
      
      // Headshots
      if (stats.headshots !== undefined) {
        this.updateProgress(player, 'headshot_master', stats.headshots);
        this.updateProgress(player, 'precision_legend', stats.headshots);
      }
      
      // Kill streaks
      if (stats.currentKillStreak !== undefined) {
        this.updateProgress(player, 'kill_streak_5', stats.currentKillStreak);
        this.updateProgress(player, 'kill_frenzy', stats.currentKillStreak);
        this.updateProgress(player, 'kill_storm', stats.currentKillStreak);
      }
      
      // Speed run
      if (stats.raidTime !== undefined && stats.raidTime <= 180) {
        this.updateProgress(player, 'speed_runner', 1);
      }
      
      // Social
      if (stats.partyRaids !== undefined) {
        this.updateProgress(player, 'team_player', stats.partyRaids);
        this.updateProgress(player, 'party_leader', stats.partyRaids);
      }
    } catch (error) {
      // CheckAllAchievements error
    }
  }

  // Legacy method compatibility
  public static checkCombatAchievements(player: Player, kills: number, deaths: number, accuracy: number): void {
    this.checkAllAchievements(player, { kills, deaths, accuracy });
  }

  public static checkExtractionAchievements(player: Player, extractions: number): void {
    this.checkAllAchievements(player, { extractions });
  }

  public static checkProgressionAchievements(player: Player, level: number, currency: number): void {
    this.checkAllAchievements(player, { level, currency });
  }

  public static checkExplorationAchievements(player: Player, raids: number, playtime: number): void {
    this.checkAllAchievements(player, { raids, playtime });
  }

  public static checkWeaponMasteryAchievements(player: Player, weaponKills: Record<string, number>): void {
    this.checkAllAchievements(player, { weaponKills });
  }

  public static checkHeadshotAchievements(player: Player, headshotKills: number): void {
    this.checkAllAchievements(player, { headshots: headshotKills });
  }

  public static checkKillStreakAchievements(player: Player, currentStreak: number): void {
    this.checkAllAchievements(player, { currentKillStreak: currentStreak });
  }

  public static checkSpeedRunAchievements(player: Player, raidTime: number): void {
    this.checkAllAchievements(player, { raidTime });
  }

  public static checkSocialAchievements(player: Player, partyRaids: number, revives: number): void {
    this.checkAllAchievements(player, { partyRaids, revives });
  }

  public static checkSeasonalAchievements(player: Player): void {
    // Seasonal achievements removed for streamlined progression
  }

  /**
   * Check if achievement has been awarded
   */
  public static isAwarded(player: Player, achievementId: string): boolean {
    try {
      const data = this.get(player);
      const achievement = data.achievements[achievementId];
      return achievement?.awarded || false;
    } catch {
      return false;
    }
  }

  /**
   * Check if achievement was recently notified
   */
  public static hasBeenNotifiedRecently(player: Player, achievementId: string, completions?: number): boolean {
    try {
      const data = this.get(player);
      const achievement = data.achievements[achievementId];
      if (!achievement) return false;
      
      const now = Date.now();
      const lastNotification = achievement.lastNotificationTime || 0;
      const notificationKey = `${player.id}-${achievementId}-${completions || achievement.completions || 0}`;
      
      const globalLastNotification = this.RECENT_NOTIFICATIONS.get(notificationKey) || 0;
      
      return (now - lastNotification) < this.NOTIFICATION_COOLDOWN || 
             (now - globalLastNotification) < this.NOTIFICATION_COOLDOWN;
    } catch {
      return false;
    }
  }

  /**
   * Get achievement status
   */
  public static getAchievementStatus(player: Player, achievementId: string): {
    completed: boolean;
    awarded: boolean;
    progress: number;
    requirement: number;
    completions?: number;
  } | null {
    try {
      const data = this.get(player);
      const achievement = data.achievements[achievementId];
      
      if (!achievement) {
        return null;
      }
      
      return {
        completed: achievement.completed,
        awarded: achievement.awarded,
        progress: achievement.progress,
        requirement: achievement.requirement,
        completions: achievement.completions
      };
    } catch {
      return null;
    }
  }

  /**
   * Get achievement statistics
   */
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

  /**
   * Get all achievement definitions
   */
  public static getAllAchievements(): Record<string, Omit<Achievement, 'completed' | 'progress' | 'completedAt' | 'completions' | 'awarded' | 'lastNotificationTime'>> {
    return this.ACHIEVEMENTS;
  }

  /**
   * Get achievements by category
   */
  public static getAchievementsByCategory(category: string): Record<string, Omit<Achievement, 'completed' | 'progress' | 'completedAt' | 'completions' | 'awarded' | 'lastNotificationTime'>> {
    const filtered: Record<string, Omit<Achievement, 'completed' | 'progress' | 'completedAt' | 'completions' | 'awarded' | 'lastNotificationTime'>> = {};
    
    for (const [id, achievement] of Object.entries(this.ACHIEVEMENTS)) {
      if (achievement.category === category) {
        filtered[id] = achievement;
      }
    }
    
    return filtered;
  }

  /**
   * Get achievements by rarity
   */
  public static getAchievementsByRarity(rarity: string): Record<string, Omit<Achievement, 'completed' | 'progress' | 'completedAt' | 'completions' | 'awarded' | 'lastNotificationTime'>> {
    const filtered: Record<string, Omit<Achievement, 'completed' | 'progress' | 'completedAt' | 'completions' | 'awarded' | 'lastNotificationTime'>> = {};
    
    for (const [id, achievement] of Object.entries(this.ACHIEVEMENTS)) {
      if (achievement.rarity === rarity) {
        filtered[id] = achievement;
      }
    }
    
    return filtered;
  }

  /**
   * Get secret achievements
   */
  public static getSecretAchievements(): Record<string, Omit<Achievement, 'completed' | 'progress' | 'completedAt' | 'completions' | 'awarded' | 'lastNotificationTime'>> {
    const filtered: Record<string, Omit<Achievement, 'completed' | 'progress' | 'completedAt' | 'completions' | 'awarded' | 'lastNotificationTime'>> = {};
    
    for (const [id, achievement] of Object.entries(this.ACHIEVEMENTS)) {
      if (achievement.secret) {
        filtered[id] = achievement;
      }
    }
    
    return filtered;
  }

  /**
   * Get repeatable achievements
   */
  public static getRepeatableAchievements(): Record<string, Omit<Achievement, 'completed' | 'progress' | 'completedAt' | 'completions' | 'awarded' | 'lastNotificationTime'>> {
    const filtered: Record<string, Omit<Achievement, 'completed' | 'progress' | 'completedAt' | 'completions' | 'awarded' | 'lastNotificationTime'>> = {};
    
    for (const [id, achievement] of Object.entries(this.ACHIEVEMENTS)) {
      if (achievement.repeatable) {
        filtered[id] = achievement;
      }
    }
    
    return filtered;
  }

  /**
   * Fix awarded flags for legacy achievements
   */
  public static fixAwardedFlags(player: Player): void {
    try {
      const data = this.get(player);
      let needsUpdate = false;
      
      for (const achievement of Object.values(data.achievements)) {
        // If achievement is completed but not marked as awarded, mark it as awarded
        if (achievement.completed && !achievement.awarded) {
          achievement.awarded = true;
          needsUpdate = true;
        }
      }
      
      if (needsUpdate) {
        this.setPersistedData(player, data);
      }
    } catch (error) {
      // FixAwardedFlags error
    }
  }

  /**
   * Reset awarded flag for testing
   */
  public static resetAwardedFlag(player: Player, achievementId: string): void {
    try {
      const data = this.get(player);
      const achievement = data.achievements[achievementId];
      
      if (achievement) {
        achievement.awarded = false;
        this.setPersistedData(player, data);
      }
    } catch (error) {
      // ResetAwardedFlag error
    }
  }

  /**
   * Ensure all flags are correct
   */
  private static ensureFlagsCorrect(player: Player): void {
    try {
      const data = this.get(player);
      let needsUpdate = false;
      
      for (const achievement of Object.values(data.achievements)) {
        // Ensure completed achievements are marked as awarded
        if (achievement.completed && !achievement.awarded) {
          achievement.awarded = true;
          needsUpdate = true;
        }
        
        // Ensure awarded achievements are marked as completed
        if (achievement.awarded && !achievement.completed) {
          achievement.completed = true;
          achievement.completedAt = achievement.completedAt || Date.now();
          needsUpdate = true;
        }
      }
      
      if (needsUpdate) {
        this.setPersistedData(player, data);
      }
    } catch (error) {
      // EnsureFlagsCorrect error
    }
  }

  /**
   * Ensure all achievements are properly initialized and displayed
   * Only tracks achievements that are actually being progressed or completed
   */
  public static ensureAllAchievementsDisplayed(player: Player): void {
    try {
      const data = this.get(player);
      
      // Don't pre-populate all achievements - only track existing ones

      
      // Ensure all flags are correct for existing achievements
      this.ensureFlagsCorrect(player);
      
      // Recalculate totals based on existing achievements
      let totalCompleted = 0;
      let totalXP = 0;
      let totalSecretFound = 0;
      let totalLegendary = 0;
      
      for (const achievement of Object.values(data.achievements)) {
        if (achievement.completed) {
          totalCompleted++;
          totalXP += achievement.xpReward;
          if (achievement.secret) totalSecretFound++;
          if (achievement.rarity === 'legendary') totalLegendary++;
        }
      }
      
      // Update totals
      data.totalCompleted = totalCompleted;
      data.totalXP = totalXP;
      data.totalSecretFound = totalSecretFound;
      data.totalLegendary = totalLegendary;
      
      // Persist the corrected data
      this.setPersistedData(player, data);
      

    } catch (error) {
      // EnsureAllAchievementsDisplayed error
    }
  }

  /**
   * Get achievement data with guaranteed initialization
   */
  public static getWithInitialization(player: Player): AchievementData {
    try {
      // Ensure all achievements are properly initialized
      this.ensureAllAchievementsDisplayed(player);
      
      // Return the properly initialized data
      return this.get(player);
    } catch (error) {
      return this.getDefaultData();
    }
  }

  /**
   * Fix any corrupted or incomplete achievement data
   */
  public static fixAchievementData(player: Player): void {
    try {

      
      // Ensure all achievements are properly initialized
      this.ensureAllAchievementsDisplayed(player);
      
      // Fix any awarded flags that might be incorrect
      this.fixAwardedFlags(player);
      
      // Ensure all flags are correct
      this.ensureFlagsCorrect(player);
      

    } catch (error) {
      // FixAchievementData error
    }
  }

  /**
   * Check if achievements should be checked (debouncing)
   */
  private static _shouldCheckAchievements(player: Player): boolean {
    try {
      const data = this.get(player);
      const now = Date.now();
      const lastCheck = data.lastAchievementCheck || 0;
      
      if (now - lastCheck < this.ACHIEVEMENT_CHECK_COOLDOWN) {
        return false;
      }
      
      // Update last check time
      data.lastAchievementCheck = now;
      this.setPersistedData(player, data);
      return true;
    } catch {
      return true; // If there's an error, allow the check
    }
  }

  /**
   * Award XP to player
   */
  private static _awardXP(player: Player, amount: number): void {
    try {
      const ProgressionSystem = require('./ProgressionSystem').default;
      ProgressionSystem.addXP(player, amount, false);
    } catch (error) {
      // AwardXP error
    }
  }

  /**
   * Send achievement completion notification
   */
  private static _notifyCompletion(player: Player, achievement: Achievement): void {
    try {
      const now = Date.now();
      const notificationKey = `${player.id}-${achievement.id}-${achievement.completions || 0}`;
      
      // Check for recent notifications
      const lastNotification = this.RECENT_NOTIFICATIONS.get(notificationKey);
      if (lastNotification && (now - lastNotification) < this.NOTIFICATION_COOLDOWN) {

        return;
      }
      
      // Check achievement's last notification time
      if (achievement.lastNotificationTime && (now - achievement.lastNotificationTime) < this.NOTIFICATION_COOLDOWN) {

        return;
      }
      
      // Track this notification
      this.RECENT_NOTIFICATIONS.set(notificationKey, now);
      achievement.lastNotificationTime = now;
      
      // Track recent achievement for activity feed
      const data = this.getPersistedData(player);
      const recentAchievements = data.recentAchievements || [];
      
      recentAchievements.unshift({
        title: achievement.title,
        unlockedAt: now
      });
      
      // Keep only last 10 achievements
      if (recentAchievements.length > 10) {
        recentAchievements.splice(10);
      }
      
      // Update persistence
      this.setPersistedData(player, {
        ...data,
        recentAchievements
      });
      
      // Send UI notification

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
      
      // Clean up old notification tracking (older than 1 hour)
      const oneHourAgo = now - (60 * 60 * 1000);
      for (const [key, timestamp] of this.RECENT_NOTIFICATIONS.entries()) {
        if (timestamp < oneHourAgo) {
          this.RECENT_NOTIFICATIONS.delete(key);
        }
      }
    } catch (error) {
      // NotifyCompletion error
    }
  }

  /**
   * Get persisted data from player
   */
  private static getPersistedData(player: Player): AchievementData {
    try {
      const data = (player.getPersistedData?.() as any) || {};
      return (data as any)?.achievements || this.getDefaultData();
    } catch {
      return this.getDefaultData();
    }
  }

  /**
   * Set persisted data to player
   */
  private static setPersistedData(player: Player, achievementData: AchievementData): void {
    try {
      const existingData = (player.getPersistedData?.() as any) || {};
      player.setPersistedData({ 
        ...existingData,
        achievements: achievementData 
      });
    } catch (error) {
      // SetPersistedData error
    }
  }

  /**
   * Get default achievement data
   */
  private static getDefaultData(): AchievementData {
    return {
      achievements: {},
      totalCompleted: 0,
      totalXP: 0,
      totalSecretFound: 0,
      totalLegendary: 0,
      lastAchievementCheck: 0,
      recentAchievements: []
    };
  }
}
