import type { Player, World } from 'hytopia';
import { BaseCommand } from './BaseCommand';
import GamePlayer from '../GamePlayer';
import { WeaponFactory } from '../weapons/WeaponFactory';
import { WEAPON_DEFINITIONS } from '../weapons/data/WeaponDefinitions';
import PistolAmmoItem from '../items/ammo/PistolAmmoItem';
import RifleAmmoItem from '../items/ammo/RifleAmmoItem';
import SniperAmmoItem from '../items/ammo/SniperAmmoItem';
import ShotgunAmmoItem from '../items/ammo/ShotgunAmmoItem';

export default class GiveAllWeaponsCommand extends BaseCommand {
  public readonly name: string = 'giveallweapons';
  public readonly description: string = 'Give all weapons and 10000 of each ammo type for dev testing';
  public readonly usage: string = '/giveallweapons';

  public execute(player: Player, args: string[], world: World): void {
    try {
      const gamePlayer = GamePlayer.getOrCreate(player);
      
      // Give all weapons
      for (const weaponData of WEAPON_DEFINITIONS) {
        const weaponItem = WeaponFactory.create(weaponData.id);
        if (weaponItem) {
          gamePlayer.backpack.addItem(weaponItem);
        }
      }

      // Give 10000 of each ammo type
      const pistolAmmo = PistolAmmoItem.create({ quantity: 10000 });
      const rifleAmmo = RifleAmmoItem.create({ quantity: 10000 });
      const sniperAmmo = SniperAmmoItem.create({ quantity: 10000 });
      const shotgunAmmo = ShotgunAmmoItem.create({ quantity: 10000 });

      gamePlayer.backpack.addItem(pistolAmmo);
      gamePlayer.backpack.addItem(rifleAmmo);
      gamePlayer.backpack.addItem(sniperAmmo);
      gamePlayer.backpack.addItem(shotgunAmmo);

      this.sendSuccess(player, `✅ Added all ${WEAPON_DEFINITIONS.length} weapons and 10000 of each ammo type to your backpack!`, world);
      
    } catch (error) {
      this.sendError(player, `❌ Failed to give weapons: ${error}`, world);
    }
  }
} 