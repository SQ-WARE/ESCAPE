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
    
    if (this._controller) {
      if (isHealing) {
        this._controller.walkVelocity = this._healingWalkVelocity;
        this._controller.runVelocity = this._healingRunVelocity;
      } else {
        this._controller.walkVelocity = this._baseWalkVelocity;
        this._controller.runVelocity = this._baseRunVelocity;
      }
    }
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
  public getCurrentWalkVelocity(): number { return this._state.isHealing ? this._healingWalkVelocity : this._baseWalkVelocity; }
  public getCurrentRunVelocity(): number { return this._state.isHealing ? this._healingRunVelocity : this._baseRunVelocity; }
  
  public canFireWhileSprinting(weaponCategory: string): boolean { return weaponCategory === 'pistol' || weaponCategory === 'smg'; }
  public getMovementIntensity(): number { const { x, y } = this._state.movementDirection; return Math.sqrt(x * x + y * y); }

  public getCurrentSpeed(): number { return this._entity ? Math.sqrt(this._entity.linearVelocity.x ** 2 + this._entity.linearVelocity.z ** 2) : 0; }
  public getCurrentVelocity(): { x: number; y: number; z: number } { return this._entity ? { ...this._entity.linearVelocity } : { x: 0, y: 0, z: 0 }; }
  public resetMomentum(): void { if (this._entity) { const v = this._entity.linearVelocity; this._entity.setLinearVelocity({ x: 0, y: v.y, z: 0 }); } }
  public getMovementStats() { return { currentSpeed: this.getCurrentSpeed() }; }
} 