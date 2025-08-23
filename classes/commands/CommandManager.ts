import type { Player, World } from 'hytopia';
import { BaseCommand } from './BaseCommand';

export class CommandManager {
  private static _instance: CommandManager | undefined;
  private _commands: Map<string, BaseCommand> = new Map();

  public static get instance(): CommandManager {
    if (!this._instance) {
      this._instance = new CommandManager();
    }
    return this._instance;
  }

  private constructor() {}

  public registerCommand(command: BaseCommand): void {
    this._commands.set(command.name, command);
  }

  public registerCommands(commands: BaseCommand[]): void {
    for (const command of commands) {
      this.registerCommand(command);
    }
  }

  public setupCommandHandlers(world: World): void {
    for (const [name, command] of this._commands) {
      world.chatManager.registerCommand(name, (player: Player, args: string[]) => {
        try {
          command.execute(player, args, world);
        } catch (error) {
          world.chatManager.sendPlayerMessage(player, 'An error occurred while executing the command.', 'FF0000');
        }
      });
    }
  }

  public getCommand(name: string): BaseCommand | undefined {
    return this._commands.get(name);
  }

  public getCommandNames(): string[] {
    return Array.from(this._commands.keys());
  }
} 