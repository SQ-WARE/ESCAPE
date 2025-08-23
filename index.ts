import {
  startServer,
  PlayerEvent,
  WorldManager,
} from 'hytopia';

import worldMap from './assets/map.json' with { type: 'json' };
import GamePlayer from './classes/GamePlayer';
import { CommandManager } from './classes/commands/CommandManager';
import GiveItemCommand from './classes/commands/GiveItemCommand';
import { LightingSystem } from './classes/systems/LightingSystem.ts';
import LootSystem from './classes/systems/LootSystem';
import { CameraEffectsSystem } from './classes/systems/CameraEffectsSystem';
import SessionManager from './classes/systems/SessionManager';
import { PartySystem } from './classes/systems/PartySystem';
import { ItemRegistry } from './classes/items/ItemRegistry';

startServer(() => {
  // Create separate instances for ALPHA (day) and OMEGA (night)
  const alphaWorld = WorldManager.instance.createWorld({
    name: 'ESCAPE-ALPHA',
    skyboxUri: 'skyboxes/partly_cloudy',
  });
  const omegaWorld = WorldManager.instance.createWorld({
    name: 'ESCAPE-OMEGA',
    skyboxUri: 'skyboxes/night',
  });

  const lightingAlpha = new LightingSystem(alphaWorld);
  const lightingOmega = new LightingSystem(omegaWorld);
  const cameraEffectsSystem = new CameraEffectsSystem();
  SessionManager.instance.initialize();
  
  // Initialize party system
  PartySystem.instance;

  // Initialize item registry (automatically registers all items)
  ItemRegistry.getInstance();

  lightingAlpha.initialize();
  lightingOmega.useNightPreset().initialize();

  const lootAlpha = new LootSystem(alphaWorld);
  const lootOmega = new LootSystem(omegaWorld);
  (alphaWorld as any).lootSystem = lootAlpha;
  (omegaWorld as any).lootSystem = lootOmega;
  
  // Define spawn areas
  lootAlpha.addSpawnArea({ x: 0, y: 20, z: 0 }, 40);
  lootAlpha.addSpawnArea({ x: 60, y: 20, z: -30 }, 30);
  lootOmega.addSpawnArea({ x: 0, y: 20, z: 0 }, 40);
  lootOmega.addSpawnArea({ x: 60, y: 20, z: -30 }, 30);
  
  WorldManager.instance.setDefaultWorld(alphaWorld);
  alphaWorld.loadMap(worldMap);
  omegaWorld.loadMap(worldMap);
  
  // Spawn crates
  lootAlpha.spawnCrates(8);
  lootOmega.spawnCrates(8);

  // Let SessionManager know about the lobby and session worlds
  SessionManager.instance.setLobbyWorld(alphaWorld);
  SessionManager.instance.setSessionWorld('alpha', alphaWorld);
  SessionManager.instance.setSessionWorld('omega', omegaWorld);

  CommandManager.instance.registerCommands([
    new GiveItemCommand(),
  ]);
  CommandManager.instance.setupCommandHandlers(alphaWorld);
  CommandManager.instance.setupCommandHandlers(omegaWorld);

  const onJoined = ({ player }: { player: any }) => {
    const gamePlayer = GamePlayer.getOrCreate(player);
    const playerId = player.id || player.username;

    // If a session transfer was in progress, end it and avoid reloading the menu mid-deploy
    try {
      if (SessionManager.instance.isTransferringById(playerId)) {
        SessionManager.instance.markTransferEndById(playerId);
        // Resume deploy after transfer to the target session world
        setTimeout(() => {
          try {
            (gamePlayer as any).resumeDeployAfterTransfer?.();
          } catch {}
        }, 120);
      } else {
        gamePlayer.loadMenu();
      }
    } catch {
      gamePlayer.loadMenu();
    }
    cameraEffectsSystem.setupPlayerCamera(player);
  };
  alphaWorld.on(PlayerEvent.JOINED_WORLD, onJoined);
  omegaWorld.on(PlayerEvent.JOINED_WORLD, onJoined);

  const onLeft = ({ player }: { player: any }) => {
    // Skip cleanup if we're actively transferring to another world
    const pid = player.id || player.username;
    if (SessionManager.instance.isTransferringById(pid)) {
      return;
    }
    try { SessionManager.instance.clearPlayerById(pid); } catch {}
    GamePlayer.remove(player);
    cameraEffectsSystem.cleanupPlayer(player);
  };
  alphaWorld.on(PlayerEvent.LEFT_WORLD, onLeft);
  omegaWorld.on(PlayerEvent.LEFT_WORLD, onLeft);
});
