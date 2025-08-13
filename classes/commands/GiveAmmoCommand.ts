import type { Player, World } from 'hytopia';
import { PlayerManager } from 'hytopia';
import { BaseCommand } from './BaseCommand';
import GamePlayer from '../GamePlayer';
import PistolAmmoItem from '../items/ammo/PistolAmmoItem';
import RifleAmmoItem from '../items/ammo/RifleAmmoItem';
import SniperAmmoItem from '../items/ammo/SniperAmmoItem';
import ShotgunAmmoItem from '../items/ammo/ShotgunAmmoItem';

export default class GiveAmmoCommand extends BaseCommand {
  public readonly name: string = 'giveammo';
  public readonly description: string = 'Give ammo to yourself or another player';
  public readonly usage: string = '/giveammo <ammoType> [amount] [playerName]';

  public execute(player: Player, args: string[], world: World): void {
    if (args.length < 1) {
      this.sendError(player, `Usage: ${this.usage}`, world);
      this.sendMessage(player, 'Available ammo types:', world);
      this.sendMessage(player, '\u2022 pistol - 9\u00d719mm Parabellum', world);
      this.sendMessage(player, '\u2022 rifle - 7.62\u00d739mm', world);
      this.sendMessage(player, '\u2022 sniper - 12.7\u00d7108mm', world);
      this.sendMessage(player, '\u2022 shotgun - 12 Gauge', world);
      return;
    }

    const ammoType = args[0]?.toLowerCase() || '';
    const amount = parseInt(args[1] || '50') || 50;
    const targetPlayerName = args[2];

    const ammoTypeMap: Record<string, { class: any; description: string }> = {
      'pistol': { 
        class: PistolAmmoItem, 
        description: '9\u00d719mm Parabellum' 
      },
      'rifle': { 
        class: RifleAmmoItem, 
        description: '7.62\u00d739mm' 
      },
      'sniper': { 
        class: SniperAmmoItem, 
        description: '12.7\u00d7108mm' 
      },
      'shotgun': { 
        class: ShotgunAmmoItem, 
        description: '12 Gauge' 
      },
    };

    if (!ammoTypeMap[ammoType]) {
      const validTypes = Object.keys(ammoTypeMap).join(', ');
      this.sendError(player, `Invalid ammo type. Valid types: ${validTypes}`, world);
      return;
    }

    let targetPlayer: Player;
    if (targetPlayerName) {
      const foundPlayer = PlayerManager.instance.getConnectedPlayerByUsername(targetPlayerName);
      if (!foundPlayer) {
        this.sendError(player, `Player '${targetPlayerName}' not found`, world);
        return;
      }
      targetPlayer = foundPlayer;
    } else {
      targetPlayer = player;
    }

    const gamePlayer = GamePlayer.getOrCreate(targetPlayer);
    const ammoInfo = ammoTypeMap[ammoType];
    const ammoItem = ammoInfo.class.create({ quantity: amount });
    
    let added = gamePlayer.hotbar.addItem(ammoItem);
    if (!added) {
      added = gamePlayer.backpack.addItem(ammoItem);
    }

    if (added) {
      const message = `Gave ${amount} ${ammoInfo.description} to ${targetPlayer.username}`;
      this.sendSuccess(player, message, world);
      
      if (targetPlayer !== player) {
        this.sendMessage(targetPlayer, `Received ${amount} ${ammoInfo.description} from ${player.username}`, world);
      }
    } else {
      this.sendError(player, `Could not give ammo - inventory is full.`, world);
    }
  }
} 