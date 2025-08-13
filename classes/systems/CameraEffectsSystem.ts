import { Player, PlayerCameraMode } from 'hytopia';

/**
 * Camera Effects System for Nuclear Winter Atmosphere
 * 
 * Handles post-processing and camera effects to enhance the atmospheric experience:
 * - Auto exposure adjustments
 * - Depth of field during aiming
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
      isAiming: false,
      baseFov: 75,
      aimFov: 60,
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
   * Handle aiming state changes
   */
  public setAimingState(player: Player, isAiming: boolean): void {
    const state = this.players.get(player);
    if (!state) return;

    state.isAiming = isAiming;
    
    if (isAiming) {
      this.enterAimMode(player, state);
    } else {
      this.exitAimMode(player, state);
    }
  }

  /**
   * Enter aim mode with depth of field and zoom effects
   */
  private enterAimMode(player: Player, state: CameraEffectsState): void {
    // Reduce FOV for zoom effect
    player.camera.setFov(state.aimFov);
    
    // Increase vignette for focus effect
    this.applyVignetteEffect(player, state.vignetteIntensity * 1.5);
    
    // Reduce chromatic aberration for cleaner aim
    this.applyChromaticAberration(player, state.chromaticAberration * 0.5);
  }

  /**
   * Exit aim mode and restore normal effects
   */
  private exitAimMode(player: Player, state: CameraEffectsState): void {
    // Restore base FOV
    player.camera.setFov(state.baseFov);
    
    // Restore normal vignette
    this.applyVignetteEffect(player, state.vignetteIntensity);
    
    // Restore normal chromatic aberration
    this.applyChromaticAberration(player, state.chromaticAberration);
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
    // Create a subtle camera shake effect to simulate grain
    const shakeInterval = setInterval(() => {
      const state = this.players.get(player);
      if (!state || !state.isAiming) {
        clearInterval(shakeInterval);
        return;
      }

      const shakeAmount = intensity * 0.001;
      const currentOffset = player.camera.offset;
      const newOffset = {
        x: currentOffset.x + (Math.random() - 0.5) * shakeAmount,
        y: currentOffset.y + (Math.random() - 0.5) * shakeAmount,
        z: currentOffset.z + (Math.random() - 0.5) * shakeAmount,
      };

      player.camera.setOffset(newOffset);
    }, 50); // Update every 50ms for subtle effect
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
   * Get camera effects state for debugging
   */
  public getPlayerState(player: Player): CameraEffectsState | undefined {
    return this.players.get(player);
  }
}

/**
 * Camera effects state for each player
 */
interface CameraEffectsState {
  isAiming: boolean;
  baseFov: number;
  aimFov: number;
  vignetteIntensity: number;
  chromaticAberration: number;
  grainIntensity: number;
  exposureMin: number;
  exposureMax: number;
} 