import type { WeaponData, WeaponCategory, WeaponRarity } from './WeaponData';

export class WeaponRegistry {
  private static _weapons = new Map<string, WeaponData>();
  private static _categories = new Map<WeaponCategory, Set<string>>();
  private static _rarities = new Map<WeaponRarity, Set<string>>();
  
  static register(weapon: WeaponData): void {
    this._weapons.set(weapon.id, weapon);
    this._categorize(weapon);
  }
  
  static get(id: string): WeaponData | undefined {
    return this._weapons.get(id);
  }
  
  static getByCategory(category: WeaponCategory): WeaponData[] {
    const ids = this._categories.get(category);
    if (!ids) return [];
    
    const weapons: WeaponData[] = [];
    for (const id of ids) {
      const weapon = this._weapons.get(id);
      if (weapon) {
        weapons.push(weapon);
      }
    }
    return weapons;
  }
  

  
  static getByRarity(rarity: WeaponRarity): WeaponData[] {
    const ids = this._rarities.get(rarity);
    if (!ids) return [];
    
    const weapons: WeaponData[] = [];
    for (const id of ids) {
      const weapon = this._weapons.get(id);
      if (weapon) {
        weapons.push(weapon);
      }
    }
    return weapons;
  }
  
  static getAll(): WeaponData[] {
    return Array.from(this._weapons.values());
  }
  
  static getAllIds(): string[] {
    return Array.from(this._weapons.keys());
  }
  
  static isValid(id: string): boolean {
    return this._weapons.has(id);
  }
  
  static getRandom(): WeaponData | undefined {
    const ids = this.getAllIds();
    if (ids.length === 0) return undefined;
    const randomId = ids[Math.floor(Math.random() * ids.length)];
    if (!randomId) return undefined;
    return this._weapons.get(randomId);
  }
  
  static getRandomByCategory(category: WeaponCategory): WeaponData | undefined {
    const weapons = this.getByCategory(category);
    if (weapons.length === 0) return undefined;
    return weapons[Math.floor(Math.random() * weapons.length)];
  }
  
  private static _categorize(weapon: WeaponData): void {
    // Categorize by category
    if (!this._categories.has(weapon.category)) {
      this._categories.set(weapon.category, new Set());
    }
    this._categories.get(weapon.category)!.add(weapon.id);
    
    // Categorize by rarity
    if (!this._rarities.has(weapon.rarity)) {
      this._rarities.set(weapon.rarity, new Set());
    }
    this._rarities.get(weapon.rarity)!.add(weapon.id);
  }
} 