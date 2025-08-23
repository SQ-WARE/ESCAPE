import BaseConsumableItem, { type ConsumableOverrides } from './BaseConsumableItem';
import GamePlayerEntity from '../GamePlayerEntity';

export interface MedkitItemOptions extends ConsumableOverrides {
  healAmount?: number;
}

export default class MedkitItem extends BaseConsumableItem {
  static override readonly id = 'medkit';
  static override readonly name = 'Medkit';
  static override readonly description = 'A medical kit that heals wounds and provides enhanced regeneration';
  static override readonly iconImageUri = 'icons/medkit.png';
  static override readonly dropModelUri = 'models/items/medkit.glb';
  static override readonly heldModelUri = 'models/items/medkit.glb';
  static override readonly stackable = false;
  static override readonly consumeCooldownMs = 5000; // 5 second cooldown
  static override readonly consumeTimeMs = 3000; // 3 second use time
  static override readonly consumeRequiresDamaged = true; // Only usable when damaged
  static override readonly audioUri = 'audio/sfx/sfx/medpack-consume.mp3';
  static override readonly consumeAnimations = ['consume-upper', 'consume-lower'];

  public readonly healAmount: number;

  constructor(options: MedkitItemOptions = {}) {
    super(options);

    this.healAmount = options.healAmount ?? 60; // Default healing amount
  }

  protected override applyEffects(playerEntity: GamePlayerEntity): void {
    // Check if player is already at full health
    if (playerEntity.health >= playerEntity.maxHealth) {
      playerEntity.player.ui.sendData({
        type: 'notification',
        message: 'Already at full health!',
        color: 'FF0000'
      });
      return;
    }

    // Pause auto-healing to prevent conflicts
    playerEntity.healthSystem.pauseAutoHealing();

    // Slow player movement while healing
    playerEntity.movementSystem.setHealingState(true);

    // Calculate actual heal amount (don't overheal)
    const actualHealAmount = Math.min(this.healAmount, playerEntity.maxHealth - playerEntity.health);
    
    // Apply healing through HealthSystem
    playerEntity.healthSystem.heal(actualHealAmount);

    // Activate healing bonus
    playerEntity.healthSystem.activateHealingBonus();

    // Resume auto-healing after a short delay
    setTimeout(() => {
      playerEntity.healthSystem.resumeAutoHealing();
      playerEntity.movementSystem.setHealingState(false);
    }, 1000);

    // Send healing completion effect
    playerEntity.player.ui.sendData({
      type: 'healing-complete',
      healAmount: actualHealAmount
    });

    playerEntity.player.ui.sendData({
      type: 'notification',
      message: `Healed ${actualHealAmount} health! + Enhanced regeneration!`,
      color: '00FF00'
    });
  }
} 