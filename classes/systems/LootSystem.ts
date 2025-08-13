import { Entity, World, Collider, ColliderShape, RigidBodyType, SceneUI, PlayerEvent, PlayerUIEvent, type Vector3Like, type EventPayloads } from 'hytopia';
import type GamePlayerEntity from '../GamePlayerEntity';

type Rarity = 'common' | 'unusual' | 'rare' | 'epic' | 'legendary';

interface LootItem {
  type: 'weapon' | 'ammo' | 'medkit';
  id: string; // weapon id, ammo type, or medkit
  quantity?: number;
  weight: number; // selection weight within pool
}

interface LootPoolDefinition {
  rarity: Rarity;
  items: LootItem[];
}

interface SpawnArea {
  center: Vector3Like;
  radius: number; // random within radius
}

export class LootCrateEntity extends Entity {
  private _lootGenerated = false;
  private _ui: any | undefined;
  private readonly _lootSystem: LootSystem;
  private readonly _rarity: Rarity;
  private _crateId: string;
  private _uiHandler: ((evt: EventPayloads[PlayerUIEvent.DATA]) => void) | undefined;

  constructor(lootSystem: LootSystem, rarity: Rarity, position: Vector3Like) {
    const scale = 5;
    super({
      name: `Crate_${rarity}`,
      modelUri: 'models/crates/supply_crate_open_animation.glb',
      modelScale: scale,
      rigidBodyOptions: {
        type: (RigidBodyType as any)?.STATIC ?? RigidBodyType.DYNAMIC,
        colliders: [
          Collider.optionsFromModelUri('models/crates/supply_crate_open_animation.glb', scale, ColliderShape.BLOCK),
        ],
      },
    });
    this._lootSystem = lootSystem;
    this._rarity = rarity;
    this._crateId = `${Math.round(position.x)}_${Math.round(position.y)}_${Math.round(position.z)}_${rarity}`;
    this.setPosition(position);
  }

  public interact(interactor: GamePlayerEntity): void {
    if (!this.world) return;
    const contents = this._lootSystem.getOrSeedCrateContents(this._crateId, this._rarity);
    interactor.player.ui.load('ui/crate.html');
    const handler = (evt: EventPayloads[PlayerUIEvent.DATA]) => this._onCrateUIEvent(evt, interactor);
    this._uiHandler = handler;
    interactor.player.ui.on(PlayerUIEvent.DATA, handler);
    setTimeout(() => {
      try { interactor.player.ui.sendData({ type: 'crate-contents', crateId: this._crateId, items: this._lootSystem.getCrateClientContents(this._crateId, this._rarity) }); } catch {}
    }, 50);
    try { (this as any).startModelOneshotAnimations?.(['Open Lid']); } catch {}
  }

  public override spawn(world: World, position?: Vector3Like): void {
    super.spawn(world, position as Vector3Like);
    this._showUI();
  }

  public override despawn(): void {
    this._hideUI();
    super.despawn();
  }

  public _showUI(): void {
    if (!this.world || this._ui) return;
    const offsetY = (this.modelScale || 0.12) * 3.5;
    this._ui = new SceneUI({
      attachedToEntity: this,
      offset: { x: 0, y: offsetY, z: 0 },
      templateId: 'item-nameplate',
      viewDistance: 14,
      state: { name: `${this._rarity.toUpperCase()} CRATE`, iconImageUri: 'icons/chest.png', showPickupArea: true },
    });
    this._ui.load(this.world);
  }

  public _hideUI(): void {
    try { this._ui?.unload?.(); } finally { this._ui = undefined; }
  }

  private _onCrateUIEvent(evt: EventPayloads[PlayerUIEvent.DATA], playerEntity: GamePlayerEntity): void {
    const { data } = evt;
    if (!data || data.crateId !== this._crateId) return;
    if (data.type === 'crate-take' && typeof data.index === 'number') {
      const taken = this._lootSystem.takeFromCrate(this._crateId, data.index);
      if (taken) {
        this._lootSystem.grantLoot(playerEntity, taken);
        try { playerEntity.player.ui.sendData({ type: 'crate-contents', crateId: this._crateId, items: this._lootSystem.getCrateClientContents(this._crateId, this._rarity) }); } catch {}
      }
    }
    if (data.type === 'crate-close') {
      try { playerEntity.player.ui.load('ui/menu.html'); } catch {}
      try { if (this._uiHandler) playerEntity.player.ui.off(PlayerUIEvent.DATA, this._uiHandler); } catch {}
      this._uiHandler = undefined;
    }
  }
}

export default class LootSystem {
  private readonly world: World;
  private readonly pools: Map<Rarity, LootPoolDefinition> = new Map();
  private readonly spawnAreas: SpawnArea[] = [];
  private readonly crates: LootCrateEntity[] = [];
  private readonly crateContents: Map<string, LootItem[]> = new Map();

  constructor(world: World) {
    this.world = world;
    this._initDefaultPools();
    // Ensure crate UI refreshes for players who join after crates already spawned
    this.world.on(PlayerEvent.JOINED_WORLD, () => {
      setTimeout(() => this.refreshCrateUI(), 300);
    });
  }

  public addSpawnArea(center: Vector3Like, radius: number): void {
    this.spawnAreas.push({ center, radius });
  }

  public spawnCrates(count: number): void {
    if (this.spawnAreas.length === 0) return;
    for (let i = 0; i < count; i++) {
      const area = this.spawnAreas[Math.floor(Math.random() * this.spawnAreas.length)]!;
      const pos = this._randomPosInArea(area);
      const rarity = this._rollRarity();
      const crate = new LootCrateEntity(this, rarity, pos);
      crate.spawn(this.world, pos as Vector3Like);
      // Anchor to ground by raycasting down a few blocks
      try {
        const hit = this.world.simulation.raycast({ x: pos.x, y: pos.y + 5, z: pos.z }, { x: 0, y: -1, z: 0 }, 8, {});
        if (hit?.hitPoint) crate.setPosition({ x: hit.hitPoint.x, y: hit.hitPoint.y + 0.1, z: hit.hitPoint.z });
      } catch {}
      this.crates.push(crate);
    }
  }

  public refreshCrateUI(): void {
    for (const c of this.crates) {
      try { (c as any)._showUI?.(); } catch {}
    }
  }

  public rollLoot(rarity: Rarity, count: number): LootItem[] {
    const pool = this.pools.get(rarity);
    if (!pool) return [];
    const result: LootItem[] = [];
    for (let i = 0; i < count; i++) {
      const pick = this._weightedPick(pool.items);
      if (pick) result.push({ ...pick });
    }
    return result;
  }

  public getOrSeedCrateContents(crateId: string, rarity: Rarity): LootItem[] {
    const existing = this.crateContents.get(crateId);
    if (existing) return existing;
    const rolled = this.rollLoot(rarity, 2 + Math.floor(Math.random() * 2));
    this.crateContents.set(crateId, rolled);
    return rolled;
  }

  public getCrateContents(crateId: string): LootItem[] {
    return this.crateContents.get(crateId) ?? [];
  }

  public getCrateClientContents(crateId: string, rarity: Rarity): Array<LootItem & { name?: string; iconImageUri?: string }> {
    const list = this.getOrSeedCrateContents(crateId, rarity);
    // Enrich minimal server items with UI hints
    return list.map(it => ({
      ...it,
      name: this._resolveItemName(it),
      iconImageUri: this._resolveItemIcon(it),
    }));
  }

  public takeFromCrate(crateId: string, index: number): LootItem | null {
    const list = this.crateContents.get(crateId);
    if (!list) return null;
    if (index < 0 || index >= list.length) return null;
    const [removed] = list.splice(index, 1);
    this.crateContents.set(crateId, list);
    return removed ?? null;
  }

  private _resolveItemName(it: LootItem): string {
    if (it.type === 'weapon') return this._weaponName(it.id) || it.id;
    if (it.type === 'ammo') return `${it.id.toUpperCase()} AMMO`;
    if (it.type === 'medkit') return 'MEDKIT';
    return it.id;
  }

  private _resolveItemIcon(it: LootItem): string | undefined {
    if (it.type === 'weapon') return this._weaponIcon(it.id);
    if (it.type === 'ammo') return `icons/${it.id}.png`;
    if (it.type === 'medkit') return 'icons/medkit.png';
    return undefined;
  }

  private _weaponName(id: string): string | undefined {
    try {
      const { WEAPON_DEFINITIONS } = require('../weapons/data/WeaponDefinitions');
      const def = WEAPON_DEFINITIONS.find((d: any) => d.id === id);
      return def?.name;
    } catch { return undefined; }
  }

  private _weaponIcon(id: string): string | undefined {
    try {
      const { WEAPON_DEFINITIONS } = require('../weapons/data/WeaponDefinitions');
      const def = WEAPON_DEFINITIONS.find((d: any) => d.id === id);
      return def?.assets?.ui?.icon;
    } catch { return undefined; }
  }

  public grantLoot(player: GamePlayerEntity, loot: LootItem): void {
    switch (loot.type) {
      case 'weapon': {
        const { WeaponFactory } = require('../weapons/WeaponFactory');
        const item = WeaponFactory.create(loot.id);
        if (!player.gamePlayer.hotbar.addItem(item)) player.gamePlayer.backpack.addItem(item);
        break;
      }
      case 'ammo': {
        const { default: AmmoItemFactory } = require('../items/AmmoItemFactory');
        const item = AmmoItemFactory.create(loot.id, loot.quantity ?? 30);
        if (!player.gamePlayer.hotbar.addItem(item)) player.gamePlayer.backpack.addItem(item);
        break;
      }
      case 'medkit': {
        const MedkitItem = require('../items/MedkitItem').default;
        const item = new MedkitItem();
        if (!player.gamePlayer.hotbar.addItem(item)) player.gamePlayer.backpack.addItem(item);
        break;
      }
    }
  }

  // ===== internals =====
  private _randomPosInArea(area: SpawnArea): Vector3Like {
    const t = Math.random() * Math.PI * 2;
    const r = Math.random() * area.radius;
    return { x: area.center.x + Math.cos(t) * r, y: area.center.y, z: area.center.z + Math.sin(t) * r };
  }

  private _rollRarity(): Rarity {
    const table: Array<{ r: Rarity; w: number }> = [
      { r: 'common', w: 55 },
      { r: 'unusual', w: 25 },
      { r: 'rare', w: 12 },
      { r: 'epic', w: 6 },
      { r: 'legendary', w: 2 },
    ];
    const total = table.reduce((s, e) => s + e.w, 0);
    let roll = Math.random() * total;
    for (const e of table) { if (roll < e.w) return e.r; roll -= e.w; }
    return 'common';
  }

  private _weightedPick(items: LootItem[]): LootItem | null {
    const total = items.reduce((s, it) => s + (it.weight || 1), 0);
    let roll = Math.random() * total;
    for (const it of items) { const w = it.weight || 1; if (roll < w) return it; roll -= w; }
    return null;
  }

  private _initDefaultPools(): void {
    // Basic example; wire to your weapon ids and ammo types
    this.pools.set('common', {
      rarity: 'common',
      items: [
        { type: 'ammo', id: 'pistol', quantity: 30, weight: 4 },
        { type: 'ammo', id: 'rifle', quantity: 30, weight: 3 },
        { type: 'medkit', id: 'medkit', weight: 1 },
      ],
    });
    this.pools.set('unusual', {
      rarity: 'unusual',
      items: [
        { type: 'weapon', id: 'm9_beretta', weight: 2 },
        { type: 'ammo', id: 'rifle', quantity: 60, weight: 3 },
        { type: 'medkit', id: 'medkit', weight: 1 },
      ],
    });
    this.pools.set('rare', {
      rarity: 'rare',
      items: [
        { type: 'weapon', id: 'akm', weight: 2 },
        { type: 'ammo', id: 'rifle', quantity: 90, weight: 2 },
      ],
    });
    this.pools.set('epic', {
      rarity: 'epic',
      items: [
        { type: 'weapon', id: 'desert_eagle', weight: 1 },
        { type: 'weapon', id: 'spetsnaz_akm_nsb', weight: 1 },
      ],
    });
    this.pools.set('legendary', {
      rarity: 'legendary',
      items: [
        { type: 'weapon', id: 'sword_mk18_mjolnir', weight: 1 },
      ],
    });
  }
}


