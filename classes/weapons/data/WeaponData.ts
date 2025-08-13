import type { Vector3Like, QuaternionLike } from 'hytopia';

export interface WeaponStats {
  damage: number;
  fireRate: number;        // RPM
  accuracy: number;        // 0-100
  range: number;          // meters
  reloadTime: number;     // milliseconds
  magazineSize: number;
  recoil: number;         // 0-100
  weight: number;         // kg
  penetration: number;    // 0-100
  stability: number;      // 0-100
}

export interface WeaponAssets {
  models: {
    held: string;
    dropped: string;
    scale: number;
    dropScale?: number;
    position: Vector3Like;
    rotation: QuaternionLike;
  };
  audio: {
    shoot: string;
    reload: string;
    empty?: string;
    scope?: string;
  };
  ui: {
    icon: string;
  };
  effects?: {
    muzzleFlash?: {
      position: Vector3Like;
      rotation: QuaternionLike;
    };
  };
}

export interface WeaponBehavior {
  ammoType: AmmoType;
  scopeZoom?: number;
  specialAbilities?: string[];
  fireModes?: FireMode[];
  reload?: {
    cancelOnMovement?: boolean;    // Whether reload cancels when moving
    cancelOnSprint?: boolean;      // Whether reload cancels when sprinting
  };
  // sway removed
}

export interface WeaponData {
  // Basic info
  id: string;
  name: string;
  description: string;
  
  // Classification
  category: WeaponCategory;
  rarity: WeaponRarity;
  
  // Gameplay stats
  stats: WeaponStats;
  
  // Visual/audio assets
  assets: WeaponAssets;
  
  // Behavior configuration
  behavior: WeaponBehavior;
  
  // Economy
  price: number;
}

export enum WeaponCategory {
  PISTOL = 'pistol',
  RIFLE = 'rifle',
  SHOTGUN = 'shotgun',
  SMG = 'smg',
  SNIPER = 'sniper',
  LMG = 'lmg',
}



export enum WeaponRarity {
  COMMON = 'common',
  UNUSUAL = 'unusual',
  RARE = 'rare',
  EPIC = 'epic',
  LEGENDARY = 'legendary',
}

export enum FireMode {
  SINGLE = 'single',
  BURST = 'burst',
  AUTO = 'auto',
}

export type AmmoType = 'pistol' | 'rifle' | 'shotgun' | 'sniper';

 