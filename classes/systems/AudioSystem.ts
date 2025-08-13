import { Audio, type World } from 'hytopia';

/**
 * AudioSystem (unified) — consolidates music and SFX.
 * This replaces the older MusicSystem/SoundSystem helpers.
 */
export default class AudioSystem {
  private _world: World;

  // Music
  private _music: Audio | null = null;
  private _playlist: string[] = [];
  private _trackIndex = -1;
  private _musicVolume = 0.06;
  private _musicEnabled = true;

  // SFX pool
  private _pool: Audio[] = [];
  private _poolPtr = 0;

  constructor(world: World, playlist: string[] = []) {
    this._world = world;
    this._playlist = playlist;
    this._initPool(8);
  }

  // ===== Music =====
  public start(): void { if (this._musicEnabled && this._playlist.length) this._next(); }
  public stop(): void { try { this._music?.stop?.(); } catch {}; this._music = null; }
  public setVolume(v: number): void { this._musicVolume = Math.max(0, Math.min(1, v)); this._restartCurrent(); }
  public getCurrentTrack(): string | null { return (this._trackIndex >= 0 && this._trackIndex < this._playlist.length) ? this._playlist[this._trackIndex] : null; }
  public getAvailableTracks(): string[] { return [...this._playlist]; }
  public skipToNext(): void { this._next(); }

  // ===== SFX =====
  public play(uri: string, opts: { volume?: number; x?: number; y?: number; z?: number; ref?: number; cut?: number } = {}): void {
    const a = this._acquire();
    try { a.setUri?.(uri); } catch {}
    const pos = { x: opts.x ?? 0, y: opts.y ?? 0, z: opts.z ?? 0 };
    // Ensure pooled audio is positional before play to avoid client warnings
    try { (a as any).setPosition?.(pos); } catch {}
    try { (a as any).setReferenceDistance?.(opts.ref ?? 1); } catch {}
    try { (a as any).setCutoffDistance?.(opts.cut ?? 10); } catch {}
    a.play(this._world, true, { volume: opts.volume ?? 1.0 } as any);
  }

  // ===== Internals =====
  private _next(): void {
    const old = this._music;
    this._trackIndex = this._pickNextIndex();
    const uri = this.getCurrentTrack();
    if (!uri) return;
    if (old) { try { old.stop?.(); } catch {} }
    this._music = new Audio({ uri, loop: false, volume: this._musicVolume });
    this._music.play(this._world);
    setTimeout(() => this._next(), 240000);
  }

  private _pickNextIndex(): number {
    if (this._playlist.length <= 1) return 0;
    let n: number;
    do { n = Math.floor(Math.random() * this._playlist.length); } while (n === this._trackIndex);
    return n;
  }

  private _restartCurrent(): void {
    const current = this.getCurrentTrack();
    if (!current) return;
    try { this._music?.stop?.(); } catch {}
    this._music = new Audio({ uri: current, loop: false, volume: this._musicVolume });
    this._music.play(this._world);
  }

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
  private _acquire(): Audio { const a = this._pool[this._poolPtr]; this._poolPtr = (this._poolPtr + 1) % this._pool.length; return a; }
}