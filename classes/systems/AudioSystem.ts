import { Audio, type World } from 'hytopia';

/**
 * AudioSystem - Handles SFX only
 * Music is now handled by MusicSystem
 */
export default class AudioSystem {
  private _world: World;

  // SFX pool
  private _pool: Audio[] = [];
  private _poolPtr = 0;

  constructor(world: World) {
    this._world = world;
    this._initPool(8);
  }

  // ===== SFX =====
  public play(uri: string, opts: { volume?: number; x?: number; y?: number; z?: number; ref?: number; cut?: number } = {}): void {
    const a = this._acquire();
    if (!a) return;
    
    try { (a as any).setUri?.(uri); } catch {}
    const pos = { x: opts.x ?? 0, y: opts.y ?? 0, z: opts.z ?? 0 };
    // Ensure pooled audio is positional before play to avoid client warnings
    try { (a as any).setPosition?.(pos); } catch {}
    try { (a as any).setReferenceDistance?.(opts.ref ?? 1); } catch {}
    try { (a as any).setCutoffDistance?.(opts.cut ?? 10); } catch {}
    a.play(this._world, { volume: opts.volume ?? 1.0 } as any);
  }

  // ===== Internals =====
  private _initPool(size: number): void {
    // Create positional-ready audio instances to avoid non-positional warnings
    this._pool = new Array(size).fill(null).map(() => new Audio({
      uri: 'audio/sfx/sfx/hitmarker.wav',
      volume: 0.01,
      position: { x: 0, y: 0, z: 0 },
      referenceDistance: 1,
      cutoffDistance: 10,
    }));
  }
  
  private _acquire(): Audio | undefined { 
    const a = this._pool[this._poolPtr]; 
    this._poolPtr = (this._poolPtr + 1) % this._pool.length; 
    return a; 
  }
}