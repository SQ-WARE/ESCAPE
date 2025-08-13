import {
  Entity,
  Quaternion,
  World,
  type Vector3Like,
  type QuaternionLike,
  type ModelEntityOptions,
} from 'hytopia';

import type { WeaponData } from '../data/WeaponData';
import GamePlayerEntity from '../../GamePlayerEntity';
import GamePlayer from '../../GamePlayer';
import WeaponShootingSystem from '../../systems/WeaponShootingSystem';
import WeaponReloadSystem from '../../systems/WeaponReloadSystem';
import WeaponEffectsSystem from '../../systems/WeaponEffectsSystem';
import WeaponUISystem from '../../systems/WeaponUISystem';
import WeaponItem from '../items/WeaponItem';

export type WeaponHand = 'left' | 'right' | 'both';

export interface WeaponEntityOptions extends ModelEntityOptions {
  weaponData: WeaponData;
  parent?: GamePlayerEntity;
  ammo?: number;
  heldHand?: WeaponHand;
}

export default class WeaponEntity extends Entity {
  private readonly _weaponData: WeaponData;
  private readonly _scopeZoom: number;
  private readonly _shootAnimation: string;
  private readonly _idleAnimation: string;
  private readonly _heldHand: WeaponHand;

  // Modular systems
  private _shootingSystem: WeaponShootingSystem;
  private _reloadSystem: WeaponReloadSystem;
  private _effectsSystem: WeaponEffectsSystem;
  private _uiSystem: WeaponUISystem;

  public constructor(options: WeaponEntityOptions) {
    const weaponData = options.weaponData;
    const heldHand = options.heldHand ?? 
      WeaponEntity._getDefaultHandForCategory(weaponData.category);
    
    const parentNodeName = WeaponEntity._getHandAnchorNode(heldHand);
    
    super({
      ...options,
      modelUri: weaponData.assets.models.held,
      modelScale: weaponData.assets.models.scale,
    });

    this._weaponData = weaponData;
    this._scopeZoom = weaponData.behavior.scopeZoom ?? 1;
    this._heldHand = heldHand;
    this._shootAnimation = this._getShootAnimationForHand(heldHand);
    this._idleAnimation = this._getIdleAnimationForHand(heldHand);

    // Initialize modular systems
    this._uiSystem = new WeaponUISystem(weaponData);
    this._shootingSystem = new WeaponShootingSystem(weaponData, this._uiSystem);
    this._reloadSystem = new WeaponReloadSystem(weaponData, options.ammo ?? 0);
    this._effectsSystem = new WeaponEffectsSystem(weaponData, this);
  }

  // Getters
  public get isEquipped(): boolean { 
    return !!this.parent; 
  }

  public get weaponData(): WeaponData {
    return this._weaponData;
  }

  public get damage(): number {
    return this._shootingSystem.damage;
  }

  public get fireRate(): number {
    return this._shootingSystem.fireRate;
  }

  public get maxAmmo(): number {
    return this._reloadSystem.maxAmmo;
  }

  public get range(): number {
    return this._shootingSystem.range;
  }

  public get reloadTime(): number {
    return this._reloadSystem.reloadTime;
  }

  public get scopeZoom(): number {
    return this._scopeZoom;
  }

  public get ammoType(): string {
    return this._reloadSystem.ammoType;
  }

  public get shootAnimation(): string {
    return this._shootAnimation;
  }

  public get idleAnimation(): string {
    return this._idleAnimation;
  }

  public get iconImageUri(): string {
    return this._weaponData.assets.ui.icon;
  }

  public get heldHand(): WeaponHand {
    return this._heldHand;
  }

  public getMuzzleFlashPositionRotation(): { position: Vector3Like, rotation: QuaternionLike } {
    // Use weapon-specific muzzle flash position if defined, otherwise use defaults
    const defaultPosition = { x: 0, y: 0.03, z: -1.2 };
    const defaultRotation = { x: 0, y: 0, z: 0, w: 1 };
    
    if (this._weaponData.assets.effects?.muzzleFlash) {
      return {
        position: this._weaponData.assets.effects.muzzleFlash.position,
        rotation: this._weaponData.assets.effects.muzzleFlash.rotation
      };
    }
    
    return {
      position: defaultPosition,
      rotation: defaultRotation
    };
  }

  public get ammo(): number {
    return this._reloadSystem.ammo;
  }

  public cancelReload(): void {
    if (this._reloadSystem.isReloading) {
      this._reloadSystem.cancelReload(this.parent as GamePlayerEntity);
    }
  }

  public get isReloading(): boolean {
    return this._reloadSystem.isReloading;
  }

  public canShoot(): boolean {
    // Check if weapon has ammo and is not on cooldown
    return this._reloadSystem.ammo > 0 && this._shootingSystem.canShoot();
  }

  // Core weapon methods
  public equip(): void {
    if (!this.parent) {
      console.error('WeaponEntity.equip(): No parent entity found');
      return;
    }
    
    const weaponPosition = this._weaponData.assets.models.position;
    const weaponRotation = this._weaponData.assets.models.rotation;
    
    this.setPosition(weaponPosition);
    this.setRotation(weaponRotation);
    // Sway system removed
    
    this._uiSystem.updateWeaponInfo(this.parent as GamePlayerEntity);
    this._uiSystem.updateAmmoIndicator(this.parent as GamePlayerEntity, this._reloadSystem.ammo, this._reloadSystem.isReloading);
    this._uiSystem.hideReloadPrompt(this.parent as GamePlayerEntity);
    this._uiSystem.updateFireRateIndicator(this.parent as GamePlayerEntity, this._reloadSystem.ammo);
  }

  public unequip(): void {
    // Cancel any ongoing reload
    if (this._reloadSystem.isReloading) {
      this._reloadSystem.cancelReload(this.parent as GamePlayerEntity);
    }
    
    this._uiSystem.hideReloadProgress(this.parent as GamePlayerEntity);
    this._uiSystem.updateWeaponInfo(this.parent as GamePlayerEntity);
    this._effectsSystem.cleanup();
  }

  public override spawn(world: World, position: Vector3Like, rotation?: QuaternionLike): void {
    super.spawn(world, position, rotation);
  }

  public override despawn(): void {
    this._effectsSystem.cleanup();
    super.despawn();
  }

  public getQuantity(): number {
    return 1;
  }

  public reload(): void {
    if (!this.parent) return;
    
    const parentPlayerEntity = this.parent as GamePlayerEntity;
    const player = parentPlayerEntity.player;
    const gamePlayer = (player as any).gamePlayer || GamePlayer.getOrCreate(player);
    
    if (gamePlayer) {
      this._reloadSystem.reload(parentPlayerEntity);
    }
  }

  public shoot(): void {
    if (!this.parent) return;

    // Check if inventory is open or player is in menu - don't allow shooting
    const parentPlayerEntity = this.parent as GamePlayerEntity;
    const player = parentPlayerEntity.player;
    const gamePlayer = (player as any).gamePlayer || GamePlayer.getOrCreate(player);
    
    if (gamePlayer && (gamePlayer.isBackpackOpen || gamePlayer.isInMenu || (gamePlayer as any).isCrateOpen)) {
      return; // Don't shoot if inventory is open or player is in menu
    }

    if (this._reloadSystem.ammo > 0) {
      this._reloadSystem.ammo--;
      
      const parentPlayerEntity = this.parent as GamePlayerEntity;
      const player = parentPlayerEntity.player;
      const gamePlayer = (player as any).gamePlayer || GamePlayer.getOrCreate(player);
      
      if (gamePlayer) {
        // Save ammo data
        this._saveAmmoData(gamePlayer);
      }

      // Perform shooting
      if (this._shootingSystem.shoot(parentPlayerEntity)) {
        // Play effects
        parentPlayerEntity.startModelOneshotAnimations([this._shootAnimation]);
        this._uiSystem.playShootSound(parentPlayerEntity);
        this._effectsSystem.createMuzzleFlash(parentPlayerEntity);
        this._effectsSystem.createShotLight(parentPlayerEntity);
        this._effectsSystem.applyWeaponRecoil(parentPlayerEntity);
        
        // Update UI
        this._uiSystem.updateAmmoIndicator(parentPlayerEntity, this._reloadSystem.ammo, this._reloadSystem.isReloading);
        this._uiSystem.updateFireRateIndicator(parentPlayerEntity, this._reloadSystem.ammo);
        this._uiSystem.setLastFireTime(this._shootingSystem.lastFireTime);
      }
    } else {
      this._uiSystem.showReloadPrompt(this.parent as GamePlayerEntity);
    }
  }

  public zoomScope(reset: boolean = false): void {
    if (!this.parent) return;
    
    const playerEntity = this.parent as GamePlayerEntity;
    const currentZoom = playerEntity.player.camera.zoom;
    const zoom = currentZoom === 1 ? this._scopeZoom : 1;
    
    playerEntity.player.camera.setZoom(zoom);
    this._uiSystem.updateScopeZoom(playerEntity, zoom);
  }

  public setParentAnimations(): void {
    if (!this.parent) return;

    const playerController = this.parent.controller as any;
    if (playerController) {
      playerController.idleLoopedAnimations = [this._idleAnimation, 'idle_lower'];
      playerController.walkLoopedAnimations = [this._idleAnimation, 'walk_lower'];
      playerController.runLoopedAnimations = [this._idleAnimation, 'run_lower'];
    }
  }

  public updateAmmoIndicatorUI(reloading: boolean = false): void {
    if (!this.parent) return;
    this._uiSystem.updateAmmoIndicator(this.parent as GamePlayerEntity, this._reloadSystem.ammo, reloading);
  }

  public updateFireRateIndicator(): void {
    if (!this.parent) return;
    this._uiSystem.updateFireRateIndicator(this.parent as GamePlayerEntity, this._reloadSystem.ammo);
  }

  // Sway system removed

  // AnimationSpeedSystem removed

  // Static helper methods
  private static _getDefaultHandForCategory(category: string): WeaponHand {
    switch (category) {
      case 'pistol':
      case 'smg':
        return 'right';
      case 'rifle':
      case 'sniper':
      case 'lmg':
      case 'shotgun':
        return 'both';
      default:
        return 'right';
    }
  }

  private static _getHandAnchorNode(heldHand: WeaponHand): string {
    return heldHand === 'left' ? 'hand_left_anchor' : 'hand_right_anchor';
  }

  private _getShootAnimationForHand(heldHand: WeaponHand): string {
    switch (heldHand) {
      case 'left':
        return 'shoot_gun_left';
      case 'right':
        return 'shoot_gun_right';
      case 'both':
        return 'shoot_gun_both';
      default:
        return 'shoot_gun_right';
    }
  }

  private _getIdleAnimationForHand(heldHand: WeaponHand): string {
    switch (heldHand) {
      case 'left':
        return 'idle_gun_left';
      case 'right':
        return 'idle_gun_right';
      case 'both':
        return 'idle_gun_both';
      default:
        return 'idle_gun_right';
    }
  }

  private _saveAmmoData(gamePlayer: any): void {
    for (let i = 0; i < gamePlayer.hotbar.size; i++) {
      const item = gamePlayer.hotbar.getItemAt(i);
      if (item && item instanceof WeaponItem && item.weaponData.id === this._weaponData.id) {
        item.setPersistedAmmo(this._reloadSystem.ammo);
        gamePlayer.save();
        return;
      }
    }

    for (let i = 0; i < gamePlayer.backpack.size; i++) {
      const item = gamePlayer.backpack.getItemAt(i);
      if (item && item instanceof WeaponItem && item.weaponData.id === this._weaponData.id) {
        item.setPersistedAmmo(this._reloadSystem.ammo);
        gamePlayer.save();
        return;
      }
    }
  }
} 