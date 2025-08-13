import type { Player } from 'hytopia';

export interface PlayerStatsData {
  kills: number;
  deaths: number;
}

export default class PlayerStatsSystem {
  private static _key = 'stats';

  public static get(player: Player): PlayerStatsData {
    try {
      const data = (player.getPersistedData?.() as any) || {};
      const stats = (data as any)?.[this._key] || {};
      return {
        kills: Math.max(0, Math.floor(stats.kills ?? 0)),
        deaths: Math.max(0, Math.floor(stats.deaths ?? 0)),
      };
    } catch {
      return { kills: 0, deaths: 0 };
    }
  }

  public static set(player: Player, stats: PlayerStatsData): void {
    try {
      player.setPersistedData({ [this._key]: { kills: Math.max(0, stats.kills), deaths: Math.max(0, stats.deaths) } });
    } catch {}
  }

  public static addKill(player: Player): void {
    const s = this.get(player);
    s.kills += 1;
    this.set(player, s);
  }

  public static addDeath(player: Player): void {
    const s = this.get(player);
    s.deaths += 1;
    this.set(player, s);
  }
}


