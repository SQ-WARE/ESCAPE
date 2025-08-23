import type { Player } from 'hytopia';

export default class InputHandler {
  private static _instance: InputHandler | null = null;
  private _isEnabled: boolean = true;
  private _currentWeaponId: string | null = null;
  private _currentWeaponCategory: string | null = null;
  private _isRightMouseDown: boolean = false;
  private _isLeftMouseDown: boolean = false;

  constructor() {}

  public static getInstance(): InputHandler {
    if (!InputHandler._instance) {
      InputHandler._instance = new InputHandler();
    }
    return InputHandler._instance;
  }

  public setCurrentWeapon(weaponId: string, weaponCategory: string): void {
    this._currentWeaponId = weaponId;
    this._currentWeaponCategory = weaponCategory;
  }

  public clearCurrentWeapon(): void {
    this._currentWeaponId = null;
    this._currentWeaponCategory = null;
  }

  public onRightMouseDown(): void {
    // No-op: aiming is disabled
  }

  public onRightMouseUp(): void {
    // No-op: aiming is disabled
  }

  public onLeftMouseDown(): void {
    if (!this._isEnabled) return;
    this._isLeftMouseDown = true;
  }

  public onLeftMouseUp(): void {
    if (!this._isEnabled) return;
    this._isLeftMouseDown = false;
  }

  public isRightMouseDown(): boolean {
    return this._isRightMouseDown;
  }

  public isLeftMouseDown(): boolean {
    return this._isLeftMouseDown;
  }

  public setEnabled(enabled: boolean): void {
    this._isEnabled = enabled;
  }

  public isEnabled(): boolean {
    return this._isEnabled;
  }

}
