import type { DefaultPlayerEntityController } from 'hytopia';

export interface MovementState {
  isSprinting: boolean;
  isMoving: boolean;
  movementDirection: { x: number; y: number };
  isHealing: boolean;
}

export default class MovementSystem {
  private _state: MovementState;
  private _controller: DefaultPlayerEntityController | null = null;
  private _entity: any = null;
  
  private _baseWalkVelocity = 4.2;
  private _baseRunVelocity = 6.0;
  private _healingWalkVelocity = 1.8;
  private _healingRunVelocity = 2.5;


  constructor() {
    this._state = {
      isSprinting: false,
      isMoving: false,
      movementDirection: { x: 0, y: 0 },
      isHealing: false
    };
  }

  public setupController(controller: DefaultPlayerEntityController, entity?: any): void {
    this._controller = controller;
    this._entity = entity;
    
    controller.walkVelocity = this._baseWalkVelocity;
    controller.runVelocity = this._baseRunVelocity;
    controller.jumpVelocity = 8.0;
    
    if (this._entity) {
      this._entity.setCcdEnabled(true);
    }
  }

  public setHealingState(isHealing: boolean): void {
    if (this._state.isHealing === isHealing) return;
    
    this._state.isHealing = isHealing;
    this._updateVelocity();
  }



  private _updateVelocity(): void {
    if (!this._controller) return;
    
    let walkVelocity = this._baseWalkVelocity;
    let runVelocity = this._baseRunVelocity;
    
    // Apply healing penalty
    if (this._state.isHealing) {
      walkVelocity = this._healingWalkVelocity;
      runVelocity = this._healingRunVelocity;
    }
    
    this._controller.walkVelocity = walkVelocity;
    this._controller.runVelocity = runVelocity;
  }

  public updateMovement(input: Partial<Record<string | number | symbol, boolean>>): MovementState {
    if (!this._controller || !this._entity) return this._state;

    const movementX = input.a || input.d ? (input.a ? -1 : 1) : 0;
    const movementY = input.w || input.s ? (input.w ? 1 : -1) : 0;
    
    this._state.isSprinting = input.sh || false;
    this._state.isMoving = Math.abs(movementX) > 0 || Math.abs(movementY) > 0;
    this._state.movementDirection = { x: movementX, y: movementY };
    
    return this._state;
  }

  public isSprinting(): boolean { return this._state.isSprinting; }
  public isMoving(): boolean { return this._state.isMoving; }
  public isHealing(): boolean { return this._state.isHealing; }

  public getMovementDirection(): { x: number; y: number } { return { ...this._state.movementDirection }; }
  public getCurrentWalkVelocity(): number { 
    if (this._state.isHealing) return this._healingWalkVelocity;
    return this._baseWalkVelocity;
  }
  public getCurrentRunVelocity(): number { 
    if (this._state.isHealing) return this._healingRunVelocity;
    return this._baseRunVelocity;
  }
  
  public canFireWhileSprinting(weaponCategory: string): boolean { 
    // Allow pistols, SMGs, and rifles to fire while sprinting
    // Snipers cannot fire while sprinting (realistic)
    return weaponCategory === 'pistol' || weaponCategory === 'smg' || weaponCategory === 'rifle'; 
  }
  public getMovementIntensity(): number { const { x, y } = this._state.movementDirection; return Math.sqrt(x * x + y * y); }

  public getCurrentSpeed(): number { return this._entity ? Math.sqrt(this._entity.linearVelocity.x ** 2 + this._entity.linearVelocity.z ** 2) : 0; }
  public getCurrentVelocity(): { x: number; y: number; z: number } { return this._entity ? { ...this._entity.linearVelocity } : { x: 0, y: 0, z: 0 }; }
  public resetMomentum(): void { if (this._entity) { const v = this._entity.linearVelocity; this._entity.setLinearVelocity({ x: 0, y: v.y, z: 0 }); } }
  public getMovementStats() { 
    return { 
      currentSpeed: this.getCurrentSpeed(),
      accuracyModifier: this.getAccuracyModifier(),
      recoilModifier: this.getRecoilModifier(),
      isSprinting: this._state.isSprinting,
      isMoving: this._state.isMoving,
      isHealing: this._state.isHealing
    }; 
  }

  /**
   * Get accuracy modifier based on current movement state
   * Returns a multiplier where 1.0 = normal accuracy, 0.5 = 50% accuracy, etc.
   */
  public getAccuracyModifier(): number {
    let modifier = 1.0;
    
    // Sprinting penalty (highest priority)
    if (this._state.isSprinting) {
      modifier *= 0.4; // 60% accuracy reduction while sprinting
    }
    // Moving penalty
    else if (this._state.isMoving) {
      modifier *= 0.7; // 30% accuracy reduction while moving
    }
    

    
    // Healing penalty
    if (this._state.isHealing) {
      modifier *= 0.6; // 40% accuracy reduction while healing
    }
    
    return Math.max(0.1, Math.min(2.0, modifier)); // Clamp between 10% and 200%
  }

  /**
   * Get spread modifier (inverse of accuracy)
   * Returns a multiplier where 1.0 = normal spread, 0.5 = 50% spread, etc.
   */
  public getSpreadModifier(): number {
    return 1.0 / this.getAccuracyModifier();
  }

  /**
   * Get recoil modifier based on movement state
   */
  public getRecoilModifier(): number {
    let modifier = 1.0;
    
    // Enhanced recoil control for different scenarios
    if (this._state.isSprinting) {
      // Reduced recoil while sprinting for better control
      modifier *= 1.5; // 50% more recoil while sprinting (reduced from 100%)
    }
    // Increased recoil while moving
    else if (this._state.isMoving) {
      modifier *= 1.2; // 20% more recoil while moving (reduced from 30%)
    }
    

    
    // Increased recoil while healing
    if (this._state.isHealing) {
      modifier *= 1.3; // 30% more recoil while healing (reduced from 40%)
    }
    
    return Math.max(0.3, Math.min(2.5, modifier)); // Clamp between 30% and 250%
  }
} 