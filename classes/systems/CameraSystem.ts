import { PlayerCameraMode } from 'hytopia';
import type GamePlayerEntity from '../GamePlayerEntity';
import type RecoilSystem from './RecoilSystem';

export default class CameraSystem {
  private _player: GamePlayerEntity;
  private _recoilSystem: RecoilSystem;
  private _baseOffset = { x: 0, y: 0.7, z: 0 };
  private _baseFov: number = 90;

  constructor(player: GamePlayerEntity, recoilSystem: RecoilSystem) {
    this._player = player;
    this._recoilSystem = recoilSystem;
  }

  public setup(): void {
    this._player.player.camera.setMode(PlayerCameraMode.FIRST_PERSON);
    this._player.player.camera.setModelHiddenNodes([ 'head', 'neck', 'torso', 'leg_right', 'leg_left' ]);
    this._player.player.camera.setOffset(this._baseOffset);
    this._player.player.camera.setFov(this._baseFov); // Base FOV
  }

  public updateRecoil(): void {
    const cameraRecoil = this._recoilSystem.getCameraRecoil();
    if (cameraRecoil > 0.001) {
      const recoilOffset = cameraRecoil * 0.7;
      
      // Apply recoil offset to base offset
      const finalOffset = {
        x: this._baseOffset.x,
        y: this._baseOffset.y - recoilOffset,
        z: this._baseOffset.z
      };
      
      this._player.player.camera.setOffset(finalOffset);
    } else {
      this._updateCameraSettings();
    }
  }

  public setOffset(offset: { x: number; y: number; z: number }): void {
    this._player.player.camera.setOffset(offset);
  }

  public setFov(fov: number): void {
    this._player.player.camera.setFov(fov);
  }

  public update(): void {
    // No FOV transitions needed without aiming
  }

  public getFacingDirection(): { x: number; y: number; z: number } {
    return this._player.player.camera.facingDirection;
  }

  public getBaseOffset(): { x: number; y: number; z: number } {
    return { ...this._baseOffset };
  }

  public setBaseOffset(offset: { x: number; y: number; z: number }): void {
    this._baseOffset = { ...offset };
    this._updateCameraSettings();
  }

  public setAimingState(isAiming: boolean): void {
    // No-op: aiming is disabled
  }

  private _updateCameraSettings(): void {
    // Keep camera at base FOV
    this._player.player.camera.setFov(this._baseFov);
    this._player.player.camera.setOffset(this._baseOffset);
  }
} 