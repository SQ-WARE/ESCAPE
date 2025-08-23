import { Entity, Light, type World, type Vector3Like } from 'hytopia';

type TracerOptions = {
	modelUri?: string;
	modelScale?: number;
	color?: { r: number; g: number; b: number };
	intensity?: number;
	speed?: number; // blocks per second
	lifetimeMs?: number;
	endPoint?: Vector3Like; // optional hard stop target
};

/**
 * Very lightweight projectile tracer that flies forward for a short time
 * and carries a point light with it. Designed to be purely visual.
 */
export default class BulletTracerEntity extends Entity {
	public static maxActiveLights: number = 4;
	private static _activeLights: number = 0;
	public static setMaxActiveLights(limit: number): void {
		BulletTracerEntity.maxActiveLights = Math.max(0, Math.floor(limit));
	}
	private _direction: Vector3Like;
	private _speed: number;
	private _lifetimeMs: number;
	private _elapsedMs: number = 0;
	private _tick?: NodeJS.Timeout;
	private _light?: Light;
	private _idleLightPos: Vector3Like = { x: 0, y: -4096, z: 0 };
	private _endPoint?: Vector3Like;
	private _usesLight: boolean = false;

	public constructor(origin: Vector3Like, direction: Vector3Like, opts: TracerOptions = {}) {
		super({
      name: 'bullet_tracer',
      modelUri: opts.modelUri ?? 'models/projectiles/bullet.glb',
      modelScale: opts.modelScale ?? 0.4,
    });
		    // Store constructor options for optional light overrides upon spawn
		(this as any)._ctorOptions = opts;
		// Normalize direction
		const len = Math.hypot(direction.x, direction.y, direction.z) || 1;
		this._direction = { x: direction.x / len, y: direction.y / len, z: direction.z / len };
		this._speed = Math.max(6, Math.min(800, opts.speed ?? 60));
		this._endPoint = opts.endPoint;
		if (this._endPoint && opts.lifetimeMs === undefined) {
			// Auto-compute lifetime to guarantee arrival at endpoint (with small buffer)
			const dx = this._endPoint.x - origin.x;
			const dy = this._endPoint.y - origin.y;
			const dz = this._endPoint.z - origin.z;
			const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
			const timeMs = Math.ceil((distance / this._speed) * 1000) + 100; // +buffer
			this._lifetimeMs = Math.max(100, Math.min(8000, timeMs));
		} else {
			this._lifetimeMs = Math.max(40, Math.min(2000, opts.lifetimeMs ?? 90));
		}
		this.setPosition(origin);
	}

	public override spawn(world: World, position?: Vector3Like): void {
		super.spawn(world, (position ?? this.position) as Vector3Like);
		try {
			const canUseLight = BulletTracerEntity._activeLights < BulletTracerEntity.maxActiveLights;
			if (canUseLight) {
				this._light = new Light({
					position: this.position,
					color: { r: 255, g: 220, b: 120 },
					intensity: 3.5,
				});
				this._light.spawn(world);
				this._usesLight = true;
				BulletTracerEntity._activeLights++;
				// Apply custom color/intensity if provided on construction options
				try {
					const anyThis: any = this as any;
					const _opts: TracerOptions | undefined = anyThis._ctorOptions;
					if (_opts?.color) this._light.setColor?.(_opts.color as any);
					if (_opts?.intensity !== undefined) this._light.setIntensity?.(_opts.intensity);
				} catch {}
			}
		} catch {}
		this._start();
	}

	private _start(): void {
		const stepMs = 16;
		this._tick = setInterval(() => {
			try {
				const dt = stepMs / 1000;
				const pos = this.position;
				let next = {
					x: pos.x + this._direction.x * this._speed * dt,
					y: pos.y + this._direction.y * this._speed * dt,
					z: pos.z + this._direction.z * this._speed * dt,
				};
				// If an endpoint is provided, clamp step to not overshoot so we reach exact hit point visually
				if (this._endPoint) {
					const toEnd = {
						x: this._endPoint.x - pos.x,
						y: this._endPoint.y - pos.y,
						z: this._endPoint.z - pos.z,
					};
					const step = {
						x: next.x - pos.x,
						y: next.y - pos.y,
						z: next.z - pos.z,
					};
					const dot = toEnd.x * step.x + toEnd.y * step.y + toEnd.z * step.z;
					const endDist2 = toEnd.x * toEnd.x + toEnd.y * toEnd.y + toEnd.z * toEnd.z;
					if (dot >= endDist2) {
						next = { ...this._endPoint };
					}
				}
				this.setPosition(next);
				try { this._light?.setPosition(next); } catch {}
				this._elapsedMs += stepMs;
				if (this._endPoint) {
					const distToEnd = Math.hypot(next.x - this._endPoint.x, next.y - this._endPoint.y, next.z - this._endPoint.z);
					if (distToEnd < 0.02) {
						this._cleanup();
						return;
					}
					// Safety cutoff in case endpoint is unreachable due to world changes
					if (this._elapsedMs >= this._lifetimeMs) {
						this._cleanup();
						return;
					}
				} else if (this._elapsedMs >= this._lifetimeMs) {
					this._cleanup();
				}
			} catch {
				this._cleanup();
			}
		}, stepMs);
	}

	private _cleanup(): void {
		if (this._tick) { clearInterval(this._tick); this._tick = undefined; }
		try { this._light?.setIntensity(0); } catch {}
		try { this._light?.setPosition(this._idleLightPos); } catch {}
		try { this._light?.despawn(); } catch {}
		if (this._usesLight && BulletTracerEntity._activeLights > 0) {
			BulletTracerEntity._activeLights--;
		}
		this._light = undefined;
		try { this.despawn(); } catch {}
	}
}


