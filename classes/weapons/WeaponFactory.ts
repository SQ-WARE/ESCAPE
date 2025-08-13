import { WeaponRegistry } from './data/WeaponRegistry';
import { WEAPON_DEFINITIONS } from './data/WeaponDefinitions';
import WeaponItem, { WeaponItemOverrides } from './items/WeaponItem';
import type { WeaponData } from './data/WeaponData';
import type { WeaponCategory, WeaponRarity } from './data/WeaponData';

export class WeaponFactory {
  private static _initialized = false;

  // Initialize the weapon registry with all definitions
  static initialize(): void {
    if (this._initialized) return;

    // Register all weapon definitions
    WEAPON_DEFINITIONS.forEach(weapon => {
      WeaponRegistry.register(weapon);
    });

    this._initialized = true;
  }

  // Create a weapon item by ID
  static create(weaponId: string, overrides?: Partial<WeaponItemOverrides>): WeaponItem {
    this.initialize();
    
    const weaponData = WeaponRegistry.get(weaponId);
    if (!weaponData) {
      throw new Error(`Weapon with id '${weaponId}' not found`);
    }
    
    return new WeaponItem(weaponData, overrides);
  }

  // Create a random weapon
  static createRandom(overrides?: Partial<WeaponItemOverrides>): WeaponItem {
    this.initialize();
    
    const weaponData = WeaponRegistry.getRandom();
    if (!weaponData) {
      throw new Error('No weapons available');
    }
    
    return new WeaponItem(weaponData, overrides);
  }

  // Create a random weapon by category
  static createRandomByCategory(category: WeaponCategory, overrides?: Partial<WeaponItemOverrides>): WeaponItem {
    this.initialize();
    
    const weaponData = WeaponRegistry.getRandomByCategory(category);
    if (!weaponData) {
      throw new Error(`No weapons available in category '${category}'`);
    }
    
    return new WeaponItem(weaponData, overrides);
  }



  // Create a random weapon by rarity
  static createRandomByRarity(rarity: WeaponRarity, overrides?: Partial<WeaponItemOverrides>): WeaponItem {
    this.initialize();
    
    const weapons = WeaponRegistry.getByRarity(rarity);
    if (weapons.length === 0) {
      throw new Error(`No weapons available in rarity '${rarity}'`);
    }
    
    const randomWeapon = weapons[Math.floor(Math.random() * weapons.length)];
    return new WeaponItem(randomWeapon, overrides);
  }

  // Get weapon data by ID
  static getWeaponData(weaponId: string): WeaponData | undefined {
    this.initialize();
    return WeaponRegistry.get(weaponId);
  }

  // Get all weapon definitions
  static getAllWeaponDefinitions(): WeaponData[] {
    this.initialize();
    return WeaponRegistry.getAll();
  }

  // Get weapon definitions by category
  static getWeaponDefinitionsByCategory(category: WeaponCategory): WeaponData[] {
    this.initialize();
    return WeaponRegistry.getByCategory(category);
  }



  // Get weapon definitions by rarity
  static getWeaponDefinitionsByRarity(rarity: WeaponRarity): WeaponData[] {
    this.initialize();
    return WeaponRegistry.getByRarity(rarity);
  }

  // Get all weapon IDs
  static getAllWeaponIds(): string[] {
    this.initialize();
    return WeaponRegistry.getAllIds();
  }

  // Check if a weapon ID is valid
  static isValidWeaponId(weaponId: string): boolean {
    this.initialize();
    return WeaponRegistry.isValid(weaponId);
  }

  // Get weapon info (name, description, etc.)
  static getWeaponInfo(weaponId: string): { name: string; description: string; iconImageUri: string } | undefined {
    this.initialize();
    
    const weaponData = WeaponRegistry.get(weaponId);
    if (!weaponData) return undefined;
    
    return {
      name: weaponData.name,
      description: weaponData.description,
      iconImageUri: weaponData.assets.ui.icon,
    };
  }
} 