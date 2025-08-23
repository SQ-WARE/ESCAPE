import { Player, PlayerUIEvent, type EventPayloads } from 'hytopia';
import { MarketSystem } from './MarketSystem';
import type GamePlayer from '../GamePlayer';

export class MarketUIHandler {
  private gamePlayer: GamePlayer;
  private player: Player;

  constructor(gamePlayer: GamePlayer) {
    this.gamePlayer = gamePlayer;
    this.player = gamePlayer.player;
  }

  public load(): void {
    try {
      this.player.ui.load('ui/market.html');
      this.player.ui.off(PlayerUIEvent.DATA, this.handleMarketUIData);
      this.player.ui.on(PlayerUIEvent.DATA, this.handleMarketUIData);
      this.player.ui.lockPointer(false);
      
      // Send initial market data
      setTimeout(async () => {
        try {
          if (this.gamePlayer.isInMenu) {
            await this.sendMarketData();
          }
        } catch {}
      }, 120);
    } catch {}
  }

  public unload(): void {
    try {
      this.player.ui.off(PlayerUIEvent.DATA, this.handleMarketUIData);
    } catch {}
  }

  private handleMarketUIData = async (event: EventPayloads[PlayerUIEvent.DATA]) => {
    const { data } = event;
    switch (data.type) {
      case 'requestMarketData':
        await this.sendMarketData();
        break;
      case 'purchaseItem':
        await this.handlePurchaseItem(data);
        break;
      case 'sellItem':
        await this.handleSellItem(data);
        break;
      case 'backToMenu':
        this.gamePlayer.loadMenu();
        break;
    }
  }

  private async sendMarketData(): Promise<void> {
    try {
      // Validate stash before sending market data
      MarketSystem.validateStash(this.player);
      
      const marketData = await MarketSystem.getMarketData(this.player);
      this.player.ui.sendData({ 
        type: 'market-data', 
        ...marketData
      });
    } catch (error) {
      // Error sending market data
    }
  }

  private async handlePurchaseItem(data: any): Promise<void> {
    try {
      const { itemId } = data;
      const result = MarketSystem.purchaseItem(this.player, itemId);
      
      if (result.success) {
        this.player.ui.sendData({ 
          type: 'purchase-success', 
          itemId,
          newCurrency: result.newCurrency,
          message: result.message
        });
        
        // Refresh market data
        await this.sendMarketData();
        
        // Trigger stash sync to ensure UI is updated
        try {
          this.gamePlayer.stash.syncUI(this.player);
        } catch (error) {
          // Failed to sync stash UI
        }
      } else {
        this.player.ui.sendData({ 
          type: 'purchase-failed', 
          reason: result.message
        });
      }
    } catch {}
  }

  private async handleSellItem(data: any): Promise<void> {
    try {
      const { itemId, quantity = 1 } = data;
      const result = MarketSystem.sellItem(this.player, itemId, quantity);
      
      if (result.success) {
        this.player.ui.sendData({ 
          type: 'sell-success', 
          itemId,
          newCurrency: result.newCurrency,
          soldQuantity: result.soldQuantity,
          message: result.message
        });
        
        // Refresh market data
        await this.sendMarketData();
      } else {
        this.player.ui.sendData({ 
          type: 'sell-failed', 
          reason: result.message
        });
      }
    } catch {}
  }
}
