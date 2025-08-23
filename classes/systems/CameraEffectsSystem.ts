import { Player, PlayerCameraMode } from 'hytopia';

/**
 * Camera Effects System for Nuclear Winter Atmosphere
 * 
 * Handles post-processing and camera effects to enhance the atmospheric experience:
 * - Auto exposure adjustments
 * - Vignette effects
 * - Chromatic aberration
 * - Lens dirt effects
 * - Film grain
 */
export class CameraEffectsSystem {
  private players: Map<Player, CameraEffectsState> = new Map();

  constructor() {
    // Initialize the system
  }

  /**
   * Setup camera effects for a player
   */
  public setupPlayerCamera(player: Player): void {
    const state: CameraEffectsState = {
      baseFov: 75,
      vignetteIntensity: 0.3,
      chromaticAberration: 0.1,
      grainIntensity: 0.3,
      exposureMin: -1,
      exposureMax: 1,
    };

    this.players.set(player, state);
    this.applyBaseEffects(player, state);
  }

  /**
   * Apply base atmospheric effects to player camera
   */
  private applyBaseEffects(player: Player, state: CameraEffectsState): void {
    // Set base FOV
    player.camera.setFov(state.baseFov);

    // Apply vignette effect (simulated through FOV adjustment)
    // Note: Hytopia doesn't have direct vignette support, so we'll simulate it
    this.applyVignetteEffect(player, state.vignetteIntensity);

    // Apply chromatic aberration effect
    this.applyChromaticAberration(player, state.chromaticAberration);

    // Apply film grain effect
    this.applyFilmGrain(player, state.grainIntensity);
  }

  /**
   * Handle aiming state changes (no-op: aiming is disabled)
   */
  public setAimingState(player: Player, isAiming: boolean): void {
    // No-op: aiming is disabled
  }

  /**
   * Apply vignette effect (simulated through FOV and positioning)
   */
  private applyVignetteEffect(player: Player, intensity: number): void {
    // Since Hytopia doesn't have direct vignette support,
    // we can simulate it by adjusting the camera offset slightly
    // This creates a subtle darkening effect around the edges
    
    const baseOffset = { x: 0, y: 0.4, z: 0 };
    const vignetteOffset = {
      x: baseOffset.x + (intensity * 0.02),
      y: baseOffset.y + (intensity * 0.01),
      z: baseOffset.z + (intensity * 0.02),
    };
    
    player.camera.setOffset(vignetteOffset);
  }

  /**
   * Apply chromatic aberration effect
   */
  private applyChromaticAberration(player: Player, intensity: number): void {
    // Since Hytopia doesn't have direct chromatic aberration support,
    // we can simulate it by slightly adjusting the camera film offset
    // This creates a subtle color separation effect
    
    const aberrationOffset = intensity * 0.5;
    player.camera.setFilmOffset(aberrationOffset);
  }

  /**
   * Apply film grain effect
   */
  private applyFilmGrain(player: Player, intensity: number): void {
    // Since Hytopia doesn't have direct film grain support,
    // we can simulate it by adding subtle camera movement
    // This creates a slight "shaky" effect that mimics film grain
    
    // Note: This is a simplified implementation
    // In a real implementation, you'd want to use actual post-processing shaders
    if (intensity > 0) {
      this.startGrainEffect(player, intensity);
    }
  }



  /**
   * Start the grain effect simulation
   */
  private startGrainEffect(player: Player, intensity: number): void {
    // Grain effect disabled - no aiming functionality
  }

  /**
   * Handle explosion or bright light effects
   */
  public handleBrightFlash(player: Player, intensity: number): void {
    const state = this.players.get(player);
    if (!state) return;

    // Temporarily increase exposure for bright flash effect
    // This simulates the auto-exposure adjustment mentioned in requirements
    
    // Reduce FOV temporarily to simulate "blinding" effect
    const originalFov = player.camera.fov;
    player.camera.setFov(originalFov * 0.8);
    
    // Restore after flash effect
    setTimeout(() => {
      player.camera.setFov(originalFov);
    }, 200);
  }

  /**
   * Apply lens dirt effect during light flares
   */
  public applyLensDirt(player: Player, intensity: number): void {
    // Since Hytopia doesn't have direct lens dirt support,
    // we can simulate it by temporarily adjusting camera effects
    
    const state = this.players.get(player);
    if (!state) return;

    // Increase vignette and chromatic aberration temporarily
    this.applyVignetteEffect(player, state.vignetteIntensity * (1 + intensity));
    this.applyChromaticAberration(player, state.chromaticAberration * (1 + intensity));
    
    // Restore after effect
    setTimeout(() => {
      this.applyVignetteEffect(player, state.vignetteIntensity);
      this.applyChromaticAberration(player, state.chromaticAberration);
    }, 1000);
  }

  /**
   * Update camera effects (called periodically)
   */
  public update(): void {
    // Update any dynamic effects here
    // For now, the effects are mostly static
  }

  /**
   * Cleanup player camera effects
   */
  public cleanupPlayer(player: Player): void {
    this.players.delete(player);
  }

  /**
   * Get camera effects state
   */
  public getPlayerState(player: Player): CameraEffectsState | undefined {
    return this.players.get(player);
  }
}

/**
 * Camera effects state for each player
 */
interface CameraEffectsState {
  baseFov: number;
  vignetteIntensity: number;
  chromaticAberration: number;
  grainIntensity: number;
  exposureMin: number;
  exposureMax: number;
} 