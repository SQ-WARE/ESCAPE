import {
  startServer,
  Audio,
  PlayerEvent,
  WorldManager,
} from 'hytopia';

import worldMap from './assets/map.json' with { type: 'json' };
import GamePlayerEntity from './classes/GamePlayerEntity';
import GamePlayer from './classes/GamePlayer';
import { CommandManager } from './classes/commands/CommandManager';
import { GiveCommand } from './classes/commands/GiveCommand';
import GiveAmmoCommand from './classes/commands/GiveAmmoCommand';
import GiveAllWeaponsCommand from './classes/commands/GiveAllWeaponsCommand';
import CurrencyCommand from './classes/commands/CurrencyCommand';
import { ItemRegistry } from './classes/items/ItemRegistry';
import { WeaponFactory } from './classes/weapons/WeaponFactory';
import { LightingSystem } from './classes/systems/LightingSystem.ts';
import LootSystem from './classes/systems/LootSystem';
import { CameraEffectsSystem } from './classes/systems/CameraEffectsSystem';

startServer(() => {
  const world = WorldManager.instance.createWorld({
    name: 'ESCAPE',
    skyboxUri: 'skyboxes/partly_cloudy',
  });

  const lightingSystem = new LightingSystem(world);
  const cameraEffectsSystem = new CameraEffectsSystem();

  lightingSystem.initialize();
  const lootSystem = new LootSystem(world);
  (world as any).lootSystem = lootSystem;
  // Define a couple of spawn areas; tune as needed or load from map
  lootSystem.addSpawnArea({ x: 0, y: 20, z: 0 }, 40);
  lootSystem.addSpawnArea({ x: 60, y: 20, z: -30 }, 30);
  // Spawn a few crates at start
  lootSystem.spawnCrates(8);
  WorldManager.instance.setDefaultWorld(world);
  world.loadMap(worldMap);

  CommandManager.instance.registerCommands([
    new GiveCommand(),
    new GiveAmmoCommand(),
    new GiveAllWeaponsCommand(),
    new CurrencyCommand(),
  ]);
  CommandManager.instance.setupCommandHandlers(world);

  setTimeout(() => {
    const availableWeapons = WeaponFactory.getAllWeaponDefinitions().map(def => def.id);
    
    world.chatManager.sendBroadcastMessage('Available Weapons: ' + availableWeapons.join(', '), 'FFFF00');
    world.chatManager.sendBroadcastMessage('Use /give <weapon> to get weapons', '669966');
    world.chatManager.sendBroadcastMessage('Use /giveammo <type> [amount] to get ammo', '669966');
    world.chatManager.sendBroadcastMessage('Ammo Types: pistol (9×19mm Parabellum), rifle (7.62×39mm), sniper (12.7×108mm), shotgun (12 Gauge)', 'CCCCCC');
    world.chatManager.sendBroadcastMessage('Use /giveallweapons to get all weapons and ammo for testing', 'FF6600');
  }, 1000);

  world.on(PlayerEvent.JOINED_WORLD, ({ player }) => {
    const gamePlayer = GamePlayer.getOrCreate(player);
    
    gamePlayer.loadMenu();
    cameraEffectsSystem.setupPlayerCamera(player);
    
    setTimeout(() => {
      const availableWeapons = WeaponFactory.getAllWeaponDefinitions().map(def => def.id);
      
      world.chatManager.sendPlayerMessage(player, `Welcome to ESCAPE, ${player.username}`, 'CC6600');
      world.chatManager.sendPlayerMessage(player, `Use /give <weapon> to get weapons (${availableWeapons.join(', ')})`, 'CCCCCC');
      world.chatManager.sendPlayerMessage(player, `Use /giveammo <type> [amount] to get ammo`, 'CCCCCC');
      world.chatManager.sendPlayerMessage(player, `Ammo Types: pistol (9×19mm Parabellum), rifle (7.62×39mm), sniper (12.7×108mm), shotgun (12 Gauge)`, 'CCCCCC');
      world.chatManager.sendPlayerMessage(player, `Use /giveallweapons to get all weapons and ammo for testing`, 'FF6600');
    }, 2000);
  });

  world.on(PlayerEvent.LEFT_WORLD, ({ player }) => {
    GamePlayer.remove(player);
    cameraEffectsSystem.cleanupPlayer(player);
  });

  new Audio({
    uri: 'audio/music/hytopia-main-theme.mp3',
    loop: true,
    volume: 0.06,
  }).play(world);
});
