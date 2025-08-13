import type GamePlayerEntity from '../GamePlayerEntity';
import type { EventPayloads } from 'hytopia';
import { BaseEntityControllerEvent } from 'hytopia';

export default class InputSystem {
  private _player: GamePlayerEntity;

  constructor(player: GamePlayerEntity) {
    this._player = player;
  }

  public handleInput(input: Partial<Record<string | number | symbol, boolean>>): void {
    if (this._player.isDead) {
      return;
    }

    // Cancel reload based on weapon configuration
    const gun = this._player.gamePlayer.getCurrentWeapon();
    if (gun && gun.isReloading) {
      const reloadConfig = gun.weaponData.behavior.reload;
      
      // Default behavior: cancel on sprint only
      const cancelOnMovement = reloadConfig?.cancelOnMovement ?? false;
      const cancelOnSprint = reloadConfig?.cancelOnSprint ?? true;
      
      // Cancel on movement if configured
      if (cancelOnMovement && (input.w || input.a || input.s || input.d)) {
        gun.cancelReload();
      }
      // Cancel on sprint if configured
      else if (cancelOnSprint && this._player.movementSystem.isSprinting()) {
        gun.cancelReload();
      }
    }

    // Handle interaction
    if (input.f) {
      this._handleInteraction();
      input.f = false;
    }

    // Handle inventory
    if (input.e) {
      this._handleInventoryToggle();
      input.e = false;
    }

    // Handle weapon actions
    if (input.ml) {
      this._handleMouseLeftClick();
    }

    if (input.r) {
      this._handleReload();
      input.r = false;
    }

    if (input.z || input.mr) {
      this._handleZoomScope();
      input.z = false;
      input.mr = false;
    }

    // Handle item dropping
    if (input.q) {
      this._handleDropItem();
      input.q = false;
    }

    // Handle hotbar selection
    this._handleHotbarSelection(input);
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
    
    // Don't allow actions if inventory is open or player is in menu
    if (this._player.gamePlayer.isBackpackOpen || this._player.gamePlayer.isInMenu) {
      return;
    }
    
    if (gun) {
      // Handle weapon shooting
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

  private _handleZoomScope(): void {
    const gun = this._player.gamePlayer.getCurrentWeapon();
    if (gun) {
      gun.zoomScope();
    }
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

  public shouldProcessMovement(): boolean {
    return !this._player.gamePlayer.isBackpackOpen;
  }
} 