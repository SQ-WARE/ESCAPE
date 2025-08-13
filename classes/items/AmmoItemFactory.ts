import PistolAmmoItem from './ammo/PistolAmmoItem';
import RifleAmmoItem from './ammo/RifleAmmoItem';
import SniperAmmoItem from './ammo/SniperAmmoItem';
import ShotgunAmmoItem from './ammo/ShotgunAmmoItem';

export default class AmmoItemFactory {
  public static create(type: string, quantity: number) {
    switch ((type || '').toLowerCase()) {
      case 'pistol': return PistolAmmoItem.create({ quantity });
      case 'rifle': return RifleAmmoItem.create({ quantity });
      case 'sniper': return SniperAmmoItem.create({ quantity });
      case 'shotgun': return ShotgunAmmoItem.create({ quantity });
      default: return PistolAmmoItem.create({ quantity });
    }
  }
}


