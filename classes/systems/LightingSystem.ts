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

  // Sky colors tuned for bright, partly cloudy
  private readonly SKY_ZENITH_COLOR: RgbColor = { r: 120, g: 180, b: 235 }; // deeper/cooler blue
  private readonly SKY_HORIZON_COLOR: RgbColor = { r: 190, g: 210, b: 235 }; // lighter horizon
  private readonly DEFAULT_FOG_COLOR: RgbColor = { r: 190, g: 200, b: 210 }; // slightly cool haze

  // Active settings
  private _sunAngleDeg = 88; // almost overhead, slightly off
  private _sunAzimuthDeg = 135; // due south-east
  private _sunOrbitRadius = 100;
  private _sunColor: RgbColor = { r: 255, g: 248, b: 240 }; // neutral-warm daylight (base)
  private _sunIntensity = 1.9; // brighter sun so outdoors stays bright (base)
  private _ambientColor: RgbColor | undefined;
  private _ambientIntensity = 0.04; // extremely low so interiors without sun access are very dark
  private _skyboxIntensity = 0.48; // bright sky under partial clouds
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

    // Elevation factor: 0 (horizon) .. 1 (overhead)
    const elev = this._computeElevation();
    // Blend sun color between warm (sunset) and neutral daylight based on elevation
    const warm: RgbColor = { r: 255, g: 205, b: 160 }; // ~4200K
    const neutral: RgbColor = this._sunColor; // base daylight tint
    const sunColor = this._blendColor(warm, neutral, Math.min(1, Math.max(0, Math.pow(elev, 0.6))));
    // Slightly dim at low elevation for a more cinematic contrast
    const sunIntensity = Math.max(0.8, this._sunIntensity * (0.8 + 0.4 * elev));

    this.world.setDirectionalLightPosition({ x, y, z });
    this.world.setDirectionalLightColor(sunColor);
    this.world.setDirectionalLightIntensity(sunIntensity);
  }

  private setupAmbient(): void {
    const elev = this._computeElevation();
    // Ambient color follows sky, slightly cooler at lower sun
    const baseSky = this._blendColor(this.SKY_ZENITH_COLOR, this.SKY_HORIZON_COLOR, 0.5);
    const coolBias: RgbColor = { r: 190, g: 205, b: 230 };
    const ambientColor = this._ambientColor ?? this._blendColor(baseSky, coolBias, 1 - Math.pow(elev, 0.7));
    // Couple ambient intensity to elevation but keep very low overall
    const ambientI = Math.max(0.02, Math.min(0.06, this._ambientIntensity * (0.75 + 0.5 * elev)));
    this.world.setAmbientLightColor(ambientColor);
    this.world.setAmbientLightIntensity(ambientI);
  }

  private setupSkybox(): void {
    const elev = this._computeElevation();
    const skyI = Math.max(0.25, Math.min(0.6, this._skyboxIntensity * (0.7 + 0.6 * elev)));
    this.world.setSkyboxIntensity(skyI);
  }

  private setupFog(): void {
    const elev = this._computeElevation();
    // Fog color leans warm at low sun, neutral at high
    const warmFog: RgbColor = { r: 210, g: 195, b: 185 };
    const neutralFog: RgbColor = this.DEFAULT_FOG_COLOR;
    const fogColor = this._fogColor ?? this._blendColor(warmFog, neutralFog, Math.pow(elev, 0.65));
    // Slight range modulation for depth perception
    const near = Math.max(25, Math.round(this._fogNear * (0.9 + 0.2 * elev)));
    const far = Math.max(near + 40, Math.round(this._fogFar * (0.85 + 0.3 * elev)));
    this.world.setFogColor(fogColor);
    this.world.setFogNear(near);
    this.world.setFogFar(far);
  }

  private _blendColor(a: RgbColor, b: RgbColor, t: number): RgbColor {
    const clamped = Math.max(0, Math.min(1, t));
    return {
      r: Math.round(a.r + (b.r - a.r) * clamped),
      g: Math.round(a.g + (b.g - a.g) * clamped),
      b: Math.round(a.b + (b.b - a.b) * clamped),
    };
  }

  // 0..1 elevation proxy from sun angle (0 = horizon, 1 = overhead)
  private _computeElevation(): number {
    const elev = Math.sin((this._sunAngleDeg * Math.PI) / 180);
    return Math.max(0, Math.min(1, elev));
  }
}

export default LightingSystem;


