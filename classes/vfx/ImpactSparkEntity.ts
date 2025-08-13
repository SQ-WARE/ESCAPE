import { Entity, Light, type World, type Vector3Like } from 'hytopia';

export type ImpactSparkOptions = {
	modelUri?: string;
	modelScale?: number;
	color?: { r: number; g: number; b: number };
	intensity?: number;
	lifetimeMs?: number;
};

/**
 * Tiny impact spark with a brief point light pop. Designed for pooling and very short lifetimes.
 */
export default class ImpactSparkEntity extends Entity {
	private _light?: Light;
	private _idleLightPos: Vector3Like = { x: 0, y: -4096, z: 0 };
	private _lifetimeMs: number;
	private _intensity: number;
	private _color: { r: number; g: number; b: number };
	private _cleanupTimer?: NodeJS.Timeout;

	public constructor(opts: ImpactSparkOptions = {}) {
		const entityOpts: any = {
			name: 'impact_spark',
			modelUri: opts.modelUri ?? 'models/projectiles/bullet.glb',
			modelScale: opts.modelScale ?? 0.25,
			opacity: 1,
		};
		super(entityOpts);
		this._color = opts.color ?? { r: 255, g: 220, b: 140 };
		this._intensity = Math.max(1, Math.min(10, opts.intensity ?? 4));
		this._lifetimeMs = Math.max(40, Math.min(220, opts.lifetimeMs ?? 120));
	}

	public override spawn(world: World, position?: Vector3Like): void {
		super.spawn(world, position as Vector3Like);
		try {
			this._light = new Light({
				position: (position ?? this.position) as Vector3Like,
				color: this._color,
				intensity: this._intensity,
			});
			this._light.spawn(world);
			this._scheduleFade();
		} catch {
			// ignore
		}
	}

	public refresh(position: Vector3Like, color?: { r: number; g: number; b: number }, intensity?: number, lifetimeMs?: number): void {
		try { this.setPosition(position); } catch {}
		if (color) this._color = color;
		if (typeof intensity === 'number') this._intensity = Math.max(1, Math.min(10, intensity));
		if (typeof lifetimeMs === 'number') this._lifetimeMs = Math.max(40, Math.min(220, lifetimeMs));
		try {
			this._light?.setPosition(position);
			this._light?.setColor?.(this._color as any);
			this._light?.setIntensity(this._intensity);
		} catch {}
		if (this._cleanupTimer) { clearTimeout(this._cleanupTimer); this._cleanupTimer = undefined; }
		this._scheduleFade();
	}

	private _scheduleFade(): void {
		// Two-step fade for a quick flash feel
		const half = Math.max(10, Math.floor(this._lifetimeMs * 0.4));
		setTimeout(() => {
			try { this._light?.setIntensity(Math.max(0.5, this._intensity * 0.45)); } catch {}
		}, half);
		this._cleanupTimer = setTimeout(() => this._cleanup(), this._lifetimeMs);
	}

	private _cleanup(): void {
		try { this._light?.setIntensity(0); } catch {}
		try { this._light?.setPosition(this._idleLightPos); } catch {}
		try { this._light?.despawn(); } catch {}
		this._light = undefined;
		try { this.despawn(); } catch {}
	}
}


