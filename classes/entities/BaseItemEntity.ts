import { Entity, SceneUI, type EntityOptions, Collider, ColliderShape, RigidBodyType } from 'hytopia';
import type BaseItem from '../items/BaseItem';
import type GamePlayerEntity from '../GamePlayerEntity';

export type BaseItemEntityOptions = {
  item: BaseItem;
} & EntityOptions;

const GENERIC_ITEM_MODEL_URI = 'models/items/cube.glb';
const GENERIC_ITEM_MODEL_SCALE = 0.03;
const PICKUP_COLLIDER_SCALE_MULTIPLIER = 4;

type RarityKey = 'common' | 'unusual' | 'rare' | 'epic' | 'legendary';
type RgbColor = { r: number; g: number; b: number };

const RARITY_COLORS: Record<RarityKey, RgbColor> = {
  common: { r: 156, g: 163, b: 175 },
  unusual: { r: 34, g: 197, b: 94 },
  rare: { r: 59, g: 130, b: 246 },
  epic: { r: 168, g: 85, b: 247 },
  legendary: { r: 245, g: 158, b: 11 },
};

export default class BaseItemEntity extends Entity {
  private readonly _item: BaseItem;
  private _interactSceneUI: SceneUI | undefined;

  public constructor(options: BaseItemEntityOptions) {
    // Create an enlarged collision area for easy pickup
    const enhancedOptions = {
      ...options,
      modelUri: GENERIC_ITEM_MODEL_URI,
      modelScale: GENERIC_ITEM_MODEL_SCALE,
      rigidBodyOptions: {
        type: RigidBodyType.DYNAMIC,
        colliders: [
          Collider.optionsFromModelUri(
            GENERIC_ITEM_MODEL_URI,
            GENERIC_ITEM_MODEL_SCALE * PICKUP_COLLIDER_SCALE_MULTIPLIER,
            ColliderShape.BLOCK
          )
        ],
      },
    };

    super(enhancedOptions);
    this._item = options.item;
  }

  public get item(): BaseItem { return this._item; }
  public get interactActionText(): string { return `Press "F" to pick up ${this._item.name}`; }

  public interact(interactor: GamePlayerEntity): void {
    const addedToHotbar = interactor.gamePlayer.hotbar.addItem(this._item);
    const addedToBackpack = addedToHotbar ? false : interactor.gamePlayer.backpack.addItem(this._item);
    if (addedToHotbar || addedToBackpack) {
      this.despawn();
    }
  }

  public override despawn(): void {
    this._interactSceneUI?.unload();
    this._interactSceneUI = undefined;
    super.despawn();
  }

  public loadInteractUI(): void {
    if (this._interactSceneUI || !this.world) return;
    const rarityColor = this.getRarityColor(this._item.rarity);
    this._interactSceneUI = new SceneUI({
      attachedToEntity: this,
      offset: { x: 0, y: 0.5, z: 0 },
      templateId: 'item-nameplate',
      viewDistance: 12,
      state: {
        name: this._item.name,
        iconImageUri: this._item.iconImageUri,
        quantity: this._item.quantity,
        rarityColor: rarityColor,
        showPickupArea: true, // Add flag to show pickup area indicator
      },
    });
    this._interactSceneUI.load(this.world);
  }

  private getRarityColor(rarity: string): RgbColor {
    const key = (rarity || 'common').toLowerCase() as RarityKey;
    return RARITY_COLORS[key] ?? RARITY_COLORS.common;
  }
} 