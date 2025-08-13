import type GamePlayerEntity from '../GamePlayerEntity';

/**
 * CompassSystem: computes and pushes a simple NESW indicator to the HUD.
 */
export default class CompassSystem {
  private _lastLetter: string = '';
  private _lastSentMs: number = 0;

  public update(player: GamePlayerEntity): void {
    try {
      const now = Date.now();
      if (now - this._lastSentMs < 200) return; // throttle

      const f = player.player.camera.facingDirection;
      // Determine cardinal by dominant axis (XZ plane)
      let letter = 'N';
      if (Math.abs(f.z) >= Math.abs(f.x)) {
        letter = f.z < 0 ? 'N' : 'S';
      } else {
        letter = f.x > 0 ? 'E' : 'W';
      }

      if (letter !== this._lastLetter) {
        this._lastLetter = letter;
        this._lastSentMs = now;
        player.player.ui.sendData({ type: 'compass', letter });
      } else if (now - this._lastSentMs > 1000) {
        // Periodic keepalive to ensure UI stays in sync
        this._lastSentMs = now;
        player.player.ui.sendData({ type: 'compass', letter });
      }
    } catch {}
  }
}


