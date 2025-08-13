import { BaseCommand } from './BaseCommand';
import { Player, World } from 'hytopia';

export class MusicCommand extends BaseCommand {
  public readonly name = 'music';
  public readonly description = 'Control the music system';
  public readonly usage = '/music <play|stop|next|volume|list> [value]';

  execute(player: Player, args: string[], world: World): void {
    if (!world) {
      return;
    }

    if (args.length === 0) {
      this.sendError(player, '❌ Please specify a music command: play, stop, next, volume, or list', world);
      return;
    }

    const command = args[0]?.toLowerCase();
    if (!command) {
      this.sendError(player, '❌ Invalid music command', world);
      return;
    }

    switch (command) {
      case 'play':
        this.playMusic(world);
        break;
      case 'stop':
        this.stopMusic(world);
        break;
      case 'next':
        this.nextTrack(world);
        break;
      case 'volume':
        this.setVolume(player, args, world);
        break;
      case 'list':
        this.listTracks(world);
        break;
      default:
        this.sendError(player, '❌ Invalid music command. Use: play, stop, next, volume, or list', world);
        break;
    }
  }

  private playMusic(world: World): void {
    const audio = (world as any).audioSystem;
    if (audio) {
      audio.start();
      world.chatManager.sendBroadcastMessage('🎵 Music started', '00FF00');
    } else {
      console.error('❌ Music system not found');
    }
  }

  private stopMusic(world: World): void {
    const audio = (world as any).audioSystem;
    if (audio) {
      audio.stop();
      world.chatManager.sendBroadcastMessage('🔇 Music stopped', 'FF0000');
    } else {
      console.error('❌ Music system not found');
    }
  }

  private nextTrack(world: World): void {
    const audio = (world as any).audioSystem;
    if (audio) {
      audio.skipToNext();
      const currentTrack = audio.getCurrentTrack();
      world.chatManager.sendBroadcastMessage(`⏭️ Next track: ${currentTrack || 'Unknown'}`, '00FFFF');
    } else {
      console.error('❌ Music system not found');
    }
  }

  private setVolume(player: Player, args: string[], world: World): void {
    if (args.length < 2) {
      this.sendError(player, '❌ Please specify a volume level (0.0 to 1.0)', world);
      return;
    }

    const volume = parseFloat(args[1]);
    if (isNaN(volume) || volume < 0 || volume > 1) {
      this.sendError(player, '❌ Volume must be a number between 0.0 and 1.0', world);
      return;
    }

    const audio = (world as any).audioSystem;
    if (audio) {
      audio.setVolume(volume);
      this.sendSuccess(player, `🔊 Music volume set to ${volume}`, world);
    } else {
      console.error('❌ Music system not found');
    }
  }

  private listTracks(world: World): void {
    const audio = (world as any).audioSystem;
    if (audio) {
      const tracks = audio.getAvailableTracks();
      const currentTrack = audio.getCurrentTrack();
      
      world.chatManager.sendBroadcastMessage('🎵 Available tracks:', 'FFFF00');
      tracks.forEach((track: string, index: number) => {
        const isCurrent = track === currentTrack;
        const prefix = isCurrent ? '▶️ ' : '  ';
        world.chatManager.sendBroadcastMessage(`${prefix}${index + 1}. ${track}`, isCurrent ? '00FF00' : 'CCCCCC');
      });
    } else {
      console.error('❌ Music system not found');
    }
  }
} 