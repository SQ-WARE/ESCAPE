import { Player } from 'hytopia';
import type GamePlayer from '../GamePlayer';

export class CurrencyHandler {
  private gamePlayer: GamePlayer;
  private player: Player;

  constructor(gamePlayer: GamePlayer) {
    this.gamePlayer = gamePlayer;
    this.player = gamePlayer.player;
  }

  public getCurrency(): number {
    try {
      const data = (this.player.getPersistedData?.() as any) || {};
      return Math.max(0, Math.floor((data as any)?.currency ?? 0));
    } catch {
      return 0;
    }
  }

  public setCurrency(amount: number): void {
    try {
      this.player.setPersistedData({ currency: Math.max(0, Math.floor(amount)) });
    } catch {}
  }

  public addCurrency(amount: number, reason?: string): void {
    const current = this.getCurrency();
    this.setCurrency(current + Math.floor(amount));
    this.notifyCurrency(`${amount >= 0 ? '+' : ''}${Math.floor(amount)} CR${reason ? ` (${reason})` : ''}`);
  }

  public spendCurrency(amount: number, reason?: string): boolean {
    const current = this.getCurrency();
    const spend = Math.floor(amount);
    if (spend <= 0) return true;
    if (current < spend) return false;
    this.setCurrency(current - spend);
    this.notifyCurrency(`-${spend} CR${reason ? ` (${reason})` : ''}`);
    return true;
  }

  public hasCurrency(amount: number): boolean {
    return this.getCurrency() >= amount;
  }

  private notifyCurrency(message: string): void {
    try {
      this.player.ui.sendData({ type: 'notification', message, color: '00FF00' });
    } catch {}
  }
}
