import type { Player } from 'hytopia';

export interface RecoilConfig {
  maxRecoil: number;
  recoveryRate: number;
  recoveryDelay: number;
  uiUpdateThreshold: number;
  cameraRecoilMultiplier: number;
  cameraRecoilRecoveryRate: number;
}

export interface RecoilState {
  currentRecoil: number;
  lastRecoilTime: number;
  isRecovering: boolean;
  cameraRecoil: number;
}

export default class RecoilSystem {
  private _config: RecoilConfig;
  private _state: RecoilState;
  private _player: Player;

  constructor(player: Player, config?: Partial<RecoilConfig>) {
    this._player = player;
    this._config = {
      maxRecoil: 0.4,
      recoveryRate: 0.92,
      recoveryDelay: 50,
      uiUpdateThreshold: 0.005,
      cameraRecoilMultiplier: 0.8,
      cameraRecoilRecoveryRate: 0.88,
      ...config
    };

    this._state = {
      currentRecoil: 0,
      lastRecoilTime: 0,
      isRecovering: false,
      cameraRecoil: 0
    };
  }

  public applyRecoil(weaponRecoil: number, hasAmmo: boolean = true): void {
    if (!hasAmmo) {
      return;
    }
    
    const recoilAmount = (weaponRecoil / 100) * this._config.maxRecoil;
    this._state.currentRecoil = Math.min(this._state.currentRecoil + recoilAmount, this._config.maxRecoil);
    this._state.lastRecoilTime = Date.now();
    this._state.isRecovering = false;
    
    const cameraRecoilAmount = recoilAmount * this._config.cameraRecoilMultiplier;
    this._state.cameraRecoil = Math.min(this._state.cameraRecoil + cameraRecoilAmount, this._config.maxRecoil * this._config.cameraRecoilMultiplier);
    
    this._updateUI();
  }

  public updateRecovery(): void {
    const currentTime = Date.now();
    const timeSinceRecoil = currentTime - this._state.lastRecoilTime;
    
    if (timeSinceRecoil > this._config.recoveryDelay && this._state.currentRecoil > 0) {
      this._state.isRecovering = true;
      this._state.currentRecoil *= this._config.recoveryRate;
      
      this._state.cameraRecoil *= this._config.cameraRecoilRecoveryRate;
      
      this._updateUI();
      
      if (this._state.currentRecoil < this._config.uiUpdateThreshold) {
        this._state.currentRecoil = 0;
        this._state.cameraRecoil = 0;
        this._state.isRecovering = false;
      }
    }
  }

  public getCurrentRecoil(): number {
    return this._state.currentRecoil;
  }

  public getMaxRecoil(): number {
    return this._config.maxRecoil;
  }

  public getCameraRecoil(): number {
    return this._state.cameraRecoil;
  }

  public isRecovering(): boolean {
    return this._state.isRecovering;
  }

  public reset(): void {
    this._state.currentRecoil = 0;
    this._state.cameraRecoil = 0;
    this._state.isRecovering = false;
    this._updateUI();
  }

  private _updateUI(): void {
    this._player.ui.sendData({
      type: 'recoil',
      recoil: this._state.currentRecoil,
      maxRecoil: this._config.maxRecoil,
      cameraRecoil: this._state.cameraRecoil
    });
  }
} 