import { BaseCommand } from './BaseCommand';
import type { Player, World } from 'hytopia';
import CurrencySystem from '../systems/CurrencySystem';

export default class CurrencyCommand extends BaseCommand {
  public readonly name = 'currency';
  public readonly description = 'Get or modify your currency balance';
  public readonly usage = '/currency <get|add|set|spend> [amount]';

  execute(player: Player, args: string[], world: World): void {
    const sub = (args[0] || 'get').toLowerCase();
    switch (sub) {
      case 'get': {
        this.sendMessage(player, `Balance: ${CurrencySystem.get(player)} CR`, world);
        break;
      }
      case 'add': {
        const amt = Number(args[1]);
        if (!Number.isFinite(amt)) {
          this.sendError(player, 'Usage: /currency add <amount>', world);
          return;
        }
        CurrencySystem.add(player, amt, 'admin-add');
        this.sendSuccess(player, `Added ${amt} CR. New balance: ${CurrencySystem.get(player)} CR`, world);
        break;
      }
      case 'set': {
        const amt = Number(args[1]);
        if (!Number.isFinite(amt)) {
          this.sendError(player, 'Usage: /currency set <amount>', world);
          return;
        }
        CurrencySystem.set(player, Math.max(0, Math.floor(amt)));
        this.sendSuccess(player, `Balance set to ${CurrencySystem.get(player)} CR`, world);
        break;
      }
      case 'spend': {
        const amt = Number(args[1]);
        if (!Number.isFinite(amt)) {
          this.sendError(player, 'Usage: /currency spend <amount>', world);
          return;
        }
        if (CurrencySystem.spend(player, amt, 'admin-spend')) {
          this.sendSuccess(player, `Spent ${amt} CR. New balance: ${CurrencySystem.get(player)} CR`, world);
        } else {
          this.sendError(player, `Insufficient funds. Balance: ${CurrencySystem.get(player)} CR`, world);
        }
        break;
      }
      default: {
        this.sendError(player, `Invalid subcommand. ${this.usage}`, world);
      }
    }
  }
}


