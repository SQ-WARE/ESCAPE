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

import GiveAllWeaponsCommand from './classes/commands/GiveAllWeaponsCommand';
import CurrencyCommand from './classes/commands/CurrencyCommand';


import { LightingSystem } from './classes/systems/LightingSystem.ts';
import LootSystem from './classes/systems/LootSystem';
import { CameraEffectsSystem } from './classes/systems/CameraEffectsSystem';
import SessionManager from './classes/systems/SessionManager';
import { PartySystem } from './classes/systems/PartySystem';

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
  const partySystem = PartySystem.instance;

  lightingAlpha.initialize();
  lightingOmega.useNightPreset().initialize();

  // Favor day lighting for ALPHA: default values already day-like
  // Favor night lighting for OMEGA: tune intensities lower and ambient cooler
  // Explicit skybox intensity tuning for omega can be driven by preset now

  const lootAlpha = new LootSystem(alphaWorld);
  const lootOmega = new LootSystem(omegaWorld);
  (alphaWorld as any).lootSystem = lootAlpha;
  (omegaWorld as any).lootSystem = lootOmega;
  // Define spawn areas; can be the same for both for now
  lootAlpha.addSpawnArea({ x: 0, y: 20, z: 0 }, 40);
  lootAlpha.addSpawnArea({ x: 60, y: 20, z: -30 }, 30);
  lootOmega.addSpawnArea({ x: 0, y: 20, z: 0 }, 40);
  lootOmega.addSpawnArea({ x: 60, y: 20, z: -30 }, 30);
  WorldManager.instance.setDefaultWorld(alphaWorld);
  alphaWorld.loadMap(worldMap);
  omegaWorld.loadMap(worldMap);
  // Spawn a few crates
  lootAlpha.spawnCrates(8);
  lootOmega.spawnCrates(8);

  // Let SessionManager know about the lobby and session worlds
  SessionManager.instance.setLobbyWorld(alphaWorld);
  SessionManager.instance.setSessionWorld('alpha', alphaWorld);
  SessionManager.instance.setSessionWorld('omega', omegaWorld);

  CommandManager.instance.registerCommands([
    new GiveAllWeaponsCommand(),
    new CurrencyCommand(),
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

  new Audio({
    uri: 'audio/music/hytopia-main-theme.mp3',
    loop: true,
    volume: 0.06,
  }).play(alphaWorld);
  new Audio({
    uri: 'audio/music/hytopia-main-theme.mp3',
    loop: true,
    volume: 0.06,
  }).play(omegaWorld);
});
