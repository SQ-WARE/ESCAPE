import type { ItemClass } from "./BaseItem";
import { WeaponFactory } from "../weapons/WeaponFactory";

const itemRegistry = new Map<string, ItemClass>();

export const ItemRegistry = {
  registerItem(itemClass: ItemClass): void {
    if (itemRegistry.has(itemClass.id)) {
      console.warn(`Item with id ${itemClass.id} is already registered.`);
      return;
    }
    itemRegistry.set(itemClass.id, itemClass);
  },

  getItemClass(id: string): ItemClass | undefined {
    if (WeaponFactory.isValidWeaponId(id)) {
      const weaponData = WeaponFactory.getWeaponData(id);
      return {
        id: id,
        name: weaponData?.name || id,
        iconImageUri: weaponData?.assets.ui.icon || '',
        description: weaponData?.description || '',
        rarity: (weaponData?.rarity as string) || 'common',
        stackable: false,
        create: (overrides?: any) => WeaponFactory.create(id, overrides)
      } as any;
    }
    return itemRegistry.get(id);
  },

  getRegisteredItemIds(): string[] {
    const legacyIds = Array.from(itemRegistry.keys());
    const weaponIds = WeaponFactory.getAllWeaponDefinitions().map(def => def.id);
    return [...legacyIds, ...weaponIds];
  },

  registerAllItems(): void {
    // Import and register all items
    const { default: MedkitItem } = require('./MedkitItem');
    const { default: EnergyDrinkItem } = require('./EnergyDrinkItem');
    const { default: GoldBarItem } = require('./GoldBarItem');
    const { default: BandageItem } = require('./BandageItem');
    const { default: DiamondItem } = require('./DiamondItem');
    const { default: PainkillerItem } = require('./PainkillerItem');

    this.registerItem(MedkitItem);
    this.registerItem(EnergyDrinkItem);
    this.registerItem(GoldBarItem);
    this.registerItem(BandageItem);
    this.registerItem(DiamondItem);
    this.registerItem(PainkillerItem);
  },
}; 