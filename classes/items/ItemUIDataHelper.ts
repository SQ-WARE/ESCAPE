import type BaseItem from './BaseItem';
import WeaponItem from '../weapons/items/WeaponItem';

export const ItemUIDataHelper = {
  getUIData(item: BaseItem, overrides: Record<string, unknown> = {}): Record<string, unknown> {
    const baseData = {
      id: item.id,
      name: item.name,
      iconImageUri: item.iconImageUri,
      description: item.description,
      rarity: item.rarity,
      ...overrides,
    };

    if (item instanceof WeaponItem) {
      baseData.stats = item.stats;
      baseData.ammoType = item.ammoType;
    }

    return baseData;
  },
}; 