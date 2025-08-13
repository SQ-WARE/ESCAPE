import type { RgbColor } from 'hytopia';
import { World } from 'hytopia';

/**
 * Unified lighting manager for the game.
 * - Applies realistic midday sun with configurable presets
 * - Keeps interiors dark via low ambient levels
 * - Optionally enables dynamic indoor helper lighting
 */
export class LightingSystem {
  private readonly world: World;
  // DynamicLightingSystem removed
  private isInitialized = false;

  // Sky colors
  private readonly SKY_ZENITH_COLOR: RgbColor = { r: 135, g: 206, b: 235 }; // sky blue
  private readonly SKY_HORIZON_COLOR: RgbColor = { r: 173, g: 216, b: 230 }; // light sky
  private readonly DEFAULT_FOG_COLOR: RgbColor = { r: 200, g: 200, b: 200 }; // neutral gray

  // Active settings
  private _sunAngleDeg = 84; // higher midday for shorter shadows
  private _sunAzimuthDeg = 45;
  private _sunOrbitRadius = 100;
  private _sunColor: RgbColor = { r: 255, g: 248, b: 240 }; // neutral-warm daylight
  private _sunIntensity = 1.9; // brighter sun so outdoors stays bright
  private _ambientColor: RgbColor | undefined;
  private _ambientIntensity = 0.04; // extremely low so interiors without sun access are very dark
  private _skyboxIntensity = 0.40; // reduced skylight contribution
  private _fogNear = 35;
  private _fogFar = 160;
  private _fogColor: RgbColor | undefined;

  public constructor(world: World) {
    this.world = world;
  }

  public initialize(): void {
    if (this.isInitialized) return;
    this.apply();
    this.isInitialized = true;
  }

  public apply(): void {
    this.setupSunlight();
    this.setupAmbient();
    this.setupFog();
    this.setupSkybox();
  }

  // Note: No presets; values above define the lighting system.

  private setupSunlight(): void {
    const angleRad = (this._sunAngleDeg * Math.PI) / 180;
    const azimuthRad = (this._sunAzimuthDeg * Math.PI) / 180;
    const y = Math.sin(angleRad) * this._sunOrbitRadius;
    const x = Math.cos(azimuthRad) * Math.cos(angleRad) * this._sunOrbitRadius;
    const z = Math.sin(azimuthRad) * Math.cos(angleRad) * this._sunOrbitRadius;
    this.world.setDirectionalLightPosition({ x, y, z });
    this.world.setDirectionalLightColor(this._sunColor);
    this.world.setDirectionalLightIntensity(this._sunIntensity);
  }

  private setupAmbient(): void {
    const ambientColor = this._ambientColor ?? this._blendColor(this.SKY_ZENITH_COLOR, this.SKY_HORIZON_COLOR, 0.5);
    this.world.setAmbientLightColor(ambientColor);
    this.world.setAmbientLightIntensity(this._ambientIntensity);
  }

  private setupSkybox(): void {
    this.world.setSkyboxIntensity(this._skyboxIntensity);
  }

  private setupFog(): void {
    this.world.setFogColor(this._fogColor ?? this.DEFAULT_FOG_COLOR);
    this.world.setFogNear(this._fogNear);
    this.world.setFogFar(this._fogFar);
  }

  private _blendColor(a: RgbColor, b: RgbColor, t: number): RgbColor {
    const clamped = Math.max(0, Math.min(1, t));
    return {
      r: Math.round(a.r + (b.r - a.r) * clamped),
      g: Math.round(a.g + (b.g - a.g) * clamped),
      b: Math.round(a.b + (b.b - a.b) * clamped),
    };
  }
}

export default LightingSystem;


