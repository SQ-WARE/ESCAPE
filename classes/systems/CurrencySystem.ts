import type { Player } from 'hytopia';

/**
 * CurrencySystem handles persistent currency balance per player.
 * It stores currency under the `currency` key in player persisted data.
 */
export default class CurrencySystem {
  public static get(player: Player): number {
    try {
      const data = (player.getPersistedData?.() as any) || {};
      return Math.max(0, Math.floor((data as any)?.currency ?? 0));
    } catch {
      return 0;
    }
  }

  public static set(player: Player, amount: number): void {
    try {
      player.setPersistedData({ currency: Math.max(0, Math.floor(amount)) });
    } catch {}
  }

  public static add(player: Player, amount: number, reason?: string): void {
    const current = this.get(player);
    this.set(player, current + Math.floor(amount));
    this._notify(player, `${amount >= 0 ? '+' : ''}${Math.floor(amount)} CR${reason ? ` (${reason})` : ''}`);
  }

  public static spend(player: Player, amount: number, reason?: string): boolean {
    const current = this.get(player);
    const spend = Math.floor(amount);
    if (spend <= 0) return true;
    if (current < spend) return false;
    this.set(player, current - spend);
    this._notify(player, `-${spend} CR${reason ? ` (${reason})` : ''}`);
    return true;
  }

  private static _notify(player: Player, message: string): void {
    try {
      player.ui?.sendData({ type: 'notification', message, color: '00FF00' });
    } catch {}
  }
}


