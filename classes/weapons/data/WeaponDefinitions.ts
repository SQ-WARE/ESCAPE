import { Quaternion } from 'hytopia';
import type { WeaponData } from './WeaponData';
import { WeaponCategory, WeaponRarity, FireMode } from './WeaponData';

// Pistols
export const M9_BERETTA: WeaponData = {
  id: 'm9_beretta',
  name: 'Beretta M9',
  description: '9×19mm service pistol known for reliability, mild recoil, and consistent accuracy.',
  category: WeaponCategory.PISTOL,
  rarity: WeaponRarity.COMMON,
  stats: {
    damage: 18,
    fireRate: 200,  // Realistic semi-auto rate
    accuracy: 82,
    range: 30,
    reloadTime: 800,  // Realistic reload time
    magazineSize: 15,
    recoil: 25,
    weight: 1.0,
    penetration: 25,
    stability: 85,
  },
  assets: {
    models: {
      held: 'models/items/pistol_m9.glb',
      dropped: 'models/items/pistol_m9.glb',
      scale: 4.0,
      position: { x: 0, y: 0, z: -0.33 },
      rotation: Quaternion.fromEuler(-90, 0, 0),
    },
    audio: {
      shoot: 'audio/sfx/sfx/pistol-shoot.mp3',
      reload: 'audio/sfx/sfx/pistol-reload.mp3',
      empty: 'audio/sfx/sfx/pistol-empty.mp3',
    },
    ui: {
      icon: 'icons/pistol_m9.png',
    },
    effects: {
      muzzleFlash: {
        position: { x: 0, y: 0.02, z: -0.8 },
        rotation: Quaternion.fromEuler(0, 0, 0),
      },
    },
  },
  behavior: {
    ammoType: 'pistol',
    fireModes: [FireMode.SINGLE],
    reload: {
      cancelOnMovement: false,  // Allow reloading while walking
      cancelOnSprint: true,     // Cancel reload when sprinting
    },
    // sway removed
  },
  price: 150,
};

export const FN_502_TACTICAL_FDE: WeaponData = {
  id: 'fn_502_tactical_fde',
  name: 'FN 502 Tactical FDE',
  description: 'Optics-ready polymer pistol with threaded barrel and duty-grade ergonomics for dependable control.',
  category: WeaponCategory.PISTOL,
  rarity: WeaponRarity.UNUSUAL,
  stats: {
    damage: 17,
    fireRate: 220,
    accuracy: 86,
    range: 30,
    reloadTime: 800,
    magazineSize: 15,
    recoil: 24,
    weight: 1.1,
    penetration: 24,
    stability: 88,
  },
  assets: {
    models: {
      held: 'models/items/pistol__fn_502_tactical_fde.glb',
      dropped: 'models/items/pistol__fn_502_tactical_fde.glb',
      scale: 0.17,
      dropScale: 1.0 / 2.3,
      position: { x: 0, y: 0, z: -0.13 },
      rotation: Quaternion.fromEuler(-90, 0, 0),
    },
    audio: {
      shoot: 'audio/sfx/sfx/pistol-shoot.mp3',
      reload: 'audio/sfx/sfx/pistol-reload.mp3',
      empty: 'audio/sfx/sfx/pistol-empty.mp3',
    },
    ui: { icon: 'icons/pistol_fn_502.png' },
  },
  behavior: {
    ammoType: 'pistol',
    fireModes: [FireMode.SINGLE],
    // sway removed
  },
  price: 350,
};

export const DESERT_EAGLE: WeaponData = {
  id: 'desert_eagle',
  name: 'Desert Eagle',
  description: 'Gas‑operated magnum pistol delivering extreme muzzle energy; heavy recoil and limited capacity.',
  category: WeaponCategory.PISTOL,
  rarity: WeaponRarity.RARE,
  stats: {
    damage: 35,
    fireRate: 150,  // Slower due to heavy recoil
    accuracy: 75,
    range: 40,
    reloadTime: 1000,  // Slower reload for heavy pistol
    magazineSize: 7,
    recoil: 65,
    weight: 2.0,
    penetration: 60,
    stability: 70,
  },
  assets: {
    models: {
      held: 'models/items/pistol_deagle.glb',
      dropped: 'models/items/pistol_deagle.glb',
      scale: 0.25,
      position: { x: 0, y: 0, z: -0.13 },
      rotation: Quaternion.fromEuler(-90, 0, -90),
    },
    audio: {
      shoot: 'audio/sfx/sfx/pistol-shoot.mp3',
      reload: 'audio/sfx/sfx/pistol-reload.mp3',
      empty: 'audio/sfx/sfx/pistol-empty.mp3',
    },
    ui: {
      icon: 'icons/pistol_deagle.png',
    },
    effects: {
      muzzleFlash: {
        position: { x: 0, y: 0.03, z: -0.9 },
        rotation: Quaternion.fromEuler(0, 0, 0),
      },
    },
  },
  behavior: {
    ammoType: 'pistol',
    fireModes: [FireMode.SINGLE],
    reload: {
      cancelOnMovement: false,  // Allow reloading while walking
      cancelOnSprint: true,     // Cancel reload when sprinting
    },
    // sway removed
  },
  price: 500,
};

export const GLOCK_17: WeaponData = {
  id: 'glock_17',
  name: 'Glock 17',
  description: 'Polymer‑framed 9×19mm sidearm favored by law enforcement for capacity, simplicity, and durability.',
  category: WeaponCategory.PISTOL,
  rarity: WeaponRarity.COMMON,
      stats: {
      damage: 16,
      fireRate: 200,  // Realistic semi-auto rate
      accuracy: 85,
      range: 28,
      reloadTime: 700,  // Realistic reload time for pistol
      magazineSize: 17,
      recoil: 20,
      weight: 0.9,
      penetration: 20,
      stability: 90,
    },
  assets: {
    models: {
      held: 'models/items/pistol_glock17.glb',
      dropped: 'models/items/pistol_glock17.glb',
      scale: 4.2,
      position: { x: 0, y: 0, z: 1.13 },
      rotation: Quaternion.fromEuler(-90, 0, -90),
    },
    audio: {
      shoot: 'audio/sfx/sfx/pistol-shoot.mp3',
      reload: 'audio/sfx/sfx/pistol-reload.mp3',
      empty: 'audio/sfx/sfx/pistol-empty.mp3',
    },
    ui: {
      icon: 'icons/pistol_glock.png',
    },
    effects: {
      muzzleFlash: {
        position: { x: 0, y: 0.02, z: -0.75 },
        rotation: Quaternion.fromEuler(0, 0, 0),
      },
    },
  },
  behavior: {
    ammoType: 'pistol',
    fireModes: [FireMode.SINGLE],
    // sway removed
  },
  price: 200,
};

// Rifles
export const AKM: WeaponData = {
  id: 'akm',
  name: 'AKM',
  description: 'Stamped‑receiver 7.62×39mm rifle renowned for rugged reliability, strong recoil, and field durability.',
  category: WeaponCategory.RIFLE,
  rarity: WeaponRarity.COMMON,
  stats: {
    damage: 25,
    fireRate: 600,  // Realistic AK fire rate
    accuracy: 75,
    range: 60,
    reloadTime: 1500,  // Realistic reload time for rifle
    magazineSize: 30,
    recoil: 50,
    weight: 3.5,
    penetration: 35,
    stability: 70,
  },
  assets: {
    models: {
      held: 'models/items/rifle_akm.glb',
      dropped: 'models/items/rifle_akm.glb',
      scale: 1.0,
      dropScale: 1.0 / 2.3, // Scale down by 2.3x
      position: { x: 0, y: 0, z: 0.13 },
      rotation: Quaternion.fromEuler(-90, 0, -90),
    },
    audio: {
      shoot: 'audio/sfx/sfx/rifle-shoot.mp3',
      reload: 'audio/sfx/sfx/rifle-reload.mp3',
      empty: 'audio/sfx/sfx/rifle-empty.mp3',
    },
    ui: {
      icon: 'icons/rifle_akm.png',
    },
    effects: {
      muzzleFlash: {
        position: { x: 0, y: 0.05, z: -1.3 },
        rotation: Quaternion.fromEuler(0, 0, 0),
      },
    },
  },
  behavior: {
    ammoType: 'rifle',
    fireModes: [FireMode.SINGLE, FireMode.AUTO],
    // sway removed
  },
  price: 400,
};

export const SPETSNAZ_AKM_NSB: WeaponData = {
  id: 'spetsnaz_akm_nsb',
  name: 'AKM NSB (Spetsnaz)',
  description: 'Modernized AKM variant with upgraded furniture and optics mounting for improved handling.',
  category: WeaponCategory.RIFLE,
  rarity: WeaponRarity.UNUSUAL,
  stats: {
    damage: 26,
    fireRate: 620,
    accuracy: 77,
    range: 65,
    reloadTime: 1500,
    magazineSize: 30,
    recoil: 48,
    weight: 3.6,
    penetration: 38,
    stability: 72,
  },
  assets: {
    models: {
      held: 'models/items/rifle_spetsnaz_akmnsb.glb',
      dropped: 'models/items/rifle_spetsnaz_akmnsb.glb',
      scale: 1.0,
      dropScale: 1.0 / 2.3,
      position: { x: 0, y: 0, z: 0.1 },
      rotation: Quaternion.fromEuler(-90, 0, -90),
    },
    audio: {
      shoot: 'audio/sfx/sfx/rifle-shoot.mp3',
      reload: 'audio/sfx/sfx/rifle-reload.mp3',
      empty: 'audio/sfx/sfx/rifle-empty.mp3',
    },
    ui: { icon: 'icons/rifle_akm.png' },
  },
  behavior: {
    ammoType: 'rifle',
    fireModes: [FireMode.SINGLE, FireMode.AUTO],
    // sway removed
  },
  price: 500,
};

// SMGs
export const MP5A2: WeaponData = {
  id: 'mp5a2',
  name: 'HK MP5A2',
  description: '9×19mm roller‑delayed SMG with low recoil and controllable bursts, ideal for close quarters.',
  category: WeaponCategory.SMG,
  rarity: WeaponRarity.UNUSUAL,
  stats: {
    damage: 15,
    fireRate: 800,  // Realistic MP5 fire rate
    accuracy: 85,
    range: 35,
    reloadTime: 900,  // Realistic reload time for SMG
    magazineSize: 30,
    recoil: 20,
    weight: 2.5,
    penetration: 25,
    stability: 80,
  },
  assets: {
    models: {
      held: 'models/items/sub_mp5a2.glb',
      dropped: 'models/items/sub_mp5a2.glb',
      scale: 0.5,
      dropScale: 0.5 / 2.3, // Scale down by 2.3x
      position: { x: 0, y: -0.15, z: 0.03 },
      rotation: Quaternion.fromEuler(-90, 0, -90),
    },
    audio: {
      shoot: 'audio/sfx/sfx/machine-gun-shoot.mp3',
      reload: 'audio/sfx/sfx/machine-gun-reload.mp3',
      empty: 'audio/sfx/sfx/machine-gun-empty.mp3',
    },
    ui: {
      icon: 'icons/smg_mp5.png',
    },
    effects: {
      muzzleFlash: {
        position: { x: 0, y: 0.04, z: -1.1 },
        rotation: Quaternion.fromEuler(0, 0, 0),
      },
    },
  },
  behavior: {
    ammoType: 'pistol',
    fireModes: [FireMode.SINGLE, FireMode.BURST, FireMode.AUTO],
    // sway removed
  },
  price: 450,
};

export const INGRAM_M6: WeaponData = {
  id: 'ingram_m6',
  name: 'Ingram Model 6',
  description: 'Post‑war blowback SMG with very high cyclic rate; compact, controllable at short range.',
  category: WeaponCategory.SMG,
  rarity: WeaponRarity.COMMON,
      stats: {
      damage: 14,
      fireRate: 1200,  // High rate of fire for SMG
      accuracy: 75,
      range: 30,
      reloadTime: 800,  // Realistic reload time for SMG
      magazineSize: 32,
      recoil: 25,
      weight: 2.1,
      penetration: 22,
      stability: 75,
    },
  assets: {
    models: {
      held: 'models/items/sub_ingram.glb',
      dropped: 'models/items/sub_ingram.glb',
      scale: 0.0033,
      dropScale: 0.7 / 2.3,
      position: { x: 0, y: 0, z: 0.12 },
      rotation: Quaternion.fromEuler(-90, 0, -90),
    },
    audio: {
      shoot: 'audio/sfx/sfx/machine-gun-shoot.mp3',
      reload: 'audio/sfx/sfx/machine-gun-reload.mp3',
      empty: 'audio/sfx/sfx/machine-gun-empty.mp3',
    },
    ui: {
      icon: 'icons/smg_ingram_m6.png',
    },
    effects: {
      muzzleFlash: {
        position: { x: 0, y: 0.03, z: -1.0 },
        rotation: Quaternion.fromEuler(0, 0, 0),
      },
    },
  },
  behavior: {
    ammoType: 'pistol',
    fireModes: [FireMode.SINGLE, FireMode.AUTO],
    // sway removed
  },
  price: 350,
};

export const HK_MP5K: WeaponData = {
  id: 'hk_mp5k',
  name: 'HK MP5K',
  description: 'Ultra‑compact MP5 variant optimized for concealment and rapid handling at very short ranges.',
  category: WeaponCategory.SMG,
  rarity: WeaponRarity.UNUSUAL,
  stats: {
    damage: 14,
    fireRate: 850,
    accuracy: 82,
    range: 32,
    reloadTime: 900,
    magazineSize: 30,
    recoil: 22,
    weight: 2.2,
    penetration: 22,
    stability: 78,
  },
  assets: {
    models: {
      held: 'models/items/sub_hk_mp5k.glb',
      dropped: 'models/items/sub_hk_mp5k.glb',
      scale: 0.55,
      dropScale: 0.55 / 2.3,
      position: { x: 0, y: -0.1, z: 0.0 },
      rotation: Quaternion.fromEuler(-90, 0, -90),
    },
    audio: {
      shoot: 'audio/sfx/sfx/machine-gun-shoot.mp3',
      reload: 'audio/sfx/sfx/machine-gun-reload.mp3',
      empty: 'audio/sfx/sfx/machine-gun-empty.mp3',
    },
    ui: { icon: 'icons/sub_mp5k.png' },
  },
  behavior: {
    ammoType: 'pistol',
    fireModes: [FireMode.SINGLE, FireMode.AUTO],
    // sway removed
  },
  price: 500,
};

export const HK_MP5SD: WeaponData = {
  id: 'hk_mp5sd',
  name: 'HK MP5SD',
  description: 'Integrally suppressed MP5 variant with subsonic performance and minimal muzzle flash for stealth.',
  category: WeaponCategory.SMG,
  rarity: WeaponRarity.RARE,
  stats: {
    damage: 13,
    fireRate: 800,
    accuracy: 84,
    range: 33,
    reloadTime: 900,
    magazineSize: 30,
    recoil: 18,
    weight: 2.7,
    penetration: 18,
    stability: 82,
  },
  assets: {
    models: {
      held: 'models/items/sub_hk_mp5sd.glb',
      dropped: 'models/items/sub_hk_mp5sd.glb',
      scale: 0.58,
      dropScale: 0.58 / 2.3,
      position: { x: 0, y: -0.1, z: 0.02 },
      rotation: Quaternion.fromEuler(-90, 0, -90),
    },
    audio: {
      shoot: 'audio/sfx/sfx/machine-gun-shoot.mp3',
      reload: 'audio/sfx/sfx/machine-gun-reload.mp3',
      empty: 'audio/sfx/sfx/machine-gun-empty.mp3',
    },
    ui: { icon: 'icons/sub_mp5k_silenced.png' },
  },
  behavior: {
    ammoType: 'pistol',
    fireModes: [FireMode.SINGLE, FireMode.AUTO],
    // sway removed
  },
  price: 550,
};

// Snipers
export const ASVKM: WeaponData = {
  id: 'asvkm',
  name: 'ASVK-M',
  description: '12.7×108mm anti‑materiel rifle delivering long‑range penetration and heavy recoil; bolt‑action precision.',
  category: WeaponCategory.SNIPER,
  rarity: WeaponRarity.RARE,
  stats: {
    damage: 85,
    fireRate: 60,  // Realistic bolt-action rate (1 shot per second)
    accuracy: 95,
    range: 400,
    reloadTime: 2500,  // Slower reload for heavy sniper rifle
    magazineSize: 5,
    recoil: 90,
    weight: 5.0,
    penetration: 95,
    stability: 90,
  },
  assets: {
    models: {
      held: 'models/items/sniper_asvkm.glb',
      dropped: 'models/items/sniper_asvkm.glb',
      scale: 0.25,
      dropScale: 0.25 / 2.3, // Scale down by 2.3x
      position: { x: 0, y: -1.3, z: 0.3 },
      rotation: Quaternion.fromEuler(-90, 0, -90),
    },
    audio: {
      shoot: 'audio/sfx/sfx/sniper-shoot.mp3',
      reload: 'audio/sfx/sfx/sniper-reload.mp3',
      empty: 'audio/sfx/sfx/sniper-empty.mp3',
    },
    ui: {
      icon: 'icons/sniper_asvkm.png',
    },
    effects: {
      muzzleFlash: {
        position: { x: 0, y: 0.08, z: -1.8 },
        rotation: Quaternion.fromEuler(0, 0, 0),
      },
    },
  },
  behavior: {
    ammoType: 'sniper',
    scopeZoom: 6,
    fireModes: [FireMode.SINGLE],
    // sway removed
  },
  price: 1500,
};

export const VICTRIX_CORVO_V: WeaponData = {
  id: 'victrix_corvo_v',
  name: 'Victrix Corvo V',
  description: 'Precision bolt‑action chassis rifle engineered for competition‑grade accuracy at long range.',
  category: WeaponCategory.SNIPER,
  rarity: WeaponRarity.RARE,
  stats: {
    damage: 80,
    fireRate: 55,
    accuracy: 96,
    range: 450,
    reloadTime: 2400,
    magazineSize: 5,
    recoil: 88,
    weight: 4.8,
    penetration: 92,
    stability: 92,
  },
  assets: {
    models: {
      held: 'models/items/sniper_victrix_armaments_corvo_v.glb',
      dropped: 'models/items/sniper_victrix_armaments_corvo_v.glb',
      scale: 0.5,
      dropScale: 0.28 / 2.3,
      position: { x: 0, y: -0.43, z: 0 },
      rotation: Quaternion.fromEuler(-90, 0, -90),
    },
    audio: {
      shoot: 'audio/sfx/sfx/sniper-shoot.mp3',
      reload: 'audio/sfx/sfx/sniper-reload.mp3',
      empty: 'audio/sfx/sfx/sniper-empty.mp3',
    },
    ui: { icon: 'icons/sniper_victrix.png' },
  },
  behavior: {
    ammoType: 'sniper',
    scopeZoom: 8,
    fireModes: [FireMode.SINGLE],
    // sway removed
  },
  price: 1700,
};

export const SWORD_MK18_MJOLNIR: WeaponData = {
  id: 'sword_mk18_mjolnir',
  name: 'SWORD MK-18 SA-ASR Mjolnir',
  description: 'Semi‑auto anti‑materiel platform optimized for long‑range interdiction with substantial recoil.',
  category: WeaponCategory.SNIPER,
  rarity: WeaponRarity.EPIC,
  stats: {
    damage: 95,
    fireRate: 50,
    accuracy: 93,
    range: 500,
    reloadTime: 2600,
    magazineSize: 5,
    recoil: 95,
    weight: 6.2,
    penetration: 98,
    stability: 88,
  },
  assets: {
    models: {
      held: 'models/items/sniper_s.w.o.r.d._mk-18_sa-asr_mjolnir.glb',
      dropped: 'models/items/sniper_s.w.o.r.d._mk-18_sa-asr_mjolnir.glb',
      scale: 4.0,
      dropScale: 4.0 / 2.3,
      position: { x: 0, y: -0.37, z: -0.2 },
      rotation: Quaternion.fromEuler(-90, 0, -90),
    },
    audio: {
      shoot: 'audio/sfx/sfx/sniper-shoot.mp3',
      reload: 'audio/sfx/sfx/sniper-reload.mp3',
      empty: 'audio/sfx/sfx/sniper-empty.mp3',
    },
    ui: { icon: 'icons/sniper_mk18.png' },
  },
  behavior: {
    ammoType: 'sniper',
    scopeZoom: 10,
    fireModes: [FireMode.SINGLE],
    // sway removed
  },
  price: 2200,
};

// Shotguns
export const KBP_PP90_SHOTGUN: WeaponData = {
  id: 'kbp_pp90_shotgun',
  name: 'KBP PP-90',
  description: 'Compact 12‑gauge pump shotgun built for close‑quarters dominance; wide spread and strong recoil.',
  category: WeaponCategory.SHOTGUN,
  rarity: WeaponRarity.UNUSUAL,
  stats: {
    damage: 12,         // per pellet (example)
    fireRate: 80,       // pumps per minute
    accuracy: 55,
    range: 25,
    reloadTime: 2200,   // longer reload (shell-by-shell simulated in behavior if desired)
    magazineSize: 7,    // tube capacity
    recoil: 70,
    weight: 3.2,
    penetration: 10,
    stability: 55,
  },
  assets: {
    models: {
      held: 'models/items/shotgun_kbp_pp-90.glb',
      dropped: 'models/items/shotgun_kbp_pp-90.glb',
      scale: 7.1,
      dropScale: 0.5 / 2.3,
      position: { x: 0, y: -0.45, z: -0.2 },
      rotation: Quaternion.fromEuler(-90, 0, -90),
    },
    audio: {
      shoot: 'audio/sfx/sfx/shotgun-shoot.mp3',
      reload: 'audio/sfx/sfx/shotgun-reload.mp3',
      empty: 'audio/sfx/sfx/shotgun-empty.mp3',
    },
    ui: { icon: 'icons/shotgun_kbp_pp90.png' },
    effects: {
      muzzleFlash: {
        position: { x: 0, y: 0.05, z: -1.25 },
        rotation: Quaternion.fromEuler(0, 0, 0),
      },
    },
  },
  behavior: {
    ammoType: 'shotgun',
    fireModes: [FireMode.SINGLE],
    // sway removed
  },
  price: 600,
};

// All weapon definitions
export const WEAPON_DEFINITIONS: WeaponData[] = [
  // Pistols
  M9_BERETTA,
  DESERT_EAGLE,
  GLOCK_17,
  FN_502_TACTICAL_FDE,
  
  // Rifles
  AKM,
  SPETSNAZ_AKM_NSB,
  
  // SMGs
  MP5A2,
  INGRAM_M6,
  HK_MP5K,
  HK_MP5SD,
  
  // Snipers
  ASVKM,
  VICTRIX_CORVO_V,
  SWORD_MK18_MJOLNIR,

  // Shotguns
  KBP_PP90_SHOTGUN,
]; 