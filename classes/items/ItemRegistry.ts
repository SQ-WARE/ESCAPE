import { ItemFactory } from './ItemFactory';
import type { ItemData, ItemCategory } from './ItemFactory';

// Item registry for centralized item management
export class ItemRegistry {
  private static _instance: ItemRegistry;
  private readonly _itemFactory: ItemFactory;
  private readonly _itemCache: Map<string, ItemData> = new Map();
  private readonly _categoryCache: Map<ItemCategory, ItemData[]> = new Map();
  private readonly _rarityCache: Map<string, ItemData[]> = new Map();

  private constructor() {
    this._itemFactory = ItemFactory.getInstance();
    this._buildCaches();
  }

  public static getInstance(): ItemRegistry {
    if (!this._instance) {
      this._instance = new ItemRegistry();
    }
    return this._instance;
  }

  /**
   * Get item data by ID
   */
  public getItemData(itemId: string): ItemData | null {
    // Check cache first
    if (this._itemCache.has(itemId)) {
      return this._itemCache.get(itemId)!;
    }

    // Get from factory and cache
    const itemData = this._itemFactory.getItemData(itemId);
    if (itemData) {
      this._itemCache.set(itemId, itemData);
    }

    return itemData;
  }

  /**
   * Get all item data
   */
  public getAllItemData(): ItemData[] {
    const allIds = this._itemFactory.getAllItemIds();
    return allIds.map(id => this.getItemData(id)).filter(Boolean) as ItemData[];
  }

  /**
   * Get items by category
   */
  public getItemsByCategory(category: ItemCategory): ItemData[] {
    // Check cache first
    if (this._categoryCache.has(category)) {
      return this._categoryCache.get(category)!;
    }

    // Get from factory and cache
    const items = this._itemFactory.getItemsByCategory(category);
    this._categoryCache.set(category, items);
    return items;
  }

  /**
   * Get items by rarity
   */
  public getItemsByRarity(rarity: string): ItemData[] {
    // Check cache first
    if (this._rarityCache.has(rarity)) {
      return this._rarityCache.get(rarity)!;
    }

    // Build rarity cache
    const items = this.getAllItemData().filter(item => item.rarity === rarity);
    this._rarityCache.set(rarity, items);
    return items;
  }

  /**
   * Get all available categories
   */
  public getAvailableCategories(): ItemCategory[] {
    const categories = new Set<ItemCategory>();
    this.getAllItemData().forEach(item => {
      categories.add(item.category);
    });
    return Array.from(categories);
  }

  /**
   * Get all available rarities
   */
  public getAvailableRarities(): string[] {
    const rarities = new Set<string>();
    this.getAllItemData().forEach(item => {
      rarities.add(item.rarity);
    });
    return Array.from(rarities).sort();
  }

  /**
   * Search items by name or description
   */
  public searchItems(query: string): ItemData[] {
    const lowerQuery = query.toLowerCase();
    return this.getAllItemData().filter(item => 
      item.name.toLowerCase().includes(lowerQuery) ||
      item.description.toLowerCase().includes(lowerQuery)
    );
  }

  /**
   * Get items that can be bought (have a buy price)
   */
  public getBuyableItems(): ItemData[] {
    return this.getAllItemData().filter(item => item.buyPrice !== undefined);
  }

  /**
   * Get items that can be sold (have a sell price)
   */
  public getSellableItems(): ItemData[] {
    return this.getAllItemData().filter(item => item.sellPrice !== undefined);
  }

  /**
   * Get items by price range
   */
  public getItemsByPriceRange(minPrice: number, maxPrice: number): ItemData[] {
    return this.getAllItemData().filter(item => {
      const price = item.buyPrice || item.sellPrice || 0;
      return price >= minPrice && price <= maxPrice;
    });
  }

  /**
   * Get items that are stackable
   */
  public getStackableItems(): ItemData[] {
    return this.getAllItemData().filter(item => item.stackable);
  }

  /**
   * Get items that are not stackable
   */
  public getNonStackableItems(): ItemData[] {
    return this.getAllItemData().filter(item => !item.stackable);
  }

  /**
   * Get random item
   */
  public getRandomItem(): ItemData | null {
    const allItems = this.getAllItemData();
    if (allItems.length === 0) return null;
    
    const randomIndex = Math.floor(Math.random() * allItems.length);
    return allItems[randomIndex] || null;
  }

  /**
   * Get random item by category
   */
  public getRandomItemByCategory(category: ItemCategory): ItemData | null {
    const items = this.getItemsByCategory(category);
    if (items.length === 0) return null;
    
    const randomIndex = Math.floor(Math.random() * items.length);
    return items[randomIndex] || null;
  }

  /**
   * Get random item by rarity
   */
  public getRandomItemByRarity(rarity: string): ItemData | null {
    const items = this.getItemsByRarity(rarity);
    if (items.length === 0) return null;
    
    const randomIndex = Math.floor(Math.random() * items.length);
    return items[randomIndex] || null;
  }

  /**
   * Get item statistics
   */
  public getItemStatistics(): {
    totalItems: number;
    itemsByCategory: Record<ItemCategory, number>;
    itemsByRarity: Record<string, number>;
    stackableItems: number;
    buyableItems: number;
    sellableItems: number;
  } {
    const allItems = this.getAllItemData();
    const stats = {
      totalItems: allItems.length,
      itemsByCategory: {} as Record<ItemCategory, number>,
      itemsByRarity: {} as Record<string, number>,
      stackableItems: 0,
      buyableItems: 0,
      sellableItems: 0
    };

    allItems.forEach(item => {
      // Category stats
      stats.itemsByCategory[item.category] = (stats.itemsByCategory[item.category] || 0) + 1;
      
      // Rarity stats
      stats.itemsByRarity[item.rarity] = (stats.itemsByRarity[item.rarity] || 0) + 1;
      
      // Other stats
      if (item.stackable) stats.stackableItems++;
      if (item.buyPrice !== undefined) stats.buyableItems++;
      if (item.sellPrice !== undefined) stats.sellableItems++;
    });

    return stats;
  }

  /**
   * Clear all caches (useful for development/testing)
   */
  public clearCaches(): void {
    this._itemCache.clear();
    this._categoryCache.clear();
    this._rarityCache.clear();
  }

  /**
   * Refresh caches (rebuild all cached data)
   */
  public refreshCaches(): void {
    this.clearCaches();
    this._buildCaches();
  }

  /**
   * Build initial caches
   */
  private _buildCaches(): void {
    // Pre-populate item cache
    this._itemFactory.getAllItemIds().forEach(itemId => {
      const itemData = this._itemFactory.getItemData(itemId);
      if (itemData) {
        this._itemCache.set(itemId, itemData);
      }
    });

    // Pre-populate category cache
    this.getAvailableCategories().forEach(category => {
      const items = this._itemFactory.getItemsByCategory(category);
      this._categoryCache.set(category, items);
    });

    // Pre-populate rarity cache
    this.getAvailableRarities().forEach(rarity => {
      const items = this.getAllItemData().filter(item => item.rarity === rarity);
      this._rarityCache.set(rarity, items);
    });
  }
}

// Export convenience functions
export const getItemData = (itemId: string) => 
  ItemRegistry.getInstance().getItemData(itemId);

export const getAllItemData = () => 
  ItemRegistry.getInstance().getAllItemData();

export const getItemsByCategory = (category: ItemCategory) => 
  ItemRegistry.getInstance().getItemsByCategory(category);

export const getItemsByRarity = (rarity: string) => 
  ItemRegistry.getInstance().getItemsByRarity(rarity);

export const searchItems = (query: string) => 
  ItemRegistry.getInstance().searchItems(query);

export const getItemStatistics = () => 
  ItemRegistry.getInstance().getItemStatistics();
