import {
  type QuaternionLike,
  type RgbColor,
  type Vector3Like,
  type World,
  Entity,
  EntityEvent,
  Collider,
  ColliderShape,
  RigidBodyType,
  CollisionGroup,
} from 'hytopia';
import BaseItemEntity from '../entities/BaseItemEntity';
import CustomCollisionGroup from '../physics/CustomCollisionGroup';

const DEFAULT_MODEL_CHILD_RELATIVE_POSITION = { x: -0.025, y: 0, z: -0.15 };
const DEFAULT_MODEL_URI = 'models/items/pistol_m9.glb';
const DEFAULT_MODEL_SCALE = 0.5;

export const RARITY_RGB_COLORS: Record<ItemRarity, RgbColor> = {
  common: { r: 180, g: 180, b: 180 },
  unusual: { r: 100, g: 200, b: 100 },
  rare: { r: 64, g: 156, b: 255 },
  epic: { r: 147, g: 51, b: 234 },
  legendary: { r: 245, g: 158, b: 11 },
  utopian: { r: 239, g: 68, b: 68 },
};

export type ItemClass = typeof BaseItem;

export type ItemRarity = 'common' | 'unusual' | 'rare' | 'epic' | 'legendary' | 'utopian';

export type ItemOverrides = {
  quantity?: number;
};

export default abstract class BaseItem {
  static readonly id: string;
  static readonly name: string;
  static readonly iconImageUri: string;
  static readonly description: string = '';
  static readonly dropModelUri?: string = undefined;
  static readonly dropModelScale: number = DEFAULT_MODEL_SCALE;
  static readonly dropModelTintColor?: RgbColor = undefined;
  static readonly heldModelUri?: string = undefined;
  static readonly heldModelScale: number = DEFAULT_MODEL_SCALE;
  static readonly heldModelTintColor?: RgbColor = undefined;
  static readonly defaultRelativePositionAsChild: Vector3Like = DEFAULT_MODEL_CHILD_RELATIVE_POSITION;
  static readonly defaultRelativeRotationAsChild?: QuaternionLike = undefined;
  static readonly rarity: ItemRarity = 'common';
  static readonly stackable: boolean = false;

  static create(overrides?: ItemOverrides): BaseItem {
    const ItemClass = this as any;
    return new ItemClass(overrides);
  }

  public get id(): string { return (this.constructor as typeof BaseItem).id; }
  public get name(): string { return (this.constructor as typeof BaseItem).name; }
  public get iconImageUri(): string { return (this.constructor as typeof BaseItem).iconImageUri; }
  public get description(): string { return (this.constructor as typeof BaseItem).description; }
  public get dropModelUri(): string | undefined { return (this.constructor as typeof BaseItem).dropModelUri; }
  public get dropModelScale(): number { return (this.constructor as typeof BaseItem).dropModelScale; }
  public get dropModelTintColor(): RgbColor | undefined { return (this.constructor as typeof BaseItem).dropModelTintColor; }
  public get heldModelUri(): string | undefined { return (this.constructor as typeof BaseItem).heldModelUri; }
  public get heldModelScale(): number { return (this.constructor as typeof BaseItem).heldModelScale; }
  public get heldModelTintColor(): RgbColor | undefined { return (this.constructor as typeof BaseItem).heldModelTintColor; }
  public get defaultRelativePositionAsChild(): Vector3Like { return (this.constructor as typeof BaseItem).defaultRelativePositionAsChild; }
  public get defaultRelativeRotationAsChild(): QuaternionLike | undefined { return (this.constructor as typeof BaseItem).defaultRelativeRotationAsChild; }
  public get rarity(): ItemRarity { return (this.constructor as typeof BaseItem).rarity; }
  public get stackable(): boolean { return (this.constructor as typeof BaseItem).stackable; }

  private _quantity: number = 1;
  private _entity: BaseItemEntity | undefined;

  public constructor(overrides?: ItemOverrides) {
    const staticClass = this.constructor as typeof BaseItem;
    if (staticClass.stackable && overrides?.quantity) {
      this._quantity = overrides.quantity;
    }
  }

  public get quantity(): number { return this._quantity; }
  public get entity(): BaseItemEntity | undefined { return this._entity; }

  public adjustQuantity(quantity: number): void {
    if (!this.stackable) {
      console.warn(`BaseItem.adjustQuantity(): Item ${this.name} is not stackable.`);
      return;
    }
    this._quantity += quantity;
  }

  public clone(overrides?: ItemOverrides): BaseItem {
    const ItemClass = this.constructor as any;
    return new ItemClass({
      quantity: this._quantity,
      ...overrides,
    });
  }

  public setQuantity(quantity: number): void {
    if (!this.stackable && quantity > 1) {
      console.warn(`BaseItem.setQuantity(): Item ${this.name} is not stackable.`);
      return;
    }
    this._quantity = quantity;
  }

  public despawnEntity(): void {
    if (!this._entity) return;
    if (!this._entity.isSpawned) return;
    this._entity.despawn();
    this._entity = undefined;
  }

  private _despawnCleanup(): void {
    this._entity = undefined;
  }

  public spawnEntityAsDrop(world: World, position: Vector3Like, rotation?: QuaternionLike): void {
    if (this._entity) return;
    
    // Create the entity with enhanced collision (handled by BaseItemEntity constructor)
    this._entity = new BaseItemEntity({
      item: this,
      name: this.name,
      modelUri: this.dropModelUri ?? this.heldModelUri ?? DEFAULT_MODEL_URI,
      modelScale: this.dropModelScale,
      tintColor: this.dropModelTintColor ?? RARITY_RGB_COLORS[this.rarity],
    });
    
    this._entity.on(EntityEvent.DESPAWN, () => this._despawnCleanup());
    this._entity.spawn(world, position, rotation);
    this._entity.loadInteractUI();
    
    // Set proper collision groups for items (like Frontiers)
    this._entity.setCollisionGroupsForSolidColliders({
      belongsTo: [ CollisionGroup.ENTITY ],
      collidesWith: [ CollisionGroup.BLOCK, CollisionGroup.ENVIRONMENT_ENTITY ],
    });
  }

  public spawnEntityAsEjectedDrop(world: World, position: Vector3Like, facingDirection?: Vector3Like): void {
    this.spawnEntityAsDrop(world, position);
    if (this._entity) {
      const mass = this._entity.mass;
      const angle = facingDirection 
        ? Math.atan2(facingDirection.z, facingDirection.x) + (Math.random() * Math.PI/2 - Math.PI/4)
        : Math.random() * Math.PI * 2;
      this._entity.applyImpulse({
        x: mass * Math.cos(angle) * 5,
        y: mass * 3.5,
        z: mass * Math.sin(angle) * 5,
      });
    }
  }

  public spawnEntityAsHeld(parent: Entity, parentNodeName?: string, relativePosition?: Vector3Like, relativeRotation?: QuaternionLike): void {
    if (this._entity) {
      console.warn('BaseItem: Item is already spawned.');
      return;
    }
    if (!parent.world) {
      console.warn('BaseItem: Parent entity must be spawned in a world.');
      return;
    }
    this._entity = new BaseItemEntity({
      item: this,
      name: this.name,
      modelUri: this.heldModelUri ?? DEFAULT_MODEL_URI,
      modelScale: this.heldModelScale,
      parent: parent,
      parentNodeName: parentNodeName,
    });
    this._entity.spawn(
      parent.world,
      relativePosition ?? this.defaultRelativePositionAsChild,
      relativeRotation ?? this.defaultRelativeRotationAsChild,
    );
    this._entity.setCollisionGroupsForSolidColliders({
      belongsTo: [ CollisionGroup.ENTITY ],
      collidesWith: [ CollisionGroup.BLOCK, CollisionGroup.ENVIRONMENT_ENTITY ],
    });
  }

  public useMouseLeft(): void {
    // Override in subclasses for usable items
  }

  public useMouseRight(): void {
    // Override in subclasses for usable items
  }
} 