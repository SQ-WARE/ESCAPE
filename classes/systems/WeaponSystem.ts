import type GamePlayerEntity from '../GamePlayerEntity';
import type MovementSystem from './MovementSystem';

import type WeaponEntity from '../weapons/entities/WeaponEntity';

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

  private _lastSprintWarningState: boolean | null = null;

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

  // Call this when switching weapons to ensure clean state
  public onWeaponSwitch(): void {
    // Reset crosshair state when switching weapons
    this._resetCrosshairState();
  }

  private _updateWeaponState(weapon: WeaponEntity, input: Partial<Record<string | number | symbol, boolean>>): void {
    weapon.updateFireRateIndicator();
    
    this._updateSprintWarning(weapon, this._movementSystem.isSprinting());
    this._updateCrosshairState(true, weapon);
  }

  private _resetToUnarmedState(): void {
    this._resetToUnarmedAnimations();
    this._updateSprintWarning(null, false);
    this._resetCrosshairState();
  }

  private _resetCrosshairState(): void {
    // Force reset all crosshair data when switching weapons or going unarmed
    this._lastCrosshairData = null;
    this._lastEnemyHoverCheck = 0;
    this._player.player.ui.sendData({ 
      type: 'crosshair-state', 
      canFire: false, 
      weaponCategory: 'pistol',
      enemyHover: false 
    });
  }

  private _updateSprintWarning(weapon: any, isSprinting: boolean): void {
    const shouldShowWarning = weapon && isSprinting && !this._movementSystem.canFireWhileSprinting(weapon.weaponData.category);
    
    if (this._lastSprintWarningState !== shouldShowWarning) {
      this._lastSprintWarningState = shouldShowWarning;
      this._player.player.ui.sendData({
        type: 'sprint-warning',
        show: shouldShowWarning,
        message: shouldShowWarning ? `Cannot fire ${weapon.weaponData.name} while sprinting!` : ''
      });
    }
  }

  private _lastCrosshairData: { canFire: boolean; weaponCategory: string; enemyHover: boolean } | null = null;
  private _lastEnemyHoverCheck: number = 0;

  private _updateCrosshairState(canFire: boolean, weapon?: any): void {
    // Throttle enemy hover checks to avoid performance issues and false positives
    const now = Date.now();
    let enemyHover = false;
    
    // Only check for enemy hover every 100ms to reduce false positives
    if (now - this._lastEnemyHoverCheck > 100) {
      enemyHover = this._checkEnemyHover();
      this._lastEnemyHoverCheck = now;
    } else {
      // Use previous state if we're throttling, but reset if weapon changed
      const weaponChanged = this._lastCrosshairData && 
        this._lastCrosshairData.weaponCategory !== (weapon?.weaponData?.category || 'pistol');
      
      if (weaponChanged) {
        // Reset enemy hover state when switching weapons
        enemyHover = false;
        this._lastEnemyHoverCheck = 0; // Force next check to be immediate
      } else {
        enemyHover = this._lastCrosshairData?.enemyHover || false;
      }
    }
    
    const newData = { 
      canFire, 
      weaponCategory: weapon?.weaponData?.category || 'pistol',
      enemyHover
    };
    
    if (!this._lastCrosshairData || 
        this._lastCrosshairData.canFire !== canFire ||
        this._lastCrosshairData.weaponCategory !== newData.weaponCategory ||
        this._lastCrosshairData.enemyHover !== enemyHover) {
      
      this._lastCrosshairData = newData;
      this._player.player.ui.sendData({ type: 'crosshair-state', ...newData });
    }
  }

  private _checkEnemyHover(): boolean {
    // Only check for enemy hover if player is in a session (not in lobby/menu)
    if (!this._player.world || this._player.gamePlayer.isInMenu) return false;
    
    try {
      const raycastResult = this._player.world.simulation.raycast(
        this._player.position,
        this._player.player.camera.facingDirection,
        50, // Reduced to 50 meter range for more precision
        {
          filterExcludeRigidBody: this._player.rawRigidBody,
        }
      );

      if (raycastResult?.hitEntity) {
        const hitEntity = raycastResult.hitEntity as any;
        
        // Very strict enemy player detection - only highlight actual enemy players
        if (hitEntity && 
            hitEntity.constructor.name === 'GamePlayerEntity' &&
            hitEntity.player && 
            hitEntity.gamePlayer &&
            hitEntity.player.id !== this._player.player.id &&
            !hitEntity.isDead &&
            hitEntity.player.world === this._player.player.world) { // Same world check
          
          // Additional check to ensure it's actually an enemy (not teammate)
          // For now, treat all other players as potential enemies
          return true;
        }
      }
    } catch (error) {
      // Silently handle any raycast errors
    }
    
    return false;
  }

  private _resetToUnarmedAnimations(): void {
    this._player.playerController.idleLoopedAnimations = UNARMED_ANIMATIONS.IDLE;
    this._player.playerController.walkLoopedAnimations = UNARMED_ANIMATIONS.WALK;
    this._player.playerController.runLoopedAnimations = UNARMED_ANIMATIONS.RUN;
  }

  public canFireWeapon(weapon: any): boolean {
    if (!weapon) return false;
    
    // Check sprint restrictions
    if (this._movementSystem.isSprinting() && !this._movementSystem.canFireWhileSprinting(weapon.weaponData.category)) {
      return false;
    }
    
    return true;
  }



  public getWeaponAccuracyModifier(weapon: any): number {
    if (!weapon) return 1.0;
    
    let modifier = this._movementSystem.getAccuracyModifier();
    const category = weapon.weaponData?.category;
    
    if (category && this._movementSystem.isMoving() && !this._movementSystem.isSprinting()) {
      modifier *= category === 'rifle' ? 0.9 : category === 'smg' ? 1.15 : 1.0;
    }
    
    return Math.max(0.1, Math.min(3.0, modifier));
  }

  public getWeaponRecoilModifier(weapon: any): number {
    if (!weapon) return 1.0;
    
    let modifier = this._movementSystem.getRecoilModifier();
    const category = weapon.weaponData?.category;
    
    if (category && this._movementSystem.isMoving() && !this._movementSystem.isSprinting()) {
      modifier *= category === 'rifle' ? 0.95 : 1.0;
    }
    
    return Math.max(0.3, Math.min(2.0, modifier));
  }

} 