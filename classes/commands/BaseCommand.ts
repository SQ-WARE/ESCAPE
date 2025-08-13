import type { Player, World } from 'hytopia';

export abstract class BaseCommand {
  public abstract readonly name: string;
  public abstract readonly description: string;
  public abstract readonly usage: string;

  public abstract execute(player: Player, args: string[], world: World): void;

  protected sendMessage(player: Player, message: string, world: World): void {
    world.chatManager.sendPlayerMessage(player, message);
  }

  protected sendError(player: Player, message: string, world: World): void {
    world.chatManager.sendPlayerMessage(player, message, 'FF0000');
  }

  protected sendSuccess(player: Player, message: string, world: World): void {
    world.chatManager.sendPlayerMessage(player, message, '00FF00');
  }
} 