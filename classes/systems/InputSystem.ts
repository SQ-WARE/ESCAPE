import type GamePlayerEntity from '../GamePlayerEntity';
import type { EventPayloads } from 'hytopia';
import { BaseEntityControllerEvent } from 'hytopia';

import InputHandler from './InputHandler';

export default class InputSystem {
  private _player: GamePlayerEntity;

  private _inputHandler: InputHandler;
  private _previousInput: Partial<Record<string | number | symbol, boolean>> = {};

  constructor(player: GamePlayerEntity) {
    this._player = player;

    this._inputHandler = InputHandler.getInstance();
  }

  public handleInput(input: Partial<Record<string | number | symbol, boolean>>): void {
    if (this._player.isDead) {
      return;
    }

    // Handle right mouse button press and release
    this._handleRightMouseButton(input);

    const gun = this._player.gamePlayer.getCurrentWeapon();
    if (gun && gun.isReloading) {
      const reloadConfig = gun.weaponData.behavior.reload;
      
      const cancelOnMovement = reloadConfig?.cancelOnMovement ?? false;
      const cancelOnSprint = reloadConfig?.cancelOnSprint ?? true;
      
      if (cancelOnMovement && (input.w || input.a || input.s || input.d)) {
        gun.cancelReload();
      }
      else if (cancelOnSprint && this._player.movementSystem.isSprinting()) {
        gun.cancelReload();
      }
    }

    if (input.f) {
      this._handleInteraction();
      input.f = false;
    }

    if (input.e) {
      this._handleInventoryToggle();
      input.e = false;
    }

    if (input.ml) {
      this._handleMouseLeftClick();
    }

    if (input.r) {
      this._handleReload();
      input.r = false;
    }



    // Note: Right mouse button handling moved to _handleRightMouseButton method

    if (input.q) {
      this._handleDropItem();
      input.q = false;
    }

    this._handleHotbarSelection(input);
    
    // Store current input state for next frame
    this._previousInput = { ...input };
  }

  private _handleInteraction(): void {
    if (!this._player.world) return;
    
    const raycastResult = this._player.world.simulation.raycast(
      this._player.position,
      this._player.player.camera.facingDirection,
      5,
      {
        filterExcludeRigidBody: this._player.rawRigidBody,
      }
    );

    if (raycastResult?.hitEntity) {
      if ('interact' in raycastResult.hitEntity && typeof raycastResult.hitEntity.interact === 'function') {
        raycastResult.hitEntity.interact(this._player);
      }
    }
  }

  private _handleInventoryToggle(): void {
    if (this._player.gamePlayer.isBackpackOpen) {
      this._player.gamePlayer.closeInventory();
    } else {
      this._player.gamePlayer.openInventory();
    }
  }

  private _handleMouseLeftClick(): void {
    const gun = this._player.gamePlayer.getCurrentWeapon();
    
    if (this._player.gamePlayer.isBackpackOpen || this._player.gamePlayer.isInMenu) {
      return;
    }
    
    if (gun) {
      if (this._player.movementSystem.isSprinting() && !this._player.movementSystem.canFireWhileSprinting(gun.weaponData.category)) {
        return;
      }
      
      // Check if weapon can shoot before applying any effects
      if (gun.canShoot()) {
        // Let the weapon handle all its own effects (recoil, animation, etc.)
        gun.shoot();
      }
    } else {
      // Handle unarmed punching
      this._player.performUnarmedAttack();
    }
  }

  private _handleReload(): void {
    const gun = this._player.gamePlayer.getCurrentWeapon();
    if (gun) {
      gun.reload();
    }
  }



  private _handleMouseRightClick(): void {
    // No-op: aiming is disabled
  }

  private _handleDropItem(): void {
    if (this._player.gamePlayer.isBackpackOpen) return;

    const selectedIndex = this._player.gamePlayer.hotbar.selectedIndex;
    this._player.gamePlayer.dropItem('hotbar', selectedIndex);
  }

  private _handleHotbarSelection(input: Partial<Record<string | number | symbol, boolean>>): void {
    // Handle number keys 1-8 for hotbar selection
    for (let i = 1; i <= 8; i++) {
      if (input[i.toString()]) {
        this._player.gamePlayer.hotbar.setSelectedIndex(i - 1);
        input[i.toString()] = false;
      }
    }
  }

  private _handleRightMouseButton(input: Partial<Record<string | number | symbol, boolean>>): void {
    const currentRightMouse = input.mr || false;
    const previousRightMouse = this._previousInput.mr || false;

    // Check if player has a medkit selected - medkit takes priority
    const selectedItem = this._player.gamePlayer.hotbar.selectedItem;
    const isMedkitSelected = selectedItem && selectedItem.constructor.name === 'MedkitItem';
    
    if (isMedkitSelected) {
      // Let MedkitSystem handle right-click for medkit usage
      return;
    }

    // Detect right mouse button press (transition from false to true)
    if (currentRightMouse && !previousRightMouse) {
      this._handleMouseRightClick();
    }
    
    // Detect right mouse button release (transition from true to false)
    if (!currentRightMouse && previousRightMouse) {
      this._handleMouseRightRelease();
    }
  }

  private _handleMouseRightRelease(): void {
    // No-op: aiming is disabled
  }

  public shouldProcessMovement(): boolean {
    return !this._player.gamePlayer.isBackpackOpen;
  }
} 