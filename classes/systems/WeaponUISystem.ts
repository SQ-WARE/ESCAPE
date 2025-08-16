import {
  Audio,
} from 'hytopia';

import type { WeaponData } from '../weapons/data/WeaponData';
import GamePlayerEntity from '../GamePlayerEntity';
import GamePlayer from '../GamePlayer';

export default class WeaponUISystem {
  private readonly _weaponData: WeaponData;
  private readonly _fireRate: number;

  private _shootAudio: Audio;
  private _lastFireTime: number = 0;

  constructor(weaponData: WeaponData) {
    this._weaponData = weaponData;
    this._fireRate = weaponData.stats.fireRate;

    this._shootAudio = new Audio({
      uri: weaponData.assets.audio.shoot,
      volume: 0.3,
      referenceDistance: 8,
      cutoffDistance: 100,
    });
  }

  public updateAmmoIndicator(parent: GamePlayerEntity, ammo: number, reloading: boolean = false): void {
    if (!parent || !parent.world) {
      return;
    }

    const player = parent.player;
    const gamePlayer = (player as any).gamePlayer || GamePlayer.getOrCreate(player);
    
    let totalAmmo = 0;
    if (gamePlayer) {
      totalAmmo = this._getAvailableAmmoFromInventory(gamePlayer);
    }
    
    const shouldShowReloading = reloading && totalAmmo > 0;
    
    parent.player.ui.sendData({
      type: 'ammo-indicator',
      show: true,
      ammo: ammo,
      maxAmmo: this._weaponData.stats.magazineSize,
      totalAmmo: totalAmmo,
      ammoType: this._weaponData.behavior.ammoType,
      reloading: shouldShowReloading,
    });
  }

  public updateFireRateIndicator(parent: GamePlayerEntity, ammo: number): void {
    if (!parent || !parent.world) {
      return;
    }

    const player = parent.player;
    
    const now = performance.now();
    const cooldown = 60000 / this._fireRate;
    const canFire = !this._lastFireTime || (now - this._lastFireTime) >= cooldown;
    
    player.ui.sendData({
      type: 'crosshair-state',
      canFire: canFire && ammo > 0
    });
  }

  public updateWeaponInfo(parent: GamePlayerEntity): void {
    if (!parent || !parent.world) {
      return;
    }

    parent.player.ui.sendData({
      type: 'weapon',
      name: this._weaponData.name,
      iconImageUri: this._weaponData.assets.ui.icon,
    });
  }

  public showReloadPrompt(parent: GamePlayerEntity): void {
    if (parent) {
      parent.player.ui.sendData({
        type: 'reload-prompt',
        show: true
      });
    }
  }

  public hideReloadPrompt(parent: GamePlayerEntity): void {
    if (parent) {
      parent.player.ui.sendData({
        type: 'reload-prompt',
        show: false
      });
    }
  }

  public hideReloadProgress(parent: GamePlayerEntity): void {
    if (parent) {
      parent.player.ui.sendData({
        type: 'reload-progress',
        show: false
      });
    }
  }

  public playHitmarker(parent: GamePlayerEntity, hit: boolean, kill: boolean = false): void {
    if (!parent || !parent.world) return;
    
    if (hit) {
      try {
        const UnifiedAudioSystem = require('./UnifiedAudioSystem').default;
        const world = parent.world!;
        const sys = ((world as any).audioSystem ?? ((world as any).audioSystem = new UnifiedAudioSystem(world)));
        sys.playSfx('audio/sfx/sfx/hitmarker.wav', { 
          volume: 0.7,
          x: parent.position.x, 
          y: parent.position.y, 
          z: parent.position.z 
        });
      } catch (error) {
        console.warn('Failed to play hitmarker sound:', error);
      }
      
      parent.player.ui.sendData({
        type: 'hitmarker',
        hit: true,
        kill: kill,
        duration: kill ? 500 : 200,
        intensity: kill ? 1.0 : 0.8
      });
    }
  }

  public playShootSound(parent: GamePlayerEntity): void {
    if (!parent || !parent.world) return;
    try {
      const UnifiedAudioSystem = require('./UnifiedAudioSystem').default;
      const world = parent.world!;
      const sys = ((world as any).audioSystem ?? ((world as any).audioSystem = new UnifiedAudioSystem(world)));
      sys.playSfx(this._weaponData.assets.audio.shoot, { volume: 0.3, x: parent.position.x, y: parent.position.y, z: parent.position.z, ref: 8, cut: 100 });
    } catch {
      // Fallback direct play
      this._shootAudio.play(parent.world, true);
    }
  }

  public playEnvironmentHitSound(parent: GamePlayerEntity): void {
    if (!parent || !parent.world) return;
    try {
      const UnifiedAudioSystem = require('./UnifiedAudioSystem').default;
      const world = parent.world!;
      const sys = ((world as any).audioSystem ?? ((world as any).audioSystem = new UnifiedAudioSystem(world)));
      sys.playSfx('audio/sfx/ui/button-click.mp3', { volume: 0.2, x: parent.position.x, y: parent.position.y, z: parent.position.z });
    } catch {
      const environmentHitAudio = new Audio({ uri: 'audio/sfx/ui/button-click.mp3', loop: false, volume: 0.2 });
      environmentHitAudio.play(parent.world, true);
    }
  }

  public updateScopeZoom(parent: GamePlayerEntity, scopeZoom: number): void {
    if (!parent || !parent.world) return;
    
    parent.player.ui.sendData({
      type: 'scope-zoom',
      zoom: scopeZoom,
    });
  }

  public setLastFireTime(time: number): void {
    this._lastFireTime = time;
  }

  public get lastFireTime(): number {
    return this._lastFireTime;
  }

  public get fireRate(): number {
    return this._fireRate;
  }

  private _getAvailableAmmoFromInventory(gamePlayer: any): number {
    let totalAmmo = 0;

    for (let i = 0; i < gamePlayer.hotbar.size; i++) {
      const item = gamePlayer.hotbar.getItemAt(i);
      if (item && this._isAmmoItemForWeapon(item)) {
        totalAmmo += item.quantity;
      }
    }

    for (let i = 0; i < gamePlayer.backpack.size; i++) {
      const item = gamePlayer.backpack.getItemAt(i);
      if (item && this._isAmmoItemForWeapon(item)) {
        totalAmmo += item.quantity;
      }
    }

    return totalAmmo;
  }

  private _isAmmoItemForWeapon(item: any): boolean {
    if (!item) return false;
    
    const isAmmoItem = item.ammoType && 
      item.constructor.name !== 'WeaponItem' && 
      (item.constructor.name === 'PistolAmmoItem' || 
       item.constructor.name === 'RifleAmmoItem' || 
       item.constructor.name === 'SniperAmmoItem' ||
       item.constructor.name === 'ShotgunAmmoItem' ||
       item.name === '9×19mm Parabellum' ||
       item.name === '7.62×39mm' ||
       item.name === '12.7×108mm' ||
       item.name === '12 Gauge Shells');
    
    const hasCorrectAmmoType = item.ammoType === this._weaponData.behavior.ammoType;
    
    return isAmmoItem && hasCorrectAmmoType;
  }
} 