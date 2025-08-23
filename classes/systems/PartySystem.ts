import type { Player, World } from 'hytopia';
import { WorldManager, PlayerManager } from 'hytopia';
import GamePlayer from '../GamePlayer';

export interface PartyMember {
  playerId: string;
  username: string;
  level: number;
  status: 'ready' | 'not-ready' | 'offline';
  isHost: boolean;
}

export interface PartyInvite {
  id: string;
  fromPlayerId: string;
  fromUsername: string;
  toPlayerId: string;
  toUsername: string;
  partyId: string;
  timestamp: number;
  expiresAt: number;
}



export class PartySystem {
  private static _instance: PartySystem | undefined;
  
  private _parties: Map<string, PartyMember[]> = new Map();
  private _playerPartyMap: Map<string, string> = new Map(); // playerId -> partyId
  private _pendingInvites: Map<string, PartyInvite> = new Map();
  private _inviteTimeout = 30000; // 30 seconds

  public static get instance(): PartySystem {
    if (!this._instance) {
      this._instance = new PartySystem();
    }
    return this._instance;
  }

  private constructor() {}

  /**
   * Creates a new party with the given player as host
   */
  public createParty(player: Player): string {
    const partyId = this._generatePartyId();
    
    const party: PartyMember[] = [{
      playerId: player.id,
      username: player.username || 'Player',
      level: this._getPlayerLevel(player),
      status: 'ready',
      isHost: true
    }];

    this._parties.set(partyId, party);
    this._playerPartyMap.set(player.id, partyId);
    
    this._updatePartyUI(player, party);
    return partyId;
  }

  /**
   * Sends an invite to a player by username
   */
  public sendInvite(fromPlayer: Player, targetUsername: string): boolean {
    // Validate input
    if (!targetUsername || targetUsername.trim().length === 0) {
      return false;
    }

    const cleanUsername = targetUsername.trim();
    
    // Don't allow self-invites
    if (fromPlayer.username === cleanUsername) {
      return false;
    }

    let fromPartyId = this._playerPartyMap.get(fromPlayer.id);
    
    // If player is not in a party, create one for them
    if (!fromPartyId) {
      fromPartyId = this.createParty(fromPlayer);
    }

    const party = this._parties.get(fromPartyId);
    if (!party) return false;

    // Check if party is full
    if (party.length >= 4) {
      return false;
    }

    // Check if player is already in this party
    const existingMember = party.find(member => member.username === cleanUsername);
    if (existingMember) {
      return false;
    }

    // Find target player by username
    const targetPlayer = this._findPlayerByUsername(cleanUsername);
    if (!targetPlayer) {
      return false;
    }

    // Check if target player is already in this specific party
    const targetPartyId = this._playerPartyMap.get(targetPlayer.id);
    if (targetPartyId === fromPartyId) {
      return false;
    }
    
    // Check if target player is a host of a party with other members
    if (targetPartyId) {
      const targetParty = this._parties.get(targetPartyId);
      if (targetParty) {
        const targetMember = targetParty.find(member => member.playerId === targetPlayer.id);
        if (targetMember && targetMember.isHost && targetParty.length > 1) {
          return false;
        }
      }
    }
    
    // Check if the combined party size would exceed maximum
    if (targetPartyId) {
      const targetParty = this._parties.get(targetPartyId);
      const combinedSize = party.length + (targetParty ? targetParty.length : 1);
      if (combinedSize > 4) {
        return false;
      }
    }

    // Check if there's already a pending invite to this player
    const existingInvite = Array.from(this._pendingInvites.values()).find(
      invite => invite.toPlayerId === targetPlayer.id && invite.fromPlayerId === fromPlayer.id
    );
    if (existingInvite) {
      return false;
    }

    // Check if there's a pending invite from this player to the inviter (circular invite)
    const reverseInvite = Array.from(this._pendingInvites.values()).find(
      invite => invite.toPlayerId === fromPlayer.id && invite.fromPlayerId === targetPlayer.id
    );
    if (reverseInvite) {
      return false;
    }

    const invite: PartyInvite = {
      id: this._generateInviteId(),
      fromPlayerId: fromPlayer.id,
      fromUsername: fromPlayer.username || 'Unknown',
      toPlayerId: targetPlayer.id,
      toUsername: targetPlayer.username || targetUsername,
      partyId: fromPartyId,
      timestamp: Date.now(),
      expiresAt: Date.now() + this._inviteTimeout
    };

    this._pendingInvites.set(invite.id, invite);

    // Send invite UI to target player
    try {
      const inviteData = {
        type: 'party-invite',
        inviteId: invite.id,
        fromUsername: invite.fromUsername,
        partyId: fromPartyId
      };
      targetPlayer.ui.sendData(inviteData);
    } catch (error) {
      this._pendingInvites.delete(invite.id);
      return false;
    }

    // Set timeout to expire invite
    setTimeout(() => {
      this._expireInvite(invite.id);
    }, this._inviteTimeout);

    return true;
  }

  /**
   * Accepts a party invite
   */
  public acceptInvite(player: Player, inviteId: string): boolean {
    const invite = this._pendingInvites.get(inviteId);
    if (!invite) {
      return false;
    }

    if (invite.toPlayerId !== player.id) {
      return false;
    }

    if (Date.now() > invite.expiresAt) {
      this._expireInvite(inviteId);
      return false;
    }

    const party = this._parties.get(invite.partyId);
    if (!party) {
      return false;
    }

    if (party.length >= 4) {
      return false;
    }

    // Check if player is currently in a different party and validate the merge
    const currentPartyId = this._playerPartyMap.get(player.id);
    if (currentPartyId && currentPartyId !== invite.partyId) {
      const existingParty = this._parties.get(currentPartyId);
      if (existingParty) {
        // Check if player is host of a party with other members
        const currentMember = existingParty.find(member => member.playerId === player.id);
        if (currentMember && currentMember.isHost && existingParty.length > 1) {
          return false;
        }
        
        // Check if combined party size would exceed maximum
        const combinedSize = party.length + existingParty.length;
        if (combinedSize > 4) {
          return false;
        }
      }
      
      // Remove player from their current party
      const currentParty = this._parties.get(currentPartyId);
      if (currentParty) {
        const playerIndex = currentParty.findIndex(member => member.playerId === player.id);
        if (playerIndex !== -1) {
                      const playerMember = currentParty[playerIndex];
            if (playerMember) {
              const wasHost = playerMember.isHost;
              currentParty.splice(playerIndex, 1);
              
              // If party is now empty, delete it
              if (currentParty.length === 0) {
                this._parties.delete(currentPartyId);
              } else if (wasHost && currentParty.length > 0) {
                // Transfer host to next player
                const nextHost = currentParty[0];
                if (nextHost) {
                  nextHost.isHost = true;
                  this._updatePartyUIForAll(currentParty);
                }
              } else {
                // Update UI for remaining members
                this._updatePartyUIForAll(currentParty);
              }
            }
          }
      }
    }

    // Add player to new party
    party.push({
      playerId: player.id,
      username: player.username || 'Player',
      level: this._getPlayerLevel(player),
      status: 'ready',
      isHost: false
    });

    this._playerPartyMap.set(player.id, invite.partyId);
    this._pendingInvites.delete(inviteId);

    // Clear any pending invites from this player to others
    this._clearPlayerInvites(player.id);

    // Update UI for all party members
    this._updatePartyUIForAll(party);

    // Notify inviter that invite was accepted
    const inviter = this._findPlayerById(invite.fromPlayerId);
    if (inviter && inviter.ui) {
      inviter.ui.sendData({
        type: 'party-invite-accepted',
        username: player.username || 'Player'
      });
    }

    return true;
  }

  /**
   * Declines a party invite
   */
  public declineInvite(player: Player, inviteId: string): void {
    const invite = this._pendingInvites.get(inviteId);
    if (!invite || invite.toPlayerId !== player.id) return;

    this._pendingInvites.delete(inviteId);

    // Notify inviter that invite was declined
    const inviter = this._findPlayerById(invite.fromPlayerId);
    if (inviter && inviter.ui) {
      inviter.ui.sendData({
        type: 'party-invite-declined',
        username: player.username || 'Unknown'
      });
    }
  }

  /**
   * Kicks a player from the party (host only)
   */
  public kickPlayer(hostPlayer: Player, targetUsername: string): boolean {
    // Validate input
    if (!targetUsername || targetUsername.trim().length === 0) {
      return false;
    }

    const cleanUsername = targetUsername.trim();
    
    // Don't allow self-kicks
    if (hostPlayer.username === cleanUsername) {
      return false;
    }

    // Get host's party
    const hostPartyId = this._playerPartyMap.get(hostPlayer.id);
    if (!hostPartyId) {
      return false;
    }

    const party = this._parties.get(hostPartyId);
    if (!party) {
      return false;
    }

    // Check if player is actually the host
    const hostMember = party.find(member => member.playerId === hostPlayer.id);
    if (!hostMember || !hostMember.isHost) {
      return false;
    }

    // Find target player in party
    const targetMember = party.find(member => member.username === cleanUsername);
    if (!targetMember) {
      return false;
    }

    // Find target player object
    const targetPlayer = this._findPlayerById(targetMember.playerId);
    if (!targetPlayer) {
      return false;
    }

    // Remove player from party
    const playerIndex = party.findIndex(member => member.playerId === targetMember.playerId);
    if (playerIndex === -1) {
      return false;
    }

    party.splice(playerIndex, 1);
    this._playerPartyMap.delete(targetMember.playerId);

    // Update UI for remaining party members (but not the kicked player)
    this._updatePartyUIForRemainingMembers(party, targetPlayer.id);

    // Create new solo party for kicked player
    this._updatePlayerLeftPartyUI(targetPlayer);

    // Notify kicked player
    this._notifyPlayerKicked(targetPlayer, `Kicked by ${hostPlayer.username}`);

    return true;
  }

  /**
   * Leaves the current party
   */
  public leaveParty(player: Player): void {
    const partyId = this._playerPartyMap.get(player.id);
    if (!partyId) {
      return;
    }

    const party = this._parties.get(partyId);
    if (!party) {
      return;
    }

    // Find player in party
    const playerIndex = party.findIndex(member => member.playerId === player.id);
    if (playerIndex === -1) {
      return;
    }

    const playerMember = party[playerIndex];
    if (!playerMember) {
      return;
    }

    // Check if player is host and party has other members
    if (playerMember.isHost && party.length > 1) {
      return;
    }

    const wasHost = playerMember.isHost;
    party.splice(playerIndex, 1);
    this._playerPartyMap.delete(player.id);

    if (party.length === 0) {
      // Party is empty, delete it
      this._parties.delete(partyId);
      
      // Notify the leaving player that their party was disbanded
      this._notifyPartyDisbanded(player);
    } else if (wasHost && party.length > 0) {
      // Transfer host to next player
      const nextHost = party[0];
      if (nextHost) {
        nextHost.isHost = true;
        this._updatePartyUIForAll(party);
      }
    } else {
      // Update UI for remaining members
      this._updatePartyUIForAll(party);
    }

    // Update UI for the player who left (create new solo party)
    this._updatePlayerLeftPartyUI(player);
  }

  /**
   * Initiates party deployment (host only)
   */
  public initiateDeploy(player: Player): boolean {
    const partyId = this._playerPartyMap.get(player.id);
    if (!partyId) {
      return false;
    }

    const party = this._parties.get(partyId);
    if (!party) {
      return false;
    }

    // Don't initiate party deployment for solo players
    if (party.length <= 1) {
      return false;
    }

    const playerMember = party.find(member => member.playerId === player.id);
    if (!playerMember || !playerMember.isHost) {
      return false;
    }

    // Check if all members are ready
    const notReadyMembers = party.filter(member => member.status !== 'ready');
    if (notReadyMembers.length > 0) {
      return false;
    }

    // Deploy the entire party immediately
    this._deployParty(partyId);
    return true;
  }



  /**
   * Gets party data for a player
   */
  public getPartyData(playerId: string): { members: PartyMember[], maxMembers: number } | null {
    const partyId = this._playerPartyMap.get(playerId);
    if (!partyId) return null;

    const party = this._parties.get(partyId);
    if (!party) return null;

    return {
      members: party,
      maxMembers: 4
    };
  }

  /**
   * Updates party UI for a specific player
   */
  private _updatePartyUI(player: Player, party: PartyMember[]): void {
    const data = {
      type: 'party-update',
      partyData: {
        members: party,
        maxMembers: 4
      }
    };
    player.ui.sendData(data);
  }

  /**
   * Updates party UI for all party members
   */
  private _updatePartyUIForAll(party: PartyMember[]): void {
    party.forEach(member => {
      const player = this._findPlayerById(member.playerId);
      if (player) {
        this._updatePartyUI(player, party);
      }
    });
  }

  /**
   * Updates party UI for all party members except the specified player
   */
  private _updatePartyUIForRemainingMembers(party: PartyMember[], excludedPlayerId: string): void {
    party.forEach(member => {
      if (member.playerId !== excludedPlayerId) {
        const player = this._findPlayerById(member.playerId);
        if (player) {
          this._updatePartyUI(player, party);
        }
      }
    });
  }

  /**
   * Deploys the entire party to the game
   */
  private _deployParty(partyId: string): void {
    const party = this._parties.get(partyId);
    if (!party) return;

    // Track party raid for all members
    party.forEach(member => {
      const player = this._findPlayerById(member.playerId);
      if (player) {
        this._trackPartyRaid(player);
      }
    });

    // Deploy each party member using direct deployment (bypass party checks)
    party.forEach(member => {
      const player = this._findPlayerById(member.playerId);
      if (player) {
        const gamePlayer = GamePlayer.getOrCreate(player);
        gamePlayer.deployPartyMember(); // Use special method for party deployment
      }
    });

    // Clear the party (they're now in-game)
    this._parties.delete(partyId);
    party.forEach(member => {
      this._playerPartyMap.delete(member.playerId);
    });
  }

  /**
   * Expires an invite
   */
  private _expireInvite(inviteId: string): void {
    const invite = this._pendingInvites.get(inviteId);
    if (!invite) return;

    this._pendingInvites.delete(inviteId);

    // Notify inviter that invite expired
    const inviter = this._findPlayerById(invite.fromPlayerId);
    if (inviter) {
      inviter.ui.sendData({
        type: 'party-invite-expired',
        username: invite.toUsername
      });
    }
  }



  /**
   * Generates a unique party ID
   */
  private _generatePartyId(): string {
    return `party_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generates a unique invite ID
   */
  private _generateInviteId(): string {
    return `invite_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Tracks a party raid for social achievements
   */
  private _trackPartyRaid(player: Player): void {
    try {
      const data = (player.getPersistedData?.() as any) || {};
      const currentPartyRaids = Math.floor((data as any)?.partyRaids ?? 0);
      
      // Update party raid count
      player.setPersistedData({
        ...data,
        partyRaids: currentPartyRaids + 1
      });
      
      // Check social achievements
      const AchievementSystem = require('./AchievementSystem').default;
      AchievementSystem.checkSocialAchievements(player, currentPartyRaids + 1, 0); // 0 revives for now
    } catch {}
  }



  /**
   * Gets a player's level from their persisted data
   */
  private _getPlayerLevel(player: Player): number {
    try {
      const data = (player.getPersistedData?.() as any) || {};
      const prog = (data as any)?.progression || {};
      const level = Math.max(1, Math.floor(prog.level ?? 1));
      return level;
    } catch (error) {
      return 1;
    }
  }

  /**
   * Finds a player by ID
   */
  private _findPlayerById(playerId: string): Player | null {
    // Use PlayerManager to get all connected players
    const allPlayers = PlayerManager.instance.getConnectedPlayers();
    
    const player = allPlayers.find(p => p.id === playerId);
    if (player) {
      return player;
    }
    
    return null;
  }

  /**
   * Clears all pending invites for a player
   */
  private _clearPlayerInvites(playerId: string): void {
    const invitesToRemove: string[] = [];
    
    for (const [inviteId, invite] of this._pendingInvites.entries()) {
      if (invite.fromPlayerId === playerId || invite.toPlayerId === playerId) {
        invitesToRemove.push(inviteId);
      }
    }
    
    for (const inviteId of invitesToRemove) {
      this._pendingInvites.delete(inviteId);
    }
  }

  /**
   * Updates UI for a player who left a party (creates new solo party)
   */
  private _updatePlayerLeftPartyUI(player: Player): void {
    // Create a new solo party for the player
    const newPartyId = this.createParty(player);
    
    // Send party update to the player
    const partyData = this.getPartyData(player.id);
    if (partyData) {
      try {
        player.ui.sendData({
          type: 'party-update',
          partyData: partyData
        });
      } catch (error) {
        // Failed to send party update
      }
    }
  }

  /**
   * Notifies a player that their party was disbanded
   */
  private _notifyPartyDisbanded(player: Player): void {
    try {
      player.ui.sendData({
        type: 'party-disbanded'
      });
    } catch (error) {
      // Failed to send party disbanded notification
    }
  }

  /**
   * Notifies a player that they were kicked from a party
   */
  private _notifyPlayerKicked(player: Player, reason?: string): void {
    try {
      player.ui.sendData({
        type: 'party-kicked',
        reason: reason || 'Kicked from party'
      });
    } catch (error) {
      // Failed to send party kicked notification
    }
  }

  /**
   * Finds a player by username
   */
  private _findPlayerByUsername(username: string): Player | null {
    // Use PlayerManager to get all connected players
    const allPlayers = PlayerManager.instance.getConnectedPlayers();
    
    // Find player by username (case insensitive)
    const player = allPlayers.find(p => p.username.toLowerCase() === username.toLowerCase());
    if (player) {
      return player;
    }
    
    return null;
  }
}
