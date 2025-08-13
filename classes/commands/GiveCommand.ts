import { BaseCommand } from './BaseCommand';
import { Player, World } from 'hytopia';
import { WeaponFactory } from '../weapons/WeaponFactory';
import MedkitItem from '../items/MedkitItem';
import type GamePlayerEntity from '../GamePlayerEntity';

export class GiveCommand extends BaseCommand {
  public readonly name = 'give';
  public readonly description = 'Give a weapon or item';
  public readonly usage = '/give <weapon|medkit>';

  execute(player: Player, args: string[], world: World): void {
    if (!world) {
      return;
    }

    if (args.length === 0) {
      this.sendError(player, '❌ Please specify what to give: weapon or medkit', world);
      return;
    }

    const itemType = args[0].toLowerCase();

    switch (itemType) {
      case 'medkit':
        this.giveMedkit(player, world);
        break;
      case 'weapon':
        this.giveWeapon(player, args, world);
        break;
      default:
        this.sendError(player, '❌ Invalid item type. Use: weapon or medkit', world);
        break;
    }
  }

  private giveMedkit(player: Player, world: World): void {
    const medkit = new MedkitItem();
    const playerEntities = world.entityManager.getPlayerEntitiesByPlayer(player);
    const playerEntity = playerEntities?.[0] as GamePlayerEntity | undefined;
    
    if (playerEntity) {
      // Add to hotbar using the correct method
      const added = playerEntity.gamePlayer.hotbar.addItem(medkit);
      if (added) {
        this.sendSuccess(player, '🏥 Gave you a medkit! Right-click to use it.', world);
      } else {
        this.sendError(player, '❌ Hotbar is full!', world);
      }
    } else {
      this.sendError(player, '❌ Player entity not found', world);
    }
  }

  private giveWeapon(player: Player, args: string[], world: World): void {
    if (args.length < 2) {
      this.sendError(player, '❌ Please specify a weapon name', world);
      return;
    }

    const weaponName = args[1];
    if (!weaponName) {
      this.sendError(player, '❌ Please specify a weapon name', world);
      return;
    }

    try {
      const weapon = WeaponFactory.create(weaponName);
      const playerEntities = world.entityManager.getPlayerEntitiesByPlayer(player);
      const playerEntity = playerEntities?.[0] as GamePlayerEntity | undefined;
      
      if (playerEntity) {
        const added = playerEntity.gamePlayer.hotbar.addItem(weapon);
        if (added) {
          this.sendSuccess(player, `🔫 Gave you ${weaponName}!`, world);
        } else {
          this.sendError(player, '❌ Hotbar is full!', world);
        }
      } else {
        this.sendError(player, '❌ Player entity not found', world);
      }
    } catch (error) {
      this.sendError(player, `❌ Weapon "${weaponName}" not found`, world);
    }
  }
} 