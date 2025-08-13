import { 
  Audio,
  BaseEntityControllerEvent,
  DefaultPlayerEntity,
  DefaultPlayerEntityController,
  type EventPayloads,
  Player,
  PlayerCameraMode,
  type Vector3Like,
  type QuaternionLike,
  World,
  Quaternion,
  CollisionGroup,
  CollisionGroupsBuilder,
  Entity,
} from 'hytopia';

import Backpack from './systems/Backpack';
import Hotbar from './systems/Hotbar';
import MovementSystem from './systems/MovementSystem';
import RecoilSystem from './systems/RecoilSystem';
import MedkitSystem from './systems/MedkitSystem';
import FOVSystem from './systems/FovSystem';
import AudioSystem from './systems/AudioSystem';
import HealthSystem from './systems/HealthSystem';
import InputSystem from './systems/InputSystem';
import WeaponSystem from './systems/WeaponSystem';
import CameraSystem from './systems/CameraSystem';
import ProgressionSystem from './systems/ProgressionSystem';
import ExtractionSystem from './systems/ExtractionSystem';
import CompassSystem from './systems/CompassSystem';
import type BaseItem from './items/BaseItem';
import GamePlayer from './GamePlayer';
import type { SerializedItemInventoryData } from './systems/ItemInventory';
import { DeathSystem } from './systems/DeathSystem';
import { DamageSystem } from './systems/DamageSystem';

const UNARMED_ANIMATIONS = {
  IDLE: ['idle_lower'],
  WALK: ['walk_lower'],
  RUN: ['run_lower']
};

const ARMED_ANIMATIONS = {
  IDLE: ['idle_lower', 'idle_upper'],
  WALK: ['walk_lower'],
  RUN: ['run_lower']
};

interface PlayerPersistedData extends Record<string, unknown> {
  backpack: SerializedItemInventoryData;
  hotbar: SerializedItemInventoryData;
  weaponAmmoData: { [weaponId: string]: { ammo: number; totalAmmo: number } };
}

const BASE_HEALTH = 100;
const HEAL_TICK_RATE_MS = 1000;
const HEAL_AMOUNT_PER_TICK = 1;

export default class GamePlayerEntity extends DefaultPlayerEntity {
  public health: number;
  public maxHealth: number;
  public lastDamageSource: GamePlayerEntity | undefined;
  
  public readonly gamePlayer: GamePlayer;
  
  // Systems
  private _movementSystem: MovementSystem;
  private _recoilSystem: RecoilSystem;
  private _medkitSystem: MedkitSystem;
  private _fovSystem: FOVSystem;
  private _soundSystem: AudioSystem;
  private _healthSystem: HealthSystem;
  private _inputSystem: InputSystem;
  private _weaponSystem: WeaponSystem;
  private _cameraSystem: CameraSystem;
  private _extractionSystem: ExtractionSystem;

  // Unarmed combat properties
  private _lastUnarmedAttackTime: number = 0;
  private _unarmedAttackAudio: Audio;
  private _unarmedHitAudio: Audio;

  private _compassSystem: CompassSystem;

  public get playerController(): DefaultPlayerEntityController {
    return this.controller as DefaultPlayerEntityController;
  }

  public get isDead(): boolean {
    return this._healthSystem.isDead;
  }

  public canTakeDamage(): boolean {
    return this._healthSystem.canTakeDamage();
  }

  public get movementSystem(): MovementSystem {
    return this._movementSystem;
  }

  public performUnarmedAttack(): void {
    if (!this.world || this.isDead) return;

    // Check attack cooldown (prevent spam)
    const now = performance.now();
    if (this._lastUnarmedAttackTime && now - this._lastUnarmedAttackTime < 333) {
      return; // 0.33 second cooldown between punches
    }
    this._lastUnarmedAttackTime = now;

    // Play punch animation
    this.startModelOneshotAnimations(['simple_interact']);

    // Play punch sound
    if (this._unarmedAttackAudio) {
      this._unarmedAttackAudio.play(this.world, true);
    }

    // Perform raycast to detect hits
    const { origin, direction } = this.getUnarmedAttackOriginDirection();
    const raycastHit = this.world.simulation.raycast(origin, direction, 2, {
      filterExcludeRigidBody: this.rawRigidBody,
    });

    if (raycastHit?.hitEntity) {
      this._handleUnarmedHit(raycastHit.hitEntity, direction);
    }
  }

  private getUnarmedAttackOriginDirection(): { origin: Vector3Like, direction: Vector3Like } {
    const { x, y, z } = this.position;
    const cameraYOffset = this.player.camera.offset.y;
    const direction = this.player.camera.facingDirection;
    
    return {
      origin: { x, y: y + cameraYOffset, z },
      direction
    };
  }

  private _handleUnarmedHit(hitEntity: Entity, hitDirection: Vector3Like): void {
    if (!(hitEntity instanceof GamePlayerEntity) || hitEntity.isDead) return;
    
    // Deal 1 heart (20 damage) to the target
    const damage = 20;
    
    // Apply damage using DamageSystem for proper tracking
    const damageResult = DamageSystem.instance.applyDamage(hitEntity, damage, hitDirection, this);
    
    // Apply knockback to the hit player
    const knockbackDistance = 1.6; // Distance to push the player back
    const currentPos = hitEntity.position;
    const newPosition = {
      x: currentPos.x + (hitDirection.x * knockbackDistance),
      y: currentPos.y, // Keep same Y position
      z: currentPos.z + (hitDirection.z * knockbackDistance),
    };
    
    try {
      const impulse = {
        x: hitDirection.x * 15.0,
        y: 0,
        z: hitDirection.z * 15.0,
      };
      hitEntity.applyImpulse(impulse);
      
      setTimeout(() => {
        hitEntity.setPosition(newPosition);
      }, 50);
    } catch (error) {
      console.error(`🥊 Failed to apply knockback:`, error);
    }
    
    // Play hitmarker sound for the attacker (this entity)
    if (this._unarmedHitAudio && this.world) {
      this._unarmedHitAudio.play(this.world, true);
    }
    
    // Send hitmarker UI feedback to the attacker
    this.player.ui.sendData({
      type: 'hitmarker',
      hit: true,
      kill: damageResult.targetKilled
    });
  }

  public get recoilSystem(): RecoilSystem {
    return this._recoilSystem;
  }

  public get weaponSystem(): WeaponSystem {
    return this._weaponSystem;
  }

  public get medkitSystem(): MedkitSystem {
    return this._medkitSystem;
  }

  public get healthSystem(): HealthSystem {
    return this._healthSystem;
  }

  public constructor(gamePlayer: GamePlayer) {
    super({
      player: gamePlayer.player,
      name: 'Player',
      modelUri: 'models/players/soldier-player.gltf',
      modelScale: 0.6,
    });
    
    this.gamePlayer = gamePlayer;
    this.health = 100; // Will be set by HealthSystem
    this.maxHealth = 100; // Will be set by HealthSystem
    this.lastDamageSource = undefined;

    this._movementSystem = new MovementSystem();
    this._recoilSystem = new RecoilSystem(gamePlayer.player);
    this._medkitSystem = new MedkitSystem(this);
    this._fovSystem = new FOVSystem(this);
    // world-level audio singleton
    const world = (gamePlayer.player.world as any);
    const playlist = [
      'audio/music/Battlefield Shadows.mp3',
      'audio/music/Chaos Unleashed.mp3',
    ];
    if (world) {
      (world as any).audioSystem = (world as any).audioSystem || new AudioSystem(world, playlist);
    }
    this._soundSystem = (world as any).audioSystem || new AudioSystem(world, playlist);
    this._healthSystem = new HealthSystem(this);
    this._inputSystem = new InputSystem(this);
    this._weaponSystem = new WeaponSystem(this, this._movementSystem);
    this._cameraSystem = new CameraSystem(this, this._recoilSystem);
    this._extractionSystem = new ExtractionSystem(this);
    this._compassSystem = new CompassSystem();

    // Initialize unarmed combat audio
    this._unarmedAttackAudio = new Audio({
      attachedToEntity: this,
      uri: 'audio/sfx/player/player-swing-woosh.mp3',
      volume: 0.3,
      referenceDistance: 3,
      cutoffDistance: 15,
    });

    this._unarmedHitAudio = new Audio({
      uri: 'audio/sfx/sfx/hitmarker.wav',
      volume: 0.6,
    });

    this._setupController();
    this._setupCamera();
    this._setupAudio();
  }

  public override async spawn(world: World, position: Vector3Like, rotation?: QuaternionLike): Promise<void> {
    super.spawn(world, position, rotation);
    this.gamePlayer.onEntitySpawned(this);
    
    // Initialize systems
    this._healthSystem.initialize();
    this._cameraSystem.setup();
    
    // Force UI sync to ensure client and server are in sync
    this._healthSystem.forceUISync();
    
    // Setup movement system with controller to apply walk/sprint speeds
    this._movementSystem.setupController(this.playerController);
    
    // Reduce jump height
    this.playerController.jumpVelocity = 7.0;

    // Start playtime XP ticker
    this._startPlaytimeXPTicker();
  }

  public override despawn(): void {
    this._stopPlaytimeXPTicker();
    this._healthSystem.cleanup();
    this._medkitSystem.cleanup();
    this._extractionSystem.cleanup();
    super.despawn();
  }
  

  public takeDamage(damage: number, direction?: Vector3Like) {
    this._healthSystem.takeDamage(damage);
    
    if (this._healthSystem.isDead) {
      // Death is handled by HealthSystem
    } else {
      this._soundSystem.play('audio/sfx/damage/fall-small.mp3', { volume: 0.8, x: this.position.x, y: this.position.y, z: this.position.z, ref: 1, cut: 10 });
    }
  }

  private _onTickWithPlayerInput = (payload: EventPayloads[BaseEntityControllerEvent.TICK_WITH_PLAYER_INPUT]) => {
    const { input } = payload;

    if (this.isDead) {
      return;
    }

    // Update compass HUD regardless of inventory state
    this._compassSystem.update(this);

    // Update extraction regardless of inventory state
    this._extractionSystem.update();
    // Extraction may despawn this entity during update; bail out if no longer spawned
    if (!this.world) {
      return;
    }

    // Handle input through InputSystem
    this._inputSystem.handleInput(input);

    // Only process movement if not in inventory
    if (!this._inputSystem.shouldProcessMovement()) {
      return;
    }
    
    const movementState = this._movementSystem.updateMovement(input);
    
    // Update FOV based on sprint state
    this._fovSystem.update(this._movementSystem.isSprinting());
    
    // Update weapon state with correct input type
    this._weaponSystem.updateWeapon(input);
    
    // Update systems
    this._recoilSystem.updateRecovery();
    this._cameraSystem.updateRecoil();
    this._medkitSystem.update();
    
    // Validate health synchronization periodically
    this._healthSystem.validateAndCorrectHealth();
  }

  // Compass handled by CompassSystem

  private _setupController(): void {
    this.playerController.applyDirectionalMovementRotations = false;
    this.playerController.on(BaseEntityControllerEvent.TICK_WITH_PLAYER_INPUT, this._onTickWithPlayerInput);
    
    // Setup movement system with controller to apply walk/sprint speeds
    this._movementSystem.setupController(this.playerController);
    
    // Reduce jump height
    this.playerController.jumpVelocity = 7.0; // Reduced from default 10.0
  }

  private _playtimeInterval: NodeJS.Timeout | null = null;
  private _lastPlaytimeTick: number = Date.now();
  private _startPlaytimeXPTicker(): void {
    this._stopPlaytimeXPTicker();
    this._lastPlaytimeTick = Date.now();
    this._playtimeInterval = setInterval(() => {
      const now = Date.now();
      const elapsed = now - this._lastPlaytimeTick;
      this._lastPlaytimeTick = now;
      ProgressionSystem.addPlaytimeXP(this.player, elapsed);
    }, 5000);
  }

  private _stopPlaytimeXPTicker(): void {
    if (this._playtimeInterval) {
      clearInterval(this._playtimeInterval);
      this._playtimeInterval = null;
    }
  }

  private _setupCamera(): void {
    // Camera setup is now handled by CameraSystem
  }

  private _setupAudio(): void {
    // Audio is now handled by SoundSystem
  }

  private async _loadPersistedData(): Promise<void> {
    try {
      const persistedData = this.gamePlayer.player.getPersistedData();
      if (persistedData) {
        const data = persistedData as PlayerPersistedData;
        if (data.weaponAmmoData) {
          // Weapon ammo data is now handled by WeaponItem instances
        }
      }
    } catch (error) {
      console.error('Failed to load persisted data:', error);
    }
  }

  private _savePersistedData(): void {
    this.gamePlayer.save();
  }
}

