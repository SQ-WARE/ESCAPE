import { Player } from 'hytopia';
import { ItemFactory } from '../items/ItemFactory';
import GamePlayer from '../GamePlayer';

export interface MarketItem {
  id: string;
  name: string;
  description: string;
  price: number;
  iconImageUri?: string; // Made optional since we get it from item classes
  category: string;
  maxQuantity?: number;
  available?: boolean;
}

export interface MarketData {
  currency: number;
  items: MarketItem[];
}

export class MarketSystem {
  private static _cachedRarityColors: any = null;
  
  private static readonly MARKET_ITEMS: MarketItem[] = [
    // Consumables
    {
      id: 'medkit',
      name: 'Medkit',
      description: 'Restores health when used',
      price: 250,
      iconImageUri: 'icons/medkit.png',
      category: 'consumable',
      maxQuantity: 10
    },
    {
      id: 'energy_drink',
      name: 'Energy Drink',
      description: 'High-caffeine energy drink that provides a temporary boost to stamina and movement speed',
      price: 50,
      iconImageUri: 'icons/energy_drink.png',
      category: 'consumable',
      maxQuantity: 20
    },
    {
      id: 'mre',
      name: 'MRE (Meal Ready to Eat)',
      description: 'Self-contained individual field ration providing complete nutrition for extended operations',
      price: 75,
      iconImageUri: 'icons/mre.png',
      category: 'consumable',
      maxQuantity: 15
    },
    {
      id: 'water',
      name: 'Water Bottle',
      description: 'Clean drinking water essential for hydration and survival in the field',
      price: 25,
      iconImageUri: 'icons/water.png',
      category: 'consumable',
      maxQuantity: 30
    },
    {
      id: 'painkillers',
      name: 'Painkillers',
      description: 'Strong pain relief medication that reduces damage taken and improves combat effectiveness',
      price: 100,
      iconImageUri: 'icons/painkillers.png',
      category: 'consumable',
      maxQuantity: 10
    },
    {
      id: 'bandages',
      name: 'Bandages',
      description: 'Medical bandages for treating wounds and stopping bleeding',
      price: 40,
      iconImageUri: 'icons/bandages.png',
      category: 'consumable',
      maxQuantity: 25
    },
    
         // Ammunition
     {
       id: 'pistol_ammo',
       name: '9×19mm Parabellum',
       description: 'Pistol ammunition including 9×19mm Parabellum. Used by pistols and submachine guns.',
       price: 50,
       iconImageUri: 'icons/9mm.png',
       category: 'ammo',
       maxQuantity: 100
     },
     {
       id: 'rifle_ammo',
       name: '7.62×39mm',
       description: 'Rifle ammunition including 7.62×39mm. Used by assault rifles and battle rifles.',
       price: 75,
       iconImageUri: 'icons/5.8mm.png',
       category: 'ammo',
       maxQuantity: 100
     },
     {
       id: 'sniper_ammo',
       name: '12.7×108mm',
       description: 'Sniper ammunition including 12.7×108mm. Precision long-range cartridges for sniper rifles.',
       price: 150,
       iconImageUri: 'icons/12.7mm.png',
       category: 'ammo',
       maxQuantity: 50
     },
           {
        id: 'shotgun_ammo',
        name: '12 Gauge Shells',
        description: '12 gauge shotgun shells for pump-action and semi-automatic shotguns.',
        price: 60,
        iconImageUri: 'icons/12gauge.png',
        category: 'ammo',
        maxQuantity: 50
      },
      {
        id: 'nato_ammo',
        name: '5.56×45mm NATO',
        description: 'Standard NATO rifle ammunition for modern assault rifles and carbines.',
        price: 85,
        iconImageUri: 'icons/nato_ammo.png',
        category: 'ammo',
        maxQuantity: 100
      },
    
                   // Weapons - Pistols
      {
        id: 'm9_beretta',
        name: 'Beretta M9',
        description: '9×19mm service pistol known for reliability, mild recoil, and consistent accuracy.',
        price: 800,
        iconImageUri: 'icons/pistol_m9.png',
        category: 'weapon',
        maxQuantity: 1
      },
      {
        id: 'fn_502_tactical_fde',
        name: 'FN 502 Tactical FDE',
        description: 'Optics-ready polymer pistol with threaded barrel and duty-grade ergonomics for dependable control.',
        price: 1200,
        iconImageUri: 'icons/pistol_fn_502.png',
        category: 'weapon',
        maxQuantity: 1
      },
      {
        id: 'desert_eagle',
        name: 'Desert Eagle',
        description: 'Powerful .50 AE semi-automatic pistol with exceptional stopping power and distinctive design.',
        price: 2000,
        iconImageUri: 'icons/pistol_deagle.png',
        category: 'weapon',
        maxQuantity: 1
      },
      {
        id: 'glock_17',
        name: 'Glock 17',
        description: 'Reliable 9×19mm polymer-framed pistol with high capacity and proven durability.',
        price: 1000,
        iconImageUri: 'icons/pistol_glock.png',
        category: 'weapon',
        maxQuantity: 1
      },
     
           // Weapons - Rifles
      {
        id: 'akm',
        name: 'AKM',
        description: '7.62×39mm assault rifle known for reliability and stopping power in harsh conditions.',
        price: 2500,
        iconImageUri: 'icons/rifle_akm.png',
        category: 'weapon',
        maxQuantity: 1
      },
      {
        id: 'spetsnaz_akm_nsb',
        name: 'Spetsnaz AKM NSB',
        description: 'Special forces variant of the AKM with enhanced accuracy and tactical modifications.',
        price: 3500,
        iconImageUri: 'icons/rifle_akm_silenced.png',
        category: 'weapon',
        maxQuantity: 1
      },
     
           // Weapons - SMGs
      {
        id: 'mp5a2',
        name: 'MP5A2',
        description: '9×19mm submachine gun with exceptional accuracy and controllable recoil.',
        price: 3000,
        iconImageUri: 'icons/smg_mp5.png',
        category: 'weapon',
        maxQuantity: 1
      },
      {
        id: 'ingram_m6',
        name: 'Ingram M6',
        description: 'Compact .45 ACP submachine gun with high rate of fire and close-quarters effectiveness.',
        price: 2800,
        iconImageUri: 'icons/smg_ingram_m6.png',
        category: 'weapon',
        maxQuantity: 1
      },
      {
        id: 'hk_mp5k',
        name: 'HK MP5K',
        description: 'Compact version of the MP5 with shortened barrel for concealed carry and close combat.',
        price: 2500,
        iconImageUri: 'icons/sub_mp5k.png',
        category: 'weapon',
        maxQuantity: 1
      },
      {
        id: 'hk_mp5sd',
        name: 'HK MP5SD',
        description: 'Integrally suppressed MP5 variant with reduced sound signature for stealth operations.',
        price: 4000,
        iconImageUri: 'icons/sub_mp5k_silenced.png',
        category: 'weapon',
        maxQuantity: 1
      },
     
           // Weapons - Snipers
      {
        id: 'asvkm',
        name: 'ASVKM',
        description: '12.7×108mm anti-materiel rifle with exceptional range and penetration capabilities.',
        price: 8000,
        iconImageUri: 'icons/sniper_asvkm.png',
        category: 'weapon',
        maxQuantity: 1
      },
      {
        id: 'victrix_corvo_v',
        name: 'Victrix Corvo V',
        description: 'Precision bolt-action sniper rifle with advanced optics and exceptional accuracy.',
        price: 10000,
        iconImageUri: 'icons/sniper_victrix.png',
        category: 'weapon',
        maxQuantity: 1
      },
      {
        id: 'sword_mk18_mjolnir',
        name: 'S.W.O.R.D. MK-18 SA-ASR Mjolnir',
        description: 'Advanced semi-automatic sniper rifle with cutting-edge technology and superior performance.',
        price: 15000,
        iconImageUri: 'icons/sniper_mk18.png',
        category: 'weapon',
        maxQuantity: 1
      },
     
           // Weapons - Shotguns
      {
        id: 'kbp_pp90_shotgun',
        name: 'KBP PP-90',
        description: 'Compact 12‑gauge pump shotgun built for close‑quarters dominance; wide spread and strong recoil.',
        price: 1800,
        iconImageUri: 'icons/shotgun_kbp_pp90.png',
        category: 'weapon',
        maxQuantity: 1
      },

      // Equipment
      {
        id: 'backpack',
        name: 'Tactical Backpack',
        description: 'Military-grade backpack with multiple compartments for carrying equipment and supplies',
        price: 200,
        iconImageUri: 'icons/backpack.png',
        category: 'equipment',
        maxQuantity: 1
      },
      {
        id: 'tactical_vest',
        name: 'Tactical Vest',
        description: 'Bullet-resistant tactical vest with multiple pouches for ammunition and equipment',
        price: 500,
        iconImageUri: 'icons/tactical_vest.png',
        category: 'equipment',
        maxQuantity: 1
      },
      {
        id: 'goggles',
        name: 'Tactical Goggles',
        description: 'Military-grade protective goggles with enhanced vision and ballistic protection',
        price: 150,
        iconImageUri: 'icons/goggles.png',
        category: 'equipment',
        maxQuantity: 1
      },

      // Tools
      {
        id: 'lighter_matches',
        name: 'Lighter & Matches',
        description: 'Reliable fire-starting tools essential for survival and tactical operations',
        price: 30,
        iconImageUri: 'icons/lighter_matches.png',
        category: 'tool',
        maxQuantity: 5
      },
      {
        id: 'screws_bolts',
        name: 'Screws & Bolts',
        description: 'Assorted hardware for repairs and modifications to equipment and weapons',
        price: 20,
        iconImageUri: 'icons/screws_bolts.png',
        category: 'tool',
        maxQuantity: 50
      },

      // Explosives
      {
        id: 'frag_grenade',
        name: 'Fragmentation Grenade',
        description: 'High-explosive fragmentation grenade for area denial and enemy suppression',
        price: 300,
        iconImageUri: 'icons/frag_grenade.png',
        category: 'weapon',
        maxQuantity: 10
      },
      {
        id: 'smoke_grenade',
        name: 'Smoke Grenade',
        description: 'Tactical smoke grenade for concealment, signaling, and area denial',
        price: 150,
        iconImageUri: 'icons/smoke_grenade.png',
        category: 'weapon',
        maxQuantity: 15
      },

      // Misc Items
      {
        id: 'dog_tags',
        name: 'Dog Tags',
        description: 'Military identification tags containing soldier information and serial numbers',
        price: 15,
        iconImageUri: 'icons/dog_tags.png',
        category: 'misc',
        maxQuantity: 10
      },

      // Valuable Items
      {
        id: 'gold_bar',
        name: 'Gold Bar',
        description: 'A solid gold bar of high purity. Extremely valuable and sought after by traders.',
        price: 5000,
        iconImageUri: 'icons/gold_bar.png',
        category: 'valuable',
        maxQuantity: 50
      },
      {
        id: 'diamonds',
        name: 'Diamonds',
        description: 'Brilliant cut diamonds of exceptional clarity and carat weight. Among the most valuable items in the world.',
        price: 15000,
        iconImageUri: 'icons/diamonds.png',
        category: 'valuable',
        maxQuantity: 20
      }
  ];

  /**
   * Get market data for a player
   */
  static async getMarketData(player: Player): Promise<MarketData & { sellableItems: Array<{
    id: string;
    name: string;
    quantity: number;
    sellPrice: number;
    iconImageUri: string;
    category: string;
    rarity?: string;
    rarityColor?: { r: number; g: number; b: number };
  }> }> {
    try {
      const gamePlayer = GamePlayer.getOrCreate(player);
      const currency = gamePlayer.currency.getCurrency();
      const sellableItems = await this.getPlayerSellableItems(player);
      
      return {
        currency,
        items: this.MARKET_ITEMS.filter(item => item.available !== false),
        sellableItems
      };
    } catch (error) {
      return {
        currency: 0,
        items: [],
        sellableItems: []
      };
    }
  }

  /**
   * Get a specific market item by ID
   */
  static getMarketItem(itemId: string): MarketItem | undefined {
    // First check if it's a valid item and get its info (prioritizes item class icon)
    const itemInfo = ItemFactory.getInstance().getItemData(itemId);
    
    // Then check our market items for pricing and other market-specific data
    const marketItem = this.MARKET_ITEMS.find(item => item.id === itemId);
    
    if (itemInfo) {
      // Use item class info as base, override with market data
      return {
        id: itemInfo.id,
        name: itemInfo.name,
        description: itemInfo.description,
        iconImageUri: itemInfo.iconImageUri || '', // Prioritize item class icon
        price: marketItem?.price || 0,
        category: itemInfo.category,
        maxQuantity: marketItem?.maxQuantity,
        available: marketItem?.available !== false
      } as MarketItem;
    }
    
    if (marketItem) {
      // Fallback to market item if no item class exists
      return marketItem;
    }

    return undefined;
  }

  /**
   * Purchase an item from the market
   */
  static purchaseItem(player: Player, itemId: string): { success: boolean; message: string; newCurrency?: number } {
    try {
      const gamePlayer = GamePlayer.getOrCreate(player);
      const currency = gamePlayer.currency.getCurrency();
      
      const item = this.getMarketItem(itemId);
      if (!item) {
        return { success: false, message: 'Item not found' };
      }

      if (currency < item.price) {
        return { success: false, message: 'Insufficient funds' };
      }

      // Check if player can carry more of this item
      const currentQuantity = this._getStashQuantity(gamePlayer, itemId);
      if (item.maxQuantity && currentQuantity >= item.maxQuantity) {
        return { success: false, message: `Maximum quantity (${item.maxQuantity}) reached` };
      }

      // Validate quantity
      const validation = ItemFactory.getInstance().validateQuantity(itemId, 1);
      if (!validation.valid) {
        return { success: false, message: validation.message || 'Invalid quantity' };
      }

      // Check if stash has space BEFORE deducting currency
      if (gamePlayer.stash.totalEmptySlots === 0) {
        // Check if existing stackable item can accommodate more
        const canStack = this._canStackInStash(gamePlayer, itemId, 1);
        if (!canStack) {
          return { success: false, message: 'Stash is full - cannot add more items' };
        }
      }
      
      // Add item to stash BEFORE deducting currency
      const success = this._addToStash(gamePlayer, itemId, 1);
      if (!success) {
        return { success: false, message: 'Failed to add item to stash - stash may be full' };
      }
      
      // Only deduct currency after successful item addition
      const newCurrency = currency - item.price;
      gamePlayer.currency.setCurrency(newCurrency);
      
      const newQuantity = this._getStashQuantity(gamePlayer, itemId);

      return { 
        success: true, 
        message: `Successfully purchased ${item.name}`,
        newCurrency
      };
    } catch (error) {
      return { success: false, message: 'Purchase failed due to an error' };
    }
  }

  /**
   * Sell an item from player's stash
   * Only allows selling of valuable items (gold bars, crafting materials, etc.)
   */
  static sellItem(player: Player, itemId: string, quantity: number = 1): { success: boolean; message: string; newCurrency?: number; soldQuantity?: number } {
    try {
      const gamePlayer = GamePlayer.getOrCreate(player);
      const currency = gamePlayer.currency.getCurrency();
      
      // Get item from market to determine sell price
      const marketItem = this.getMarketItem(itemId);
      if (!marketItem) {
        return { success: false, message: 'Item not available for sale' };
      }

      // Check if item is sellable (only valuables)
      const sellableCategories = ['valuable'];
      if (!sellableCategories.includes(marketItem.category)) {
        return { success: false, message: `${marketItem.name} cannot be sold` };
      }

      // Calculate sell price (typically 50% of buy price)
      const sellPrice = Math.floor(marketItem.price * 0.5);
      
      // Check if player has the item in any inventory
      const currentQuantity = this._getTotalItemQuantity(gamePlayer, itemId);
      if (currentQuantity < quantity) {
        return { success: false, message: `Insufficient quantity. You have ${currentQuantity} ${marketItem.name}` };
      }

      // Remove items from inventory sources (prioritize hotbar, then backpack, then stash)
      let remainingToRemove = quantity;
      let removedFromStash = 0;

      // First try to remove from hotbar
      for (let i = 0; i < gamePlayer.hotbar.size && remainingToRemove > 0; i++) {
        const item = gamePlayer.hotbar.getItemAt(i);
        if (item && item.id === itemId) {
          const toRemove = Math.min(remainingToRemove, item.quantity);
          if (toRemove >= item.quantity) {
            // Remove entire item
            gamePlayer.hotbar.removeItem(i);
            remainingToRemove -= item.quantity;
          } else {
            // Remove partial quantity
            item.adjustQuantity(-toRemove);
            remainingToRemove -= toRemove;
          }
        }
      }

      // Then try to remove from backpack
      for (let i = 0; i < gamePlayer.backpack.size && remainingToRemove > 0; i++) {
        const item = gamePlayer.backpack.getItemAt(i);
        if (item && item.id === itemId) {
          const toRemove = Math.min(remainingToRemove, item.quantity);
          if (toRemove >= item.quantity) {
            // Remove entire item
            gamePlayer.backpack.removeItem(i);
            remainingToRemove -= item.quantity;
          } else {
            // Remove partial quantity
            item.adjustQuantity(-toRemove);
            remainingToRemove -= toRemove;
          }
        }
      }

      // Finally remove from stash if needed
      if (remainingToRemove > 0) {
        const stashQuantity = this._getStashQuantity(gamePlayer, itemId);
        if (stashQuantity < remainingToRemove) {
          return { success: false, message: 'Failed to remove sufficient items from inventory' };
        }
        const success = this._removeFromStash(gamePlayer, itemId, remainingToRemove);
        if (!success) {
          return { success: false, message: 'Failed to remove item from stash' };
        }
        removedFromStash = remainingToRemove;
      }

      // Sync UI for all inventory changes
      gamePlayer.hotbar.syncUI(player);
      gamePlayer.backpack.syncUI(player);
      gamePlayer.stash.syncUI(player);

      // Save player data to persist changes
      gamePlayer.save();

      // Add currency
      const newCurrency = currency + (sellPrice * quantity);
      gamePlayer.currency.setCurrency(newCurrency);

      // Validate stash after selling to clean up any issues
      this.validateStash(player);

      // Verify items were actually removed
      const finalQuantity = this._getTotalItemQuantity(gamePlayer, itemId);
      const expectedFinalQuantity = currentQuantity - quantity;
      
      if (finalQuantity !== expectedFinalQuantity) {
        console.warn(`Item removal verification failed: expected ${expectedFinalQuantity}, got ${finalQuantity} for ${itemId}`);
        // Force a full stash validation and sync
        this.validateStash(player);
        gamePlayer.stash.syncUI(player);
      }

      return { 
        success: true, 
        message: `Sold ${quantity}x ${marketItem.name} for ${sellPrice * quantity} credits`,
        newCurrency,
        soldQuantity: quantity
      };
    } catch (error) {
      return { success: false, message: 'Sale failed due to an error' };
    }
  }

  /**
   * Get all items in player's inventory that can be sold
   * Only allows selling of valuable items (gold bars, crafting materials, etc.)
   */
  static async getPlayerSellableItems(player: Player): Promise<Array<{
    id: string;
    name: string;
    quantity: number;
    sellPrice: number;
    iconImageUri: string;
    category: string;
    rarity?: string;
    rarityColor?: { r: number; g: number; b: number };
  }>> {
    try {
      const sellableItems: Array<{
        id: string;
        name: string;
        quantity: number;
        sellPrice: number;
        iconImageUri: string;
        category: string;
        rarity?: string;
        rarityColor?: { r: number; g: number; b: number };
      }> = [];

      // Define categories that can be sold (only valuables)
      const sellableCategories = ['valuable'];

      // Get all market items that are sellable
      const marketItems = this.MARKET_ITEMS.filter(item => 
        sellableCategories.includes(item.category)
      );

      const gamePlayer = GamePlayer.getOrCreate(player);
      
      for (const marketItem of marketItems) {
        const totalQuantity = this._getTotalItemQuantity(gamePlayer, marketItem.id);
        
        if (totalQuantity > 0) {
          // Get item data from factory for rarity information
          const itemData = ItemFactory.getInstance().getItemData(marketItem.id);
          const rarityColor = itemData?.rarity ? await this._getRarityColor(itemData.rarity) : undefined;
          
          sellableItems.push({
            id: marketItem.id,
            name: marketItem.name,
            quantity: totalQuantity,
            sellPrice: Math.floor(marketItem.price * 0.5),
            iconImageUri: marketItem.iconImageUri || '',
            category: marketItem.category,
            rarity: itemData?.rarity,
            rarityColor: rarityColor
          });
        }
      }

      
      return sellableItems;
    } catch (error) {
      return [];
    }
  }



  /**
   * Get all available market categories
   */
  static getCategories(): string[] {
    const categories = new Set(this.MARKET_ITEMS.map(item => item.category));
    return Array.from(categories).sort();
  }

  /**
   * Get items by category
   */
  static getItemsByCategory(category: string): MarketItem[] {
    return this.MARKET_ITEMS.filter(item => item.category === category);
  }

  /**
   * Check if a player can afford an item
   */
  static canAffordItem(player: Player, itemId: string): boolean {
    try {
      const gamePlayer = GamePlayer.getOrCreate(player);
      const currency = gamePlayer.currency.getCurrency();
      const item = this.getMarketItem(itemId);
      
      return item ? currency >= item.price : false;
    } catch {
      return false;
    }
  }

  /**
   * Get player's current currency
   */
  static getPlayerCurrency(player: Player): number {
    try {
      const gamePlayer = GamePlayer.getOrCreate(player);
      return gamePlayer.currency.getCurrency();
    } catch {
      return 0;
    }
  }

  /**
   * Add currency to player (for rewards, etc.)
   */
  static addCurrency(player: Player, amount: number): void {
    try {
      const gamePlayer = GamePlayer.getOrCreate(player);
      const currentCurrency = gamePlayer.currency.getCurrency();
      const newCurrency = Math.max(0, currentCurrency + amount);
      gamePlayer.currency.setCurrency(newCurrency);
    } catch (error) {
      // Error adding currency
    }
  }

  /**
   * Set item availability (for dynamic market updates)
   */
  static setItemAvailability(itemId: string, available: boolean): void {
    const item = this.MARKET_ITEMS.find(item => item.id === itemId);
    if (item) {
      item.available = available;
    }
  }

  /**
   * Update item price (for dynamic pricing)
   */
  static updateItemPrice(itemId: string, newPrice: number): void {
    const item = this.MARKET_ITEMS.find(item => item.id === itemId);
    if (item && newPrice >= 0) {
      item.price = newPrice;
    }
  }

  /**
   * Check if an item can be stacked in the stash
   */
  private static _canStackInStash(gamePlayer: GamePlayer, itemId: string, quantity: number): boolean {
    try {
      const item = ItemFactory.getInstance().createItem(itemId, { quantity });
      if (!item || !item.stackable) {
        return false; // Non-stackable items need empty slots
      }
      
      // Check if there's an existing stack that can accommodate more
      for (let i = 0; i < gamePlayer.stash.size; i++) {
        const existingItem = gamePlayer.stash.getItemAt(i);
        if (existingItem && existingItem.id === itemId) {
          // Check if this stack can hold more (assuming reasonable max stack size)
          const maxStack = (existingItem as any).maxStackSize || 999;
          if (existingItem.quantity < maxStack) {
            return true;
          }
        }
      }
      
      return false;
    } catch {
      return false;
    }
  }

  /**
   * Get stash quantity for a specific item
   */
  private static _getStashQuantity(gamePlayer: GamePlayer, itemId: string): number {
    let totalQuantity = 0;
    
    for (let i = 0; i < gamePlayer.stash.size; i++) {
      const item = gamePlayer.stash.getItemAt(i);
      if (item && item.id === itemId) {
        totalQuantity += item.quantity;
      }
    }
    
    return totalQuantity;
  }

  /**
   * Add item to stash
   */
  private static _addToStash(gamePlayer: GamePlayer, itemId: string, quantity: number): boolean {
    try {
      const item = ItemFactory.getInstance().createItem(itemId, { quantity });
      if (item) {
        return gamePlayer.stash.addItem(item);
      }
      return false;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get total item quantity across all inventory sources
   */
  private static _getTotalItemQuantity(gamePlayer: GamePlayer, itemId: string): number {
    let totalQuantity = 0;
    
    // Check hotbar
    for (let i = 0; i < gamePlayer.hotbar.size; i++) {
      const item = gamePlayer.hotbar.getItemAt(i);
      if (item && item.id === itemId) {
        totalQuantity += item.quantity;
      }
    }
    
    // Check backpack
    for (let i = 0; i < gamePlayer.backpack.size; i++) {
      const item = gamePlayer.backpack.getItemAt(i);
      if (item && item.id === itemId) {
        totalQuantity += item.quantity;
      }
    }
    
    // Check stash
    totalQuantity += this._getStashQuantity(gamePlayer, itemId);
    
    return totalQuantity;
  }

  /**
   * Remove item from stash
   */
  private static _removeFromStash(gamePlayer: GamePlayer, itemId: string, quantity: number): boolean {
    try {
      let remainingToRemove = quantity;
      let itemsRemoved = 0;
      
      // Iterate through stash slots
      for (let i = 0; i < gamePlayer.stash.size && remainingToRemove > 0; i++) {
        const item = gamePlayer.stash.getItemAt(i);
        if (item && item.id === itemId) {
          const toRemove = Math.min(remainingToRemove, item.quantity);
          
          if (toRemove >= item.quantity) {
            // Remove entire item
            const removedItem = gamePlayer.stash.removeItem(i);
            if (removedItem) {
              remainingToRemove -= removedItem.quantity;
              itemsRemoved++;
            }
          } else {
            // Remove partial quantity
            item.adjustQuantity(-toRemove);
            remainingToRemove -= toRemove;
            itemsRemoved++;
          }
        }
      }
      
      // Log removal for debugging
      if (itemsRemoved > 0) {
        console.log(`Removed ${quantity - remainingToRemove} ${itemId} from stash (${itemsRemoved} slots affected)`);
      }
      
      return remainingToRemove === 0;
    } catch (error) {
      console.error('Error removing item from stash:', error);
      return false;
    }
  }

  /**
   * Validate and clean up stash data
   */
  static validateStash(player: Player): void {
    try {
      const gamePlayer = GamePlayer.getOrCreate(player);
      let hasChanges = false;

      // Validate items in stash
      for (let i = 0; i < gamePlayer.stash.size; i++) {
        const item = gamePlayer.stash.getItemAt(i);
        if (item) {
          // Check if item is still valid
          if (!ItemFactory.getInstance().isValidItemId(item.id)) {
            gamePlayer.stash.removeItem(i);
            hasChanges = true;
          }
          // Check if quantity is valid
          else if (item.quantity <= 0) {
            gamePlayer.stash.removeItem(i);
            hasChanges = true;
          }
        }
      }

      if (hasChanges) {
        gamePlayer.save();
      }
    } catch (error) {
      // Error validating stash
    }
  }

  private static async _getRarityColor(rarity: string): Promise<{ r: number; g: number; b: number }> {
    // Cache the rarity colors to avoid repeated dynamic imports
    if (!this._cachedRarityColors) {
      const { RARITY_RGB_COLORS } = await import('../items/BaseItem');
      this._cachedRarityColors = RARITY_RGB_COLORS;
    }
    return this._cachedRarityColors[rarity];
  }
}
