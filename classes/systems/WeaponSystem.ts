import type GamePlayerEntity from '../GamePlayerEntity';
import type MovementSystem from './MovementSystem';

const UNARMED_ANIMATIONS = {
  IDLE: ['idle_lower'],
  WALK: ['walk_lower'],
  RUN: ['run_lower']
};

const ARMED_ANIMATIONS = {
  IDLE: ['idle_lower', 'idle_upper'],
  WALK: ['walk_lower'],
  RUN: ['run_lower']
};

export default class WeaponSystem {
  private _player: GamePlayerEntity;
  private _movementSystem: MovementSystem;

  constructor(player: GamePlayerEntity, movementSystem: MovementSystem) {
    this._player = player;
    this._movementSystem = movementSystem;
  }

  // Updated to handle the correct input type from event payload
  public updateWeapon(input: Partial<Record<string | number | symbol, boolean>>): void {
    const currentWeapon = this._player.gamePlayer.getCurrentWeapon();
    
    if (currentWeapon) {
      this._updateWeaponState(currentWeapon, input);
    } else {
      this._resetToUnarmedState();
    }
  }

  private _updateWeaponState(weapon: any, input: Partial<Record<string | number | symbol, boolean>>): void {
    // Update weapon indicators
    weapon.updateFireRateIndicator();
    
    // Get movement state
    const movementInput = this._movementSystem.getMovementDirection();
    const isAiming = input.z || input.mr;
    const isSprinting = this._movementSystem.isSprinting();
    const isMoving = this._movementSystem.isMoving();
    
    // Update weapon effects (animation speed system removed)
    
    // Handle sprint warnings
    this._updateSprintWarning(weapon, isSprinting);
    
    // Update crosshair state
    this._updateCrosshairState(true);
  }

  private _resetToUnarmedState(): void {
    this._resetToUnarmedAnimations();
    this._updateSprintWarning(null, false);
    this._updateCrosshairState(false);
  }

  private _updateSprintWarning(weapon: any, isSprinting: boolean): void {
    if (weapon && isSprinting && !this._movementSystem.canFireWhileSprinting(weapon.weaponData.category)) {
      this._player.player.ui.sendData({
        type: 'sprint-warning',
        show: true,
        message: `Cannot fire ${weapon.weaponData.name} while sprinting!`
      });
    } else {
      this._player.player.ui.sendData({
        type: 'sprint-warning',
        show: false
      });
    }
  }

  private _updateCrosshairState(canFire: boolean): void {
    this._player.player.ui.sendData({
      type: 'crosshair-state',
      canFire: canFire
    });
  }

  private _resetToUnarmedAnimations(): void {
    this._player.playerController.idleLoopedAnimations = UNARMED_ANIMATIONS.IDLE;
    this._player.playerController.walkLoopedAnimations = UNARMED_ANIMATIONS.WALK;
    this._player.playerController.runLoopedAnimations = UNARMED_ANIMATIONS.RUN;
  }

  public canFireWeapon(weapon: any): boolean {
    if (!weapon) return false;
    
    if (this._movementSystem.isSprinting() && !this._movementSystem.canFireWhileSprinting(weapon.weaponData.category)) {
      return false;
    }
    
    return true;
  }

  public getCurrentWeapon(): any {
    return this._player.gamePlayer.getCurrentWeapon();
  }
} 