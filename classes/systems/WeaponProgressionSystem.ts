import type { Player } from 'hytopia';
import { WeaponFactory } from '../weapons/WeaponFactory';
import ProgressionSystem from './ProgressionSystem';

export interface WeaponProgressRecord {
  kills: number;
}

export interface WeaponProgressionData {
  [weaponId: string]: WeaponProgressRecord;
}

interface MenuWeaponRow {
  weaponId: string;
  name: string;
  iconImageUri: string;
  kills: number;
  nextKills: number; // next milestone threshold
  nextXP: number; // xp reward at next milestone
  category: string; // weapon category (e.g., pistol, rifle)
}

export default class WeaponProgressionSystem {
  private static _key = 'weaponProgression';
  private static _milestones = [5, 15, 30, 50, 75, 100, 150, 200, 300];
  private static _baseXP = 50; // base XP per milestone tier

  public static incrementKill(player: Player, weaponId: string): void {
    const data = this._get(player);
    const rec = data[weaponId] || { kills: 0 };
    rec.kills += 1;
    data[weaponId] = rec;
    this._set(player, data);

    // Track weapon progress for activity feed
    try {
      const persistedData = (player.getPersistedData?.() as any) || {};
      const recentProgress = (persistedData as any)?.recentWeaponProgress || [];
      const weaponName = WeaponFactory.getWeaponData(weaponId)?.name || weaponId;
      
      recentProgress.unshift({
        weaponName,
        timestamp: Date.now()
      });
      
      // Keep only last 5 entries
      if (recentProgress.length > 5) {
        recentProgress.splice(5);
      }
      
      player.setPersistedData({
        ...persistedData,
        recentWeaponProgress: recentProgress
      });
    } catch {}

    // Reward XP on reaching any milestone
    const tierIndex = this._milestones.findIndex(m => m === rec.kills);
    if (tierIndex >= 0) {
      const baseXP = this._xpForTier(tierIndex);
      const mult = this._rarityMultiplier(weaponId);
      const xp = Math.floor(baseXP * mult);
      try {
        ProgressionSystem.addXP(player, xp);
        const name = WeaponFactory.getWeaponData(weaponId)?.name || weaponId;
        player.ui?.sendData({ type: 'notification', message: `+${xp} XP • ${name} milestone`, color: '00FF00' });
      } catch {}
    }
  }

  public static buildMenuRows(player: Player): MenuWeaponRow[] {
    const data = this._get(player);
    const defs = WeaponFactory.getAllWeaponDefinitions();
    const rows: MenuWeaponRow[] = [];
    for (const def of defs) {
      const rec = data[def.id] || { kills: 0 };
      const nextKills = this._nextMilestone(rec.kills);
      const nextXP = Math.floor(this._xpForTier(this._tierIndex(nextKills)) * this._rarityMultiplier(def.id));
      rows.push({
        weaponId: def.id,
        name: def.name,
        iconImageUri: def.assets.ui.icon,
        kills: rec.kills,
        nextKills,
        nextXP,
        category: String((def as any)?.category || ''),
      });
    }
    // Sort by kills desc then name
    rows.sort((a, b) => (b.kills - a.kills) || a.name.localeCompare(b.name));
    return rows;
  }

  private static _tierIndex(milestone: number): number {
    const idx = this._milestones.findIndex(m => m === milestone);
    return idx >= 0 ? idx : this._milestones.length - 1;
  }

  private static _nextMilestone(kills: number): number {
    for (const m of this._milestones) {
      if (kills < m) return m;
    }
    // After last, continue stepping by last gap
    const last = this._milestones[this._milestones.length - 1] ?? 100;
    const prev = this._milestones[this._milestones.length - 2] ?? (last - 50);
    const step = Math.max(25, (last - prev));
    const over = kills - last;
    const steps = Math.floor(over / step) + 1;
    return last + steps * step;
  }

  private static _xpForTier(tierIndex: number): number {
    return this._baseXP * (tierIndex + 1);
  }

  private static _rarityMultiplier(weaponId: string): number {
    const def = WeaponFactory.getWeaponData(weaponId);
    const rarity = def?.rarity || 'common';
    
    // Use standardized rarity-based multipliers
    const rarityMultipliers: Record<string, number> = {
      'common': 1.0,
      'unusual': 1.25,
      'rare': 1.6,
      'epic': 2.2,
      'legendary': 3.0,
      'utopian': 4.0, // In case weapons ever use utopian rarity
    };
    
    return rarityMultipliers[rarity] || 1.0;
  }

  private static _get(player: Player): WeaponProgressionData {
    try {
      const persisted = (player.getPersistedData?.() as any) || {};
      return (persisted[this._key] as WeaponProgressionData) || {};
    } catch {
      return {} as WeaponProgressionData;
    }
  }

  private static _set(player: Player, data: WeaponProgressionData): void {
    try {
      player.setPersistedData({ [this._key]: data });
    } catch {}
  }
}


