import type { Vector3Like } from 'hytopia';
import type GamePlayerEntity from '../GamePlayerEntity';

interface ExtractionZoneDefinition {
  name: string;
  position: Vector3Like;
  radius: number; // meters
  holdSeconds: number; // seconds required to extract
}

interface ActiveExtractionState {
  zone: ExtractionZoneDefinition;
  startTimeMs: number;
}

/**
 * Monitors player position against configured extraction zones.
 * When a player stays inside a zone for holdSeconds, triggers extraction success.
 */
export default class ExtractionSystem {
  private readonly _player: GamePlayerEntity;
  private readonly _zones: ExtractionZoneDefinition[];
  private _active: ActiveExtractionState | null = null;

  public constructor(player: GamePlayerEntity, zones?: ExtractionZoneDefinition[]) {
    this._player = player;
    // Default zones (can be moved to config later). Place one at spawn for now.
    this._zones = zones ?? [
      { name: 'EVAC ZONE A', position: { x: 24, y: 2, z: 24 }, radius: 3, holdSeconds: 20 },
    ];
  }

  public update(): void {
    if (!this._player.world || this._player.isDead) {
      this._cancelExtraction('');
      return;
    }

    const currentZone = this._getZoneContainingPlayer();

    if (!currentZone) {
      if (this._active) {
        this._cancelExtraction(this._active.zone.name);
      }
      return;
    }

    // If newly entered a zone, start extraction hold
    if (!this._active || this._active.zone.name !== currentZone.name) {
      this._active = { zone: currentZone, startTimeMs: performance.now() };
      this._player.player.ui.sendData({
        type: 'extraction-start',
        zoneName: currentZone.name,
        holdSeconds: currentZone.holdSeconds,
      });
      // Also send a standard notification consistent with other systems
      this._player.player.ui.sendData({
        type: 'notification',
        message: `Hold in ${currentZone.name} for ${currentZone.holdSeconds}s to extract`,
        color: '00FF00',
      });
      return;
    }

    // Update progress
    const elapsedMs = performance.now() - this._active.startTimeMs;
    const totalMs = this._active.zone.holdSeconds * 1000;
    const clamped = Math.max(0, Math.min(1, elapsedMs / totalMs));
    const remainingSeconds = Math.max(0, Math.ceil((totalMs - elapsedMs) / 1000));

    this._player.player.ui.sendData({
      type: 'extraction-progress',
      zoneName: this._active.zone.name,
      progress: Math.round(clamped * 100),
      remainingSeconds,
    });

    if (elapsedMs >= totalMs) {
      // Success
      const zoneName = this._active.zone.name;
      this._active = null;
      // Defer completion until next tick to avoid running during controller tick
      setTimeout(() => {
        if (this._player && this._player.gamePlayer) {
          this._player.gamePlayer.completeExtraction(zoneName);
        }
      }, 0);
    }
  }

  public cleanup(): void {
    this._cancelExtraction('');
  }

  private _cancelExtraction(zoneName: string): void {
    if (!this._active) return;
    const name = zoneName || this._active.zone.name;
    this._active = null;
    this._player.player.ui.sendData({
      type: 'extraction-cancel',
      zoneName: name,
    });
    // Show cancel notification in the same style as other notifications
    this._player.player.ui.sendData({
      type: 'notification',
      message: 'Extraction canceled - you left the zone',
      color: 'FF0000',
    });
  }

  private _getZoneContainingPlayer(): ExtractionZoneDefinition | null {
    const pos = this._player.position;
    for (const zone of this._zones) {
      const dx = pos.x - zone.position.x;
      const dy = pos.y - zone.position.y;
      const dz = pos.z - zone.position.z;
      const distSq = dx * dx + dy * dy + dz * dz;
      if (distSq <= zone.radius * zone.radius) {
        return zone;
      }
    }
    return null;
  }
}


