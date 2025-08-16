import type GamePlayerEntity from '../GamePlayerEntity';

const BASE_FOV = 90;
const SPRINT_FOV = 95;
const FOV_TRANSITION_SPEED = 0.1;

export default class FOVSystem {
  private _player: GamePlayerEntity;
  private _currentFov: number = BASE_FOV;
  private _targetFov: number = BASE_FOV;
  private _lastSprintState: boolean = false;

  constructor(player: GamePlayerEntity) {
    this._player = player;
  }

  public update(isSprinting: boolean): void {
    this._targetFov = isSprinting ? SPRINT_FOV : BASE_FOV;

    const fovDifference = this._targetFov - this._currentFov;
    if (Math.abs(fovDifference) > 0.1) {
      this._currentFov += fovDifference * FOV_TRANSITION_SPEED;
    } else {
      this._currentFov = this._targetFov;
    }

    if (this._player.playerController) {
      this._player.player.camera.setFov(this._currentFov);
    }

    if (isSprinting !== this._lastSprintState) {
      this._lastSprintState = isSprinting;
    }
  }

  public get currentFov(): number {
    return this._currentFov;
  }

  public get targetFov(): number {
    return this._targetFov;
  }

  public reset(): void {
    this._currentFov = BASE_FOV;
    this._targetFov = BASE_FOV;
    this._lastSprintState = false;
  }
} 