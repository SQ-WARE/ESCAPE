import {
  Entity,
  World,
  type Vector3Like,
  type QuaternionLike,
  type ModelEntityOptions,
  Quaternion,
} from 'hytopia';

import MedkitItem from './MedkitItem';
import GamePlayerEntity from '../GamePlayerEntity';

export type MedkitHand = 'left' | 'right';

export interface MedkitEntityOptions extends ModelEntityOptions {
  medkitItem: MedkitItem;
  parent?: GamePlayerEntity;
  heldHand?: MedkitHand;
}

export default class MedkitEntity extends Entity {
  private readonly _medkitItem: MedkitItem;
  private readonly _heldHand: MedkitHand;
  private _isUsing: boolean = false;
  private _useStartTime: number = 0;

  public constructor(options: MedkitEntityOptions) {
    const medkitItem = options.medkitItem;
    const heldHand = options.heldHand ?? 'right';
    
    const parentNodeName = MedkitEntity._getHandAnchorNode(heldHand);
    
    super({
      ...options,
      modelUri: medkitItem.heldModelUri,
      modelScale: medkitItem.heldModelScale ?? 0.4,
    });

    this._medkitItem = medkitItem;
    this._heldHand = heldHand;
  }

  // Getters
  public get isEquipped(): boolean { 
    return !!this.parent; 
  }

  public get medkitItem(): MedkitItem {
    return this._medkitItem;
  }

  public get heldHand(): MedkitHand {
    return this._heldHand;
  }

  public get healAmount(): number {
    return this._medkitItem.healAmount;
  }

  public get useTimeMs(): number {
    return this._medkitItem.useTimeMs;
  }

  public get isUsing(): boolean {
    return this._medkitItem.isUsing;
  }

  public get useProgress(): number {
    return this._medkitItem.useProgress;
  }

  public equip(): void {
    if (!this.parent) return;

    // Position the medkit in front of the player, slightly elevated
    // Following the pattern from Hytopia examples
    this.setPosition({ x: 0, y: 0.15, z: 0.3 });
    
    // Rotate to face the player (similar to other healing items)
    this.setRotation(Quaternion.fromEuler(-90, 0, 270));
    
    // Set parent to player's hand anchor
    const handAnchor = MedkitEntity._getHandAnchorNode(this._heldHand);
    this.setParent(this.parent, handAnchor);
    
  }

  public unequip(): void {
    if (this.parent) {
      this.setParent(undefined);
        }
  }

  public use(player: GamePlayerEntity): boolean {
    if (this._medkitItem.use(player)) {
      this._startHealingAnimation(player);
      return true;
    }
    return false;
  }

  public cancelUse(player: GamePlayerEntity): void {
    this._medkitItem.cancelUse(player);
    this._stopHealingAnimation(player);
  }

  public update(player: GamePlayerEntity): void {
    this._medkitItem.update(player);
    
    // Update healing animation if using
    if (this._medkitItem.isUsing && !this._isUsing) {
      this._startHealingAnimation(player);
    } else if (!this._medkitItem.isUsing && this._isUsing) {
      this._stopHealingAnimation(player);
    }
    
    // Update animation progress
    if (this._isUsing) {
      this._updateHealingAnimation(player);
    }
  }

  public override spawn(world: World, position: Vector3Like, rotation?: QuaternionLike): void {
    super.spawn(world, position, rotation);
  }

  public override despawn(): void {
    super.despawn();
  }

  private _startHealingAnimation(player: GamePlayerEntity): void {
    if (this._isUsing) return;
    
    this._isUsing = true;
    this._useStartTime = performance.now();
    
    // Start the healing animation - use 'shoot_gun_right' for medkit usage
    // This creates a "using" motion similar to other healing items
    player.startModelOneshotAnimations(['shoot_gun_right']);
    
    // Move medkit to "using" position (closer to player)
    this.setPosition({ x: 0, y: 0.1, z: 0.2 });
    
    // Add a slight rotation to show it's being used
    this.setRotation(Quaternion.fromEuler(-90, 15, 270));
    
  }

  private _stopHealingAnimation(player: GamePlayerEntity): void {
    if (!this._isUsing) return;
    
    this._isUsing = false;
    
    // Return medkit to normal position
    this.setPosition({ x: 0, y: 0.15, z: 0.3 });
    this.setRotation(Quaternion.fromEuler(-90, 0, 270));
    
  }

  private _updateHealingAnimation(player: GamePlayerEntity): void {
    if (!this._isUsing) return;
    
    const progress = this._medkitItem.useProgress;
    const elapsed = performance.now() - this._useStartTime;
    
    // Add subtle movement during healing
    const wobble = Math.sin(elapsed * 0.01) * 0.02; // Subtle wobble
    const pulse = Math.sin(elapsed * 0.02) * 0.01; // Subtle pulse
    
    this.setPosition({ 
      x: wobble, 
      y: 0.1 + pulse, 
      z: 0.2 
    });
    
    // Add healing particles effect (if supported)
    if (progress > 0 && progress < 100) {
      this._createHealingParticles(player);
    }
  }

  private _createHealingParticles(player: GamePlayerEntity): void {
    // Create healing particle effect
    // This would typically be done with a particle system
    // For now, we'll just log it - you can implement actual particles later
    if (Math.random() < 0.1) { // 10% chance per frame to create particle
        }
  }

  private static _getHandAnchorNode(heldHand: MedkitHand): string {
    return heldHand === 'left' ? 'hand_left_anchor' : 'hand_right_anchor';
  }
} 