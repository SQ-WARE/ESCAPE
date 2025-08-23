import type { Player } from 'hytopia';
import { WeaponFactory } from '../weapons/WeaponFactory';
import GamePlayer from '../GamePlayer';
import BaseItem from './BaseItem';
import PistolAmmoItem from './ammo/PistolAmmoItem';
import RifleAmmoItem from './ammo/RifleAmmoItem';
import SniperAmmoItem from './ammo/SniperAmmoItem';
import ShotgunAmmoItem from './ammo/ShotgunAmmoItem';
import NatoAmmoItem from './ammo/NatoAmmoItem';
import MedkitItem from './MedkitItem';
import EnergyDrinkItem from './consumables/EnergyDrinkItem';
import MREItem from './consumables/MREItem';
import WaterItem from './consumables/WaterItem';
import PainkillersItem from './consumables/PainkillersItem';
import BandagesItem from './consumables/BandagesItem';
import BackpackItem from './equipment/BackpackItem';
import TacticalVestItem from './equipment/TacticalVestItem';
import GogglesItem from './equipment/GogglesItem';
import LighterMatchesItem from './tools/LighterMatchesItem';
import ScrewsBoltsItem from './tools/ScrewsBoltsItem';
import FragGrenadeItem from './weapons/FragGrenadeItem';
import SmokeGrenadeItem from './weapons/SmokeGrenadeItem';
import DogTagsItem from './misc/DogTagsItem';
import GoldBarItem from './GoldBarItem';
import DiamondsItem from './DiamondsItem';


// Item categories for better organization
export enum ItemCategory {
  WEAPON = 'weapon',
  AMMO = 'ammo',
  CONSUMABLE = 'consumable',
  TOOL = 'tool',
  ARMOR = 'armor',
  VALUABLE = 'valuable',
  MISC = 'misc'
}

// Item data interface for consistent item information
export interface ItemData {
  id: string;
  name: string;
  description: string;
  category: ItemCategory;
  rarity: string;
  iconImageUri: string;
  maxQuantity?: number;
  buyPrice?: number;
  sellPrice?: number;
  stackable: boolean;
}

// Item creation options
export interface ItemCreationOptions {
  quantity?: number;
  [key: string]: any; // Allow additional properties for specific item types
}

// Item factory interface for different item types
export interface IItemFactory {
  canCreate(itemId: string): boolean;
  create(itemId: string, options?: ItemCreationOptions): BaseItem | null;
  getItemData(itemId: string): ItemData | null;
  getAllItemIds(): string[];
}

// Weapon factory implementation
class WeaponItemFactory implements IItemFactory {
  canCreate(itemId: string): boolean {
    return WeaponFactory.isValidWeaponId(itemId);
  }

  create(itemId: string, options?: ItemCreationOptions): BaseItem | null {
    try {
      return WeaponFactory.create(itemId, options);
    } catch (error) {
      return null;
    }
  }

  getItemData(itemId: string): ItemData | null {
    try {
      const weaponData = WeaponFactory.getWeaponData(itemId);
      if (!weaponData) return null;

      return {
        id: itemId,
        name: weaponData.name,
        description: weaponData.description || 'A weapon',
        category: ItemCategory.WEAPON,
        rarity: weaponData.rarity || 'common',
        iconImageUri: weaponData.assets?.ui?.icon || this.getIconForWeapon(itemId) || 'icons/weapon.png',
        stackable: false
      };
    } catch (error) {
      return null;
    }
  }

  getAllItemIds(): string[] {
    return WeaponFactory.getAllWeaponIds();
  }

  private getIconForWeapon(weaponId: string): string {
    const iconMap: Record<string, string> = {
      // Pistols
      'm9_beretta': 'icons/pistol_m9.png',
      'fn_502_tactical_fde': 'icons/pistol_fn_502.png',
      'desert_eagle': 'icons/pistol_deagle.png',
      'glock_17': 'icons/pistol_glock.png',
      
      // Rifles
      'akm': 'icons/rifle_akm.png',
      'spetsnaz_akm_nsb': 'icons/rifle_akm_silenced.png',
      
      // SMGs
      'mp5a2': 'icons/smg_mp5.png',
      'ingram_m6': 'icons/smg_ingram_m6.png',
      'hk_mp5k': 'icons/sub_mp5k.png',
      'hk_mp5sd': 'icons/sub_mp5k_silenced.png',
      
      // Snipers
      'asvkm': 'icons/sniper_asvkm.png',
      'victrix_corvo_v': 'icons/sniper_victrix.png',
      'sword_mk18_mjolnir': 'icons/sniper_mk18.png',
      
      // Shotguns
      'kbp_pp90_shotgun': 'icons/shotgun_kbp_pp90.png',
      
      // Default
      'default': 'icons/weapon.png'
    };

    return iconMap[weaponId] || iconMap['default'] || 'icons/weapon.png';
  }
}

// Ammo factory implementation
class AmmoItemFactory implements IItemFactory {
  private readonly ammoTypes = {
    'pistol_ammo': {
      name: '9×19mm Parabellum',
      description: 'Standard pistol ammunition',
      icon: 'icons/9mm.png',
      maxQuantity: 999
    },
    'rifle_ammo': {
      name: '7.62×39mm',
      description: 'Standard rifle ammunition',
      icon: 'icons/5.8mm.png',
      maxQuantity: 999
    },
    'sniper_ammo': {
      name: '12.7×108mm',
      description: 'High-powered sniper ammunition',
      icon: 'icons/12.7mm.png',
      maxQuantity: 999
    },
    'shotgun_ammo': {
      name: '12 Gauge',
      description: 'Shotgun shells',
      icon: 'icons/12gauge.png',
      maxQuantity: 999
    },
    'nato_ammo': {
      name: '5.56×45mm NATO',
      description: 'Standard NATO rifle ammunition with high accuracy and penetration',
      icon: 'icons/nato_ammo.png',
      maxQuantity: 999
    }
  };

  canCreate(itemId: string): boolean {
    return itemId in this.ammoTypes;
  }

  create(itemId: string, options?: ItemCreationOptions): BaseItem | null {
    try {
      const quantity = options?.quantity || 1;
      
      switch (itemId) {
        case 'pistol_ammo':
          return PistolAmmoItem.create({ quantity });
        case 'rifle_ammo':
          return RifleAmmoItem.create({ quantity });
        case 'sniper_ammo':
          return SniperAmmoItem.create({ quantity });
        case 'shotgun_ammo':
          return ShotgunAmmoItem.create({ quantity });
        case 'nato_ammo':
          return NatoAmmoItem.create({ quantity });
        default:
          return null;
      }
    } catch (error) {
      return null;
    }
  }

  getItemData(itemId: string): ItemData | null {
    const ammoData = this.ammoTypes[itemId as keyof typeof this.ammoTypes];
    if (!ammoData) return null;

    return {
      id: itemId,
      name: ammoData.name,
      description: ammoData.description,
      category: ItemCategory.AMMO,
      rarity: 'common',
      iconImageUri: ammoData.icon,
      maxQuantity: ammoData.maxQuantity,
      stackable: true
    };
  }

  getAllItemIds(): string[] {
    return Object.keys(this.ammoTypes);
  }
}

// Consumable factory implementation
class ConsumableItemFactory implements IItemFactory {
  private readonly consumableTypes = {
    'medkit': {
      name: 'Medkit',
      description: 'A medical kit that heals wounds and provides enhanced regeneration',
      icon: 'icons/medkit.png',
      maxQuantity: 10,
      rarity: 'common'
    },
    'energy_drink': {
      name: 'Energy Drink',
      description: 'High-caffeine energy drink that provides a temporary boost to stamina and movement speed',
      icon: 'icons/energy_drink.png',
      maxQuantity: 20,
      rarity: 'common'
    },
    'mre': {
      name: 'MRE (Meal Ready to Eat)',
      description: 'Self-contained individual field ration providing complete nutrition for extended operations',
      icon: 'icons/mre.png',
      maxQuantity: 15,
      rarity: 'common'
    },
    'water': {
      name: 'Water Bottle',
      description: 'Clean drinking water essential for hydration and survival in the field',
      icon: 'icons/water.png',
      maxQuantity: 30,
      rarity: 'common'
    },
    'painkillers': {
      name: 'Painkillers',
      description: 'Strong pain relief medication that reduces damage taken and improves combat effectiveness',
      icon: 'icons/painkillers.png',
      maxQuantity: 10,
      rarity: 'unusual'
    },
    'bandages': {
      name: 'Bandages',
      description: 'Medical bandages for treating wounds and stopping bleeding',
      icon: 'icons/bandages.png',
      maxQuantity: 25,
      rarity: 'common'
    }
  };

  canCreate(itemId: string): boolean {
    return itemId in this.consumableTypes;
  }

  create(itemId: string, options?: ItemCreationOptions): BaseItem | null {
    try {
      switch (itemId) {
        case 'medkit':
          return MedkitItem.create({ quantity: options?.quantity || 1 });
        case 'energy_drink':
          return EnergyDrinkItem.create({ quantity: options?.quantity || 1 });
        case 'mre':
          return MREItem.create({ quantity: options?.quantity || 1 });
        case 'water':
          return WaterItem.create({ quantity: options?.quantity || 1 });
        case 'painkillers':
          return PainkillersItem.create({ quantity: options?.quantity || 1 });
        case 'bandages':
          return BandagesItem.create({ quantity: options?.quantity || 1 });
        default:
          return null;
      }
    } catch (error) {
      return null;
    }
  }

  getItemData(itemId: string): ItemData | null {
    const consumableData = this.consumableTypes[itemId as keyof typeof this.consumableTypes];
    if (!consumableData) return null;

    return {
      id: itemId,
      name: consumableData.name,
      description: consumableData.description,
      category: ItemCategory.CONSUMABLE,
      rarity: consumableData.rarity,
      iconImageUri: consumableData.icon,
      maxQuantity: consumableData.maxQuantity,
      stackable: false
    };
  }

  getAllItemIds(): string[] {
    return Object.keys(this.consumableTypes);
  }
}

// Valuable item factory implementation
class ValuableItemFactory implements IItemFactory {
  private readonly valuableTypes = {
    'gold_bar': {
      name: 'Gold Bar',
      description: 'A solid gold bar of high purity. Extremely valuable and sought after by traders.',
      icon: 'icons/gold_bar.png',
      maxQuantity: 50,
      rarity: 'epic'
    },
    'diamonds': {
      name: 'Diamonds',
      description: 'Brilliant cut diamonds of exceptional clarity and carat weight. Among the most valuable items in the world.',
      icon: 'icons/diamonds.png',
      maxQuantity: 20,
      rarity: 'legendary'
    }
  };

  canCreate(itemId: string): boolean {
    return itemId in this.valuableTypes;
  }

  create(itemId: string, options?: ItemCreationOptions): BaseItem | null {
    try {
      const quantity = options?.quantity || 1;
      
      switch (itemId) {
        case 'gold_bar':
          return GoldBarItem.create({ quantity });
        case 'diamonds':
          return DiamondsItem.create({ quantity });
        default:
          return null;
      }
    } catch (error) {
      return null;
    }
  }

  getItemData(itemId: string): ItemData | null {
    const valuableData = this.valuableTypes[itemId as keyof typeof this.valuableTypes];
    if (!valuableData) return null;

    return {
      id: itemId,
      name: valuableData.name,
      description: valuableData.description,
      category: ItemCategory.VALUABLE,
      rarity: valuableData.rarity,
      iconImageUri: valuableData.icon,
      maxQuantity: valuableData.maxQuantity,
      stackable: true
    };
  }

  getAllItemIds(): string[] {
    return Object.keys(this.valuableTypes);
  }
}

// Equipment item factory implementation
class EquipmentItemFactory implements IItemFactory {
  private readonly equipmentTypes = {
    'backpack': {
      name: 'Tactical Backpack',
      description: 'Military-grade backpack with multiple compartments for carrying equipment and supplies',
      icon: 'icons/backpack.png',
      maxQuantity: 1,
      rarity: 'common'
    },
    'tactical_vest': {
      name: 'Tactical Vest',
      description: 'Bullet-resistant tactical vest with multiple pouches for ammunition and equipment',
      icon: 'icons/tactical_vest.png',
      maxQuantity: 1,
      rarity: 'unusual'
    },
    'goggles': {
      name: 'Tactical Goggles',
      description: 'Military-grade protective goggles with enhanced vision and ballistic protection',
      icon: 'icons/goggles.png',
      maxQuantity: 1,
      rarity: 'common'
    }
  };

  canCreate(itemId: string): boolean {
    return itemId in this.equipmentTypes;
  }

  create(itemId: string, options?: ItemCreationOptions): BaseItem | null {
    try {
      const quantity = options?.quantity || 1;
      
      switch (itemId) {
        case 'backpack':
          return BackpackItem.create({ quantity });
        case 'tactical_vest':
          return TacticalVestItem.create({ quantity });
        case 'goggles':
          return GogglesItem.create({ quantity });
        default:
          return null;
      }
    } catch (error) {
      return null;
    }
  }

  getItemData(itemId: string): ItemData | null {
    const equipmentData = this.equipmentTypes[itemId as keyof typeof this.equipmentTypes];
    if (!equipmentData) return null;

    return {
      id: itemId,
      name: equipmentData.name,
      description: equipmentData.description,
      category: ItemCategory.ARMOR,
      rarity: equipmentData.rarity,
      iconImageUri: equipmentData.icon,
      maxQuantity: equipmentData.maxQuantity,
      stackable: false
    };
  }

  getAllItemIds(): string[] {
    return Object.keys(this.equipmentTypes);
  }
}

// Tool item factory implementation
class ToolItemFactory implements IItemFactory {
  private readonly toolTypes = {
    'lighter_matches': {
      name: 'Lighter & Matches',
      description: 'Reliable fire-starting tools essential for survival and tactical operations',
      icon: 'icons/lighter_matches.png',
      maxQuantity: 5,
      rarity: 'common'
    },
    'screws_bolts': {
      name: 'Screws & Bolts',
      description: 'Assorted hardware for repairs and modifications to equipment and weapons',
      icon: 'icons/screws_bolts.png',
      maxQuantity: 50,
      rarity: 'common'
    }
  };

  canCreate(itemId: string): boolean {
    return itemId in this.toolTypes;
  }

  create(itemId: string, options?: ItemCreationOptions): BaseItem | null {
    try {
      const quantity = options?.quantity || 1;
      
      switch (itemId) {
        case 'lighter_matches':
          return LighterMatchesItem.create({ quantity });
        case 'screws_bolts':
          return ScrewsBoltsItem.create({ quantity });
        default:
          return null;
      }
    } catch (error) {
      return null;
    }
  }

  getItemData(itemId: string): ItemData | null {
    const toolData = this.toolTypes[itemId as keyof typeof this.toolTypes];
    if (!toolData) return null;

    return {
      id: itemId,
      name: toolData.name,
      description: toolData.description,
      category: ItemCategory.TOOL,
      rarity: toolData.rarity,
      iconImageUri: toolData.icon,
      maxQuantity: toolData.maxQuantity,
      stackable: true
    };
  }

  getAllItemIds(): string[] {
    return Object.keys(this.toolTypes);
  }
}

// Explosive weapon factory implementation
class ExplosiveWeaponFactory implements IItemFactory {
  private readonly explosiveTypes = {
    'frag_grenade': {
      name: 'Fragmentation Grenade',
      description: 'High-explosive fragmentation grenade for area denial and enemy suppression',
      icon: 'icons/frag_grenade.png',
      maxQuantity: 10,
      rarity: 'rare'
    },
    'smoke_grenade': {
      name: 'Smoke Grenade',
      description: 'Tactical smoke grenade for concealment, signaling, and area denial',
      icon: 'icons/smoke_grenade.png',
      maxQuantity: 15,
      rarity: 'unusual'
    }
  };

  canCreate(itemId: string): boolean {
    return itemId in this.explosiveTypes;
  }

  create(itemId: string, options?: ItemCreationOptions): BaseItem | null {
    try {
      const quantity = options?.quantity || 1;
      
      switch (itemId) {
        case 'frag_grenade':
          return FragGrenadeItem.create({ quantity });
        case 'smoke_grenade':
          return SmokeGrenadeItem.create({ quantity });
        default:
          return null;
      }
    } catch (error) {
      return null;
    }
  }

  getItemData(itemId: string): ItemData | null {
    const explosiveData = this.explosiveTypes[itemId as keyof typeof this.explosiveTypes];
    if (!explosiveData) return null;

    return {
      id: itemId,
      name: explosiveData.name,
      description: explosiveData.description,
      category: ItemCategory.WEAPON,
      rarity: explosiveData.rarity,
      iconImageUri: explosiveData.icon,
      maxQuantity: explosiveData.maxQuantity,
      stackable: true
    };
  }

  getAllItemIds(): string[] {
    return Object.keys(this.explosiveTypes);
  }
}

// Misc item factory implementation
class MiscItemFactory implements IItemFactory {
  private readonly miscTypes = {
    'dog_tags': {
      name: 'Dog Tags',
      description: 'Military identification tags containing soldier information and serial numbers',
      icon: 'icons/dog_tags.png',
      maxQuantity: 10,
      rarity: 'common'
    }
  };

  canCreate(itemId: string): boolean {
    return itemId in this.miscTypes;
  }

  create(itemId: string, options?: ItemCreationOptions): BaseItem | null {
    try {
      const quantity = options?.quantity || 1;
      
      switch (itemId) {
        case 'dog_tags':
          return DogTagsItem.create({ quantity });
        default:
          return null;
      }
    } catch (error) {
      return null;
    }
  }

  getItemData(itemId: string): ItemData | null {
    const miscData = this.miscTypes[itemId as keyof typeof this.miscTypes];
    if (!miscData) return null;

    return {
      id: itemId,
      name: miscData.name,
      description: miscData.description,
      category: ItemCategory.MISC,
      rarity: miscData.rarity,
      iconImageUri: miscData.icon,
      maxQuantity: miscData.maxQuantity,
      stackable: true
    };
  }

  getAllItemIds(): string[] {
    return Object.keys(this.miscTypes);
  }
}

// Main item factory class
export class ItemFactory {
  private static _instance: ItemFactory;
  private readonly _factories: IItemFactory[] = [];

  private constructor() {
    // Register all item factories in order of specificity
    this._factories.push(new WeaponItemFactory());
    this._factories.push(new ExplosiveWeaponFactory());
    this._factories.push(new AmmoItemFactory());
    this._factories.push(new ConsumableItemFactory());
    this._factories.push(new EquipmentItemFactory());
    this._factories.push(new ToolItemFactory());
    this._factories.push(new MiscItemFactory());
    this._factories.push(new ValuableItemFactory());
  }

  public static getInstance(): ItemFactory {
    if (!this._instance) {
      this._instance = new ItemFactory();
    }
    return this._instance;
  }

  /**
   * Create an item by ID
   */
  public createItem(itemId: string, options?: ItemCreationOptions): BaseItem | null {
    try {
      const factory = this._getFactoryForItem(itemId);
      if (!factory) {
        return null;
      }

      return factory.create(itemId, options);
    } catch (error) {
      return null;
    }
  }

  /**
   * Create an item and add it to the player's backpack
   */
  public createAndAddToBackpack(player: Player, itemId: string, quantity: number = 1): boolean {
    try {
      const gamePlayer = GamePlayer.getOrCreate(player);
      const item = this.createItem(itemId, { quantity });
      
      if (!item) {
        return false;
      }
      
      gamePlayer.backpack.addItem(item);
      return true;
      
    } catch (error) {
      return false;
    }
  }

  /**
   * Get item data by ID
   */
  public getItemData(itemId: string): ItemData | null {
    try {
      const factory = this._getFactoryForItem(itemId);
      if (!factory) {
        return null;
      }

      return factory.getItemData(itemId);
    } catch (error) {
      return null;
    }
  }

  /**
   * Get all available item IDs
   */
  public getAllItemIds(): string[] {
    const allIds: string[] = [];
    this._factories.forEach(factory => {
      allIds.push(...factory.getAllItemIds());
    });
    return allIds;
  }

  /**
   * Check if an item ID is valid
   */
  public isValidItemId(itemId: string): boolean {
    return this._factories.some(factory => factory.canCreate(itemId));
  }

  /**
   * Get items by category
   */
  public getItemsByCategory(category: ItemCategory): ItemData[] {
    const items: ItemData[] = [];
    this.getAllItemIds().forEach(itemId => {
      const itemData = this.getItemData(itemId);
      if (itemData && itemData.category === category) {
        items.push(itemData);
      }
    });
    return items;
  }

  /**
   * Validate item quantity
   */
  public validateQuantity(itemId: string, quantity: number): { valid: boolean; maxQuantity?: number; message?: string } {
    try {
      const itemData = this.getItemData(itemId);
      if (!itemData) {
        return { valid: false, message: 'Item not found' };
      }

      // Check if quantity is positive
      if (quantity <= 0) {
        return { valid: false, message: 'Quantity must be positive' };
      }

      // Check max quantity if specified
      if (itemData.maxQuantity && quantity > itemData.maxQuantity) {
        return { 
          valid: false, 
          maxQuantity: itemData.maxQuantity, 
          message: `Maximum quantity is ${itemData.maxQuantity}` 
        };
      }

      return { valid: true };
    } catch (error) {
      return { valid: false, message: 'Validation error' };
    }
  }

  /**
   * Register a new item factory
   */
  public registerFactory(factory: IItemFactory): void {
    this._factories.push(factory);
  }

  /**
   * Get the appropriate factory for an item ID
   */
  private _getFactoryForItem(itemId: string): IItemFactory | null {
    return this._factories.find(factory => factory.canCreate(itemId)) || null;
  }
}

// Export convenience functions
export const createItem = (itemId: string, options?: ItemCreationOptions) => 
  ItemFactory.getInstance().createItem(itemId, options);

export const createAndAddToBackpack = (player: Player, itemId: string, quantity: number = 1) => 
  ItemFactory.getInstance().createAndAddToBackpack(player, itemId, quantity);

export const getItemData = (itemId: string) => 
  ItemFactory.getInstance().getItemData(itemId);

export const isValidItemId = (itemId: string) => 
  ItemFactory.getInstance().isValidItemId(itemId);

export const getAllItemIds = () => 
  ItemFactory.getInstance().getAllItemIds();
