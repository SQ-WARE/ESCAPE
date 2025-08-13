import { Entity, World, Collider, ColliderShape, RigidBodyType, PlayerEvent, PlayerUIEvent, type Vector3Like, type EventPayloads } from 'hytopia';
import type GamePlayerEntity from '../GamePlayerEntity';
import ItemInventory from './ItemInventory';
import type BaseItem from '../items/BaseItem';
import BaseAmmoItem from '../items/BaseAmmoItem';
import { ItemUIDataHelper } from '../items/ItemUIDataHelper';

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
  private readonly _lootSystem: LootSystem;
  private readonly _rarity: Rarity;
  private _crateId: string;
  private _uiHandler: ((evt: EventPayloads[PlayerUIEvent.DATA]) => void) | undefined;
  private _isOpenByPlayerId: Set<string> = new Set();

  constructor(lootSystem: LootSystem, rarity: Rarity, position: Vector3Like) {
    const scale = 3.33;
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
    const pid = String(interactor.player.id || interactor.player.username || 'unknown');
    if (this._isOpenByPlayerId.has(pid)) return; // already open for this player
    this._isOpenByPlayerId.add(pid);
    try { interactor.gamePlayer.setCrateOpen(true); } catch {}
    const contents = this._lootSystem.getOrSeedCrateContents(this._crateId, this._rarity);
    interactor.player.ui.load('ui/crate.html');
    const handler = (evt: EventPayloads[PlayerUIEvent.DATA]) => this._onCrateUIEvent(evt, interactor);
    this._uiHandler = handler;
    interactor.player.ui.on(PlayerUIEvent.DATA, handler);
    setTimeout(() => {
      try {
        interactor.player.ui.sendData({
          type: 'crate-contents',
          crateId: this._crateId,
          items: this._lootSystem.getCrateClientContents(this._crateId, this._rarity),
          gridWidth: this._lootSystem.getCrateGridWidth(),
          size: this._lootSystem.getCrateSize(),
          inventory: this._lootSystem._serializeInventory(interactor.gamePlayer.backpack),
          hotbar: this._lootSystem._serializeInventory(interactor.gamePlayer.hotbar),
        });
      } catch {}
    }, 50);
    try { (this as any).startModelOneshotAnimations?.(['Open Lid']); } catch {}
  }

  public override spawn(world: World, position?: Vector3Like): void {
    super.spawn(world, position as Vector3Like);
  }

  public override despawn(): void {
    super.despawn();
  }

  private _onCrateUIEvent(evt: EventPayloads[PlayerUIEvent.DATA], playerEntity: GamePlayerEntity): void {
    const { data } = evt;
    if (!data || data.crateId !== this._crateId) return;
    if (data.type === 'crate-take' && typeof data.index === 'number') {
      const taken = this._lootSystem.takeFromCrate(this._crateId, data.index);
      if (taken) {
        this._lootSystem.grantLoot(playerEntity, taken);
        try {
          playerEntity.player.ui.sendData({
            type: 'crate-sync',
            crate: this._lootSystem.getCrateClientContents(this._crateId, this._rarity),
            inventory: this._lootSystem._serializeInventory(playerEntity.gamePlayer.backpack),
            hotbar: this._lootSystem._serializeInventory(playerEntity.gamePlayer.hotbar),
          });
        } catch {}
      }
    }
    if (data.type === 'crate-move') {
      this._lootSystem.enqueueOp(playerEntity, () => {
        this._lootSystem.moveItemBetween(this._crateId, String(data.fromType), Number(data.fromIndex), String(data.toType), Number(data.toIndex), playerEntity);
        try {
          playerEntity.player.ui.sendData({
            type: 'crate-sync',
            crate: this._lootSystem.getCrateClientContents(this._crateId, this._rarity),
            inventory: this._lootSystem._serializeInventory(playerEntity.gamePlayer.backpack),
            hotbar: this._lootSystem._serializeInventory(playerEntity.gamePlayer.hotbar),
          });
        } catch {}
      });
    }
    if (data.type === 'crate-requestSync') {
      try {
        playerEntity.player.ui.sendData({
          type: 'crate-sync',
          crate: this._lootSystem.getCrateClientContents(this._crateId, this._rarity),
          inventory: this._lootSystem._serializeInventory(playerEntity.gamePlayer.backpack),
          hotbar: this._lootSystem._serializeInventory(playerEntity.gamePlayer.hotbar),
        });
      } catch {}
    }
    if (data.type === 'crate-quickMove') {
      this._lootSystem.enqueueOp(playerEntity, () => {
        this._lootSystem.quickMoveBetween(this._crateId, String(data.fromType), Number(data.fromIndex), playerEntity);
        try {
          playerEntity.player.ui.sendData({
            type: 'crate-sync',
            crate: this._lootSystem.getCrateClientContents(this._crateId, this._rarity),
            inventory: this._lootSystem._serializeInventory(playerEntity.gamePlayer.backpack),
            hotbar: this._lootSystem._serializeInventory(playerEntity.gamePlayer.hotbar),
          });
        } catch {}
      });
    }
    if (data.type === 'crate-close') {
      try {
        playerEntity.player.ui.load('ui/index.html');
        playerEntity.player.ui.lockPointer(true);
        // Brief fader to mask HUD style flash while index initializes
        setTimeout(() => {
          try { playerEntity.player.ui.sendData({ type: 'prewarmHud' }); } catch {}
          try { playerEntity.player.ui.sendData({ type: 'screen-fade', show: true, durationMs: 120 }); } catch {}
          setTimeout(() => {
            try { playerEntity.player.ui.sendData({ type: 'screen-fade', show: false, durationMs: 120 }); } catch {}
            // refresh HUD and weapon HUD once page is ready
            try { playerEntity.player.ui.sendData({ type: 'requestHudSync' }); } catch {}
            try { playerEntity.player.ui.sendData({ type: 'requestWeaponHud' }); } catch {}
            try {
              // Re-equip current selected hotbar item to force weapon entity and UI re-init
              const gp: any = playerEntity.gamePlayer;
              if (gp && typeof gp.hotbar?.selectedIndex === 'number') {
                const sel = gp.hotbar.selectedIndex;
                // Call handler directly and also send UI event to keep client HUD in sync
                gp.hotbar.setSelectedIndex(sel);
                playerEntity.player.ui.sendData({ type: 'setSelectedHotbarIndex', index: sel });
              }
            } catch {}
            // Additionally, directly push weapon HUD if a gun is equipped (covers listener race)
            try {
              const gun = playerEntity.gamePlayer.getCurrentWeapon?.();
              if (gun) {
                gun.updateAmmoIndicatorUI();
                (gun as any).updateFireRateIndicator?.();
                // and push weapon info (name/icon) to avoid 'No Weapon'
                (gun as any)._uiSystem?.updateWeaponInfo?.(playerEntity);
              }
            } catch {}
          }, 140);
        }, 10);
      } catch {}
      try { if (this._uiHandler) playerEntity.player.ui.off(PlayerUIEvent.DATA, this._uiHandler); } catch {}
      this._uiHandler = undefined;
      try {
        const pid = String(playerEntity.player.id || playerEntity.player.username || 'unknown');
        this._isOpenByPlayerId.delete(pid);
      } catch {}
      try { playerEntity.gamePlayer.setCrateOpen(false); } catch {}
    }
  }
}

export default class LootSystem {
  private readonly world: World;
  private readonly pools: Map<Rarity, LootPoolDefinition> = new Map();
  private readonly spawnAreas: SpawnArea[] = [];
  private readonly crates: LootCrateEntity[] = [];
  private readonly crateContents: Map<string, LootItem[]> = new Map();
  private readonly crateInventories: Map<string, { inv: ItemInventory; width: number; size: number } > = new Map();
  // Per-player operation queues to serialize rapid actions (e.g., shift-click spam)
  private readonly _opQueues: Map<string, Array<() => void>> = new Map();
  private readonly _opLocks: Set<string> = new Set();

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
    // No-op: crate holograms/scene UI removed by request
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
    // Also hydrate inventory for crate UI parity
    const rec = this.getOrCreateCrateInventory(crateId);
    this._seedInventoryFromLoot(rec.inv, rolled);
    return rolled;
  }

  public getCrateContents(crateId: string): LootItem[] {
    return this.crateContents.get(crateId) ?? [];
  }

  public getCrateClientContents(crateId: string, rarity: Rarity): Array<Record<string, unknown>> {
    // Ensure crate exists/seeded, then serialize actual inventory slots
    this.getOrSeedCrateContents(crateId, rarity);
    const rec = this.getOrCreateCrateInventory(crateId);
    return this._serializeInventory(rec.inv);
  }

  public takeFromCrate(crateId: string, index: number): LootItem | null {
    const list = this.crateContents.get(crateId);
    if (!list) return null;
    if (index < 0 || index >= list.length) return null;
    const [removed] = list.splice(index, 1);
    this.crateContents.set(crateId, list);
    // Reflect in inventory
    const rec = this.crateInventories.get(crateId);
    if (rec) {
      const item = rec.inv.getItemAt(index);
      if (item) rec.inv.removeItem(index);
    }
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

  // Expose a UI serializer matching stash/inventory payload (includes description, rarity, stats, ammoType, etc.)
  public _serializeInventory(inv: ItemInventory): Array<Record<string, unknown>> {
    const out: Array<Record<string, unknown>> = [];
    for (let i = 0; i < inv.size; i++) {
      const item = inv.getItemAt(i) as BaseItem | null;
      if (!item) continue;
      out.push(ItemUIDataHelper.getUIData(item, { position: i, quantity: item.quantity }));
    }
    return out;
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

  // For UI parity with backpack/stash
  public getCrateGridWidth(): number { return 9; }
  public getCrateSize(): number { return 72; }

  public getOrCreateCrateInventory(crateId: string): { inv: ItemInventory; width: number; size: number } {
    let rec = this.crateInventories.get(crateId);
    if (rec) return rec;
    rec = { inv: new ItemInventory(this.getCrateSize(), this.getCrateGridWidth(), 'crate'), width: this.getCrateGridWidth(), size: this.getCrateSize() };
    this.crateInventories.set(crateId, rec);
    return rec;
  }

  private _seedInventoryFromLoot(inv: ItemInventory, loot: LootItem[]): void {
    // Clear and add sequentially
    inv.clearAllItems();
    for (const it of loot) {
      const item = this._toItem(it);
      if (item) inv.addItem(item);
    }
  }

  private _toItem(it: LootItem): BaseItem | null {
    try {
      if (it.type === 'weapon') {
        const { WeaponFactory } = require('../weapons/WeaponFactory');
        return WeaponFactory.create(it.id);
      }
      if (it.type === 'ammo') {
        const { default: AmmoItemFactory } = require('../items/AmmoItemFactory');
        return AmmoItemFactory.create(it.id, it.quantity ?? 30);
      }
      if (it.type === 'medkit') {
        const MedkitItem = require('../items/MedkitItem').default;
        return new MedkitItem();
      }
      return null;
    } catch { return null; }
  }

  // Movement between crate and player containers
  public moveItemBetween(crateId: string, fromType: string, fromIndex: number, toType: string, toIndex: number, player: GamePlayerEntity): boolean {
    const crateRec = this.getOrCreateCrateInventory(crateId);
    const source = this._resolveContainer(fromType, crateRec, player);
    const dest = this._resolveContainer(toType, crateRec, player);
    if (!source || !dest) return false;
    if (toIndex < 0 || toIndex >= dest.size) return false;
    if (fromIndex < 0 || fromIndex >= source.size) return false;
    const item = source.getItemAt(fromIndex);
    if (!item) return false;

    // Remove first so we can allow stacking into dest
    const removed = source.removeItem(fromIndex);
    if (!removed) return false;

    // Ammo-specific behavior: allow multiple stacks; only merge when user drops onto a compatible target slot
    if (removed instanceof BaseAmmoItem) {
      const destItem = dest.getItemAt(toIndex) as BaseItem | null;
      const isCompat = destItem instanceof BaseAmmoItem && destItem.ammoType === (removed as BaseAmmoItem).ammoType;
      if (dest.isEmpty(toIndex)) {
        // place as a separate stack at target if empty
        if (!dest.addItem(removed, toIndex)) { source.addItem(removed, fromIndex); return false; }
        try { source.syncUI(player.player); } catch {}
        try { dest.syncUI(player.player); } catch {}
        return true;
      }
      if (isCompat) {
        // merge into target slot only; remainder must be placed as a new separate stack
        const max = (destItem as any).maxStackSize ?? Infinity;
        const free = Math.max(0, max - (destItem as any).quantity);
        let transferred = 0;
        if (free > 0) {
          transferred = Math.min(free, (removed as any).quantity);
          (destItem as any).adjustQuantity(transferred);
          (removed as any).adjustQuantity(-transferred);
        }
        if ((removed as any).quantity > 0) {
          const empty = this._findFirstEmptySlot(dest);
          if (empty >= 0 && dest.addItem(removed, empty)) {
            try { source.syncUI(player.player); } catch {}
            try { dest.syncUI(player.player); } catch {}
            return true;
          }
          // rollback merge into target
          if (transferred > 0) { (destItem as any).adjustQuantity(-transferred); (removed as any).adjustQuantity(transferred); }
          source.addItem(removed, fromIndex);
          return false;
        }
        // fully merged
        try { source.syncUI(player.player); } catch {}
        try { dest.syncUI(player.player); } catch {}
        return true;
      }
      // not compatible and target occupied → swap as usual
      const swapItem = dest.getItemAt(toIndex);
      if (swapItem) {
        const removedDest = dest.removeItem(toIndex);
        const placed = dest.addItem(removed, toIndex);
        if (!placed) { if (removedDest) dest.addItem(removedDest, toIndex); source.addItem(removed, fromIndex); return false; }
        if (!source.addItem(swapItem, fromIndex) && !source.addItem(swapItem)) {
          dest.removeItem(toIndex); source.addItem(removed, fromIndex); if (removedDest) dest.addItem(removedDest, toIndex); return false;
        }
        try { source.syncUI(player.player); } catch {}
        try { dest.syncUI(player.player); } catch {}
        return true;
      }
      // fallback (shouldn't get here)
      const placed = dest.addItem(removed, toIndex);
      if (!placed) { source.addItem(removed, fromIndex); return false; }
      try { source.syncUI(player.player); } catch {}
      try { dest.syncUI(player.player); } catch {}
      return true;
    }

    // If stackable (non-ammo), perform precise stacking with overflow handling (respect toIndex first)
    if (removed.stackable) {
      const { fullyMerged, applied } = this._mergeStackableInto(dest, removed, toIndex);
      if (fullyMerged) {
        try { source.syncUI(player.player); } catch {}
        try { dest.syncUI(player.player); } catch {}
        return true;
      }
      // Place remainder at target index if empty, else anywhere
      const placedAtTarget = dest.isEmpty(toIndex) && dest.addItem(removed, toIndex);
      const placedAnywhere = placedAtTarget || dest.addItem(removed);
      if (!placedAnywhere) {
        // rollback applied merges
        for (const a of (applied || [])) {
          const stack: any = dest.getItemAt(a.pos);
          if (stack && (stack.constructor === (removed as any).constructor)) {
            stack.adjustQuantity(-a.amount);
          }
        }
        // restore source
        source.addItem(removed, fromIndex);
        return false;
      }
      try { source.syncUI(player.player); } catch {}
      try { dest.syncUI(player.player); } catch {}
      return true;
    }

    // No stack occurred; try exact placement if empty
    if (!dest.isEmpty(toIndex)) {
      // swap
      const swapItem = dest.getItemAt(toIndex);
      if (swapItem) {
        // Remove dest item
        const removedDest = dest.removeItem(toIndex);
        const placed = dest.addItem(removed, toIndex);
        if (!placed) {
          // rollback to original state to avoid item loss
          source.addItem(removed, fromIndex);
          if (removedDest) dest.addItem(removedDest, toIndex);
          return false;
        }
        // place the swapped item back into source
        if (!source.addItem(swapItem, fromIndex)) {
          // if exact placement failed, try best-effort place
          if (!source.addItem(swapItem)) {
            // if cannot place at all, rollback completely
            dest.removeItem(toIndex);
            source.addItem(removed, fromIndex);
            if (removedDest) dest.addItem(removedDest, toIndex);
            return false;
          }
        }
        // ensure both containers reflect latest state for any listening UI
        try { source.syncUI(player.player); } catch {}
        try { dest.syncUI(player.player); } catch {}
        return true;
      }
    }
    // simple move (respect explicit target index)
    const placed = dest.addItem(removed, toIndex);
    if (!placed) {
      // rollback to avoid disappearance
      source.addItem(removed, fromIndex);
      return false;
    }
    try { source.syncUI(player.player); } catch {}
    try { dest.syncUI(player.player); } catch {}
    return true;
  }

  public quickMoveBetween(crateId: string, fromType: string, fromIndex: number, player: GamePlayerEntity): boolean {
    const crateRec = this.getOrCreateCrateInventory(crateId);
    const source = this._resolveContainer(fromType, crateRec, player);
    if (!source) return false;
    const item = source.getItemAt(fromIndex);
    if (!item) return false;
    const removed = source.removeItem(fromIndex);
    if (!removed) return false;
    const tryAdd = (inv: ItemInventory | null): boolean => {
      if (!inv) return false;
      if (removed instanceof BaseAmmoItem) {
        // Always place as a new separate stack if possible; do not auto-merge
        const empty = this._findFirstEmptySlot(inv);
        if (empty >= 0 && inv.addItem(removed, empty)) return true;
        // else try generic add (may merge if user wants that behavior elsewhere)
        return inv.addItem(removed);
      }
      if (removed.stackable) {
        // Merge into compatible stacks first across entire container
        const { fullyMerged } = this._mergeStackableInto(inv, removed);
        if (fullyMerged) return true;
        // Place remainder if any into first empty slot
        const empty = this._findFirstEmptySlot(inv);
        if (empty >= 0 && inv.addItem(removed, empty)) return true;
        return false;
      }
      return inv.addItem(removed);
    };
    let placed = false;
    const targets: string[] = (() => {
      switch ((fromType || '').toLowerCase()) {
        case 'crate': return ['hotbar', 'backpack'];
        case 'backpack': return ['crate', 'hotbar'];
        case 'hotbar': return ['crate', 'backpack'];
        default: return [];
      }
    })();
    for (const t of targets) {
      const dest = this._resolveContainer(t, crateRec, player);
      if (tryAdd(dest)) { placed = true; break; }
    }
    if (!placed) {
      // restore
      source.addItem(removed, fromIndex);
      return false;
    }
    return true;
  }

  // ===== Operation queueing (serialize client actions per player) =====
  public enqueueOp(player: GamePlayerEntity, op: () => void): void {
    const key = String((player?.player?.id) || (player?.player as any)?.username || 'unknown');
    const queue = this._opQueues.get(key) || [];
    queue.push(op);
    this._opQueues.set(key, queue);
    if (!this._opLocks.has(key)) {
      this._drainQueue(key);
    }
  }

  private _drainQueue(key: string): void {
    const queue = this._opQueues.get(key);
    if (!queue || queue.length === 0) return;
    this._opLocks.add(key);
    try {
      while (queue.length > 0) {
        const fn = queue.shift()!;
        try { fn(); } catch {}
      }
    } finally {
      this._opLocks.delete(key);
    }
  }

  // ===== Helpers =====
  private _findFirstEmptySlot(inv: ItemInventory): number {
    for (let i = 0; i < inv.size; i++) {
      if (inv.isEmpty(i)) return i;
    }
    return -1;
  }

  private _mergeStackableInto(dest: ItemInventory, item: BaseItem, preferIndex?: number): { fullyMerged: boolean; applied: Array<{ pos: number; amount: number }>; } {
    const applied: Array<{ pos: number; amount: number }> = [];
    const isCompatibleStack = (stack: any) => stack && (stack.constructor === (item as any).constructor);
    const tryApplyToPosition = (pos: number) => {
      const stack: any = dest.getItemAt(pos);
      if (isCompatibleStack(stack)) {
        const max = (stack as any).maxStackSize ?? Infinity;
        const free = Math.max(0, max - (stack.quantity ?? 0));
        if (free > 0 && (item.quantity ?? 0) > 0) {
          const transfer = Math.min(free, item.quantity);
          stack.adjustQuantity(transfer);
          (item as any).adjustQuantity(-transfer);
          applied.push({ pos, amount: transfer });
        }
      }
    };
    if (preferIndex !== undefined && preferIndex >= 0 && preferIndex < dest.size) tryApplyToPosition(preferIndex);
    for (let i = 0; i < dest.size && (item.quantity ?? 0) > 0; i++) {
      if (i === preferIndex) continue;
      tryApplyToPosition(i);
    }
    return { fullyMerged: (item.quantity ?? 0) === 0, applied };
  }

  private _resolveContainer(type: string, crateRec: { inv: ItemInventory }, player: GamePlayerEntity): ItemInventory | null {
    switch ((type || '').toLowerCase()) {
      case 'crate': return crateRec.inv;
      case 'backpack': return player.gamePlayer.backpack as unknown as ItemInventory;
      case 'hotbar': return player.gamePlayer.hotbar as unknown as ItemInventory;
      default: return null;
    }
  }
}


