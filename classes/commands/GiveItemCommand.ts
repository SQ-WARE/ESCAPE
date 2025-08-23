import type { Player, World } from 'hytopia';
import { BaseCommand } from './BaseCommand';
import { ItemFactory } from '../items/ItemFactory';

export default class GiveItemCommand extends BaseCommand {
  public readonly name = 'giveitem';
  public readonly description = 'Give an item to your backpack';
  public readonly usage = '/giveitem <itemId> [quantity]';

  public execute(player: Player, args: string[], world: World): void {
    // Check if player has admin permissions (you can customize this check)
    if (!this.isAdmin(player)) {
      this.sendError(player, 'You do not have permission to use this command.', world);
      return;
    }

    if (args.length < 1) {
      this.sendError(player, `Usage: ${this.usage}`, world);
      return;
    }

    const itemId = args[0];
    if (!itemId) {
      this.sendError(player, `Usage: ${this.usage}`, world);
      return;
    }
    
    const quantity = args.length > 1 ? parseInt(args[1] || '1') : 1;

    // Validate quantity
    if (isNaN(quantity) || quantity <= 0) {
      this.sendError(player, 'Quantity must be a positive number.', world);
      return;
    }

    // Check if item exists
    if (!ItemFactory.getInstance().isValidItemId(itemId)) {
      this.sendError(player, `Item '${itemId}' not found.`, world);
      return;
    }

    // Get item info for display
    const itemInfo = ItemFactory.getInstance().getItemData(itemId);
    const itemName = itemInfo?.name || itemId;

    // Add item to player's backpack
    try {
      const success = ItemFactory.getInstance().createAndAddToBackpack(player, itemId, quantity);
      
      if (success) {
        this.sendSuccess(player, `✅ Added ${quantity}x ${itemName} to your backpack!`, world);
      } else {
        this.sendError(player, '❌ Failed to give item. Please try again.', world);
      }
      
    } catch (error) {
      this.sendError(player, '❌ Failed to give item. Please try again.', world);
    }
  }

  private isAdmin(player: Player): boolean {
    // You can customize this admin check based on your game's permission system
    // For now, we'll allow any player to use the command (you should restrict this in production)
    return true;
  }
}
