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
    console.log(`🎯 Creating party for player: ${player.username} (ID: ${player.id})`);
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
    
    console.log(`🎯 Party created with ID: ${partyId}`);
    this._updatePartyUI(player, party);
    return partyId;
  }

  /**
   * Sends an invite to a player by username
   */
  public sendInvite(fromPlayer: Player, targetUsername: string): boolean {
    console.log(`🎯 sendInvite called - from: ${fromPlayer.username} (ID: ${fromPlayer.id}), to: "${targetUsername}"`);
    console.log(`🎯 From player object:`, { username: fromPlayer.username, id: fromPlayer.id });
    
    // Validate input
    if (!targetUsername || targetUsername.trim().length === 0) {
      console.log('Invalid username provided');
      return false;
    }

    const cleanUsername = targetUsername.trim();
    console.log(`🎯 Cleaned username: "${cleanUsername}"`);
    
    // Don't allow self-invites
    if (fromPlayer.username === cleanUsername) {
      console.log('Cannot invite yourself');
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
      console.log('Party is full');
      return false;
    }

    // Check if player is already in this party
    const existingMember = party.find(member => member.username === cleanUsername);
    if (existingMember) {
      console.log(`Player ${cleanUsername} is already in this party`);
      return false;
    }

    // Find target player by username
    const targetPlayer = this._findPlayerByUsername(cleanUsername);
    if (!targetPlayer) {
      console.log(`Player ${cleanUsername} not found or not online`);
      return false;
    }

    // Check if target player is already in this specific party
    const targetPartyId = this._playerPartyMap.get(targetPlayer.id);
    if (targetPartyId === fromPartyId) {
      console.log(`Player ${cleanUsername} is already in this party`);
      return false;
    }
    
    // Check if target player is a host of a party with other members
    if (targetPartyId) {
      const targetParty = this._parties.get(targetPartyId);
      if (targetParty) {
        const targetMember = targetParty.find(member => member.playerId === targetPlayer.id);
        if (targetMember && targetMember.isHost && targetParty.length > 1) {
          console.log(`Cannot invite ${cleanUsername} - they are the host of a party with ${targetParty.length - 1} other members`);
          return false;
        }
      }
    }
    
    // Check if the combined party size would exceed maximum
    if (targetPartyId) {
      const targetParty = this._parties.get(targetPartyId);
      const combinedSize = party.length + (targetParty ? targetParty.length : 1);
      if (combinedSize > 4) {
        console.log(`Cannot invite ${cleanUsername} - combined party size would be ${combinedSize} (max 4)`);
        return false;
      }
    }
    
    // If target player is in a different party, log for merging
    if (targetPartyId) {
      console.log(`Player ${cleanUsername} is in a different party (${targetPartyId}), will merge on accept`);
    }

    // Check if there's already a pending invite to this player
    const existingInvite = Array.from(this._pendingInvites.values()).find(
      invite => invite.toPlayerId === targetPlayer.id && invite.fromPlayerId === fromPlayer.id
    );
    if (existingInvite) {
      console.log(`Already sent an invite to ${cleanUsername}`);
      return false;
    }

    // Check if there's a pending invite from this player to the inviter (circular invite)
    const reverseInvite = Array.from(this._pendingInvites.values()).find(
      invite => invite.toPlayerId === fromPlayer.id && invite.fromPlayerId === targetPlayer.id
    );
    if (reverseInvite) {
      console.log(`Cannot invite ${cleanUsername} - they have a pending invite to you`);
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
      console.log(`🎯 Sending party invite to ${targetPlayer.username}:`, inviteData);
      targetPlayer.ui.sendData(inviteData);
    } catch (error) {
      console.error('Failed to send invite UI:', error);
      this._pendingInvites.delete(invite.id);
      return false;
    }

    // Set timeout to expire invite
    setTimeout(() => {
      this._expireInvite(invite.id);
    }, this._inviteTimeout);

    console.log(`Invite sent from ${fromPlayer.username} to ${targetUsername}`);
    return true;
  }

  /**
   * Accepts a party invite
   */
  public acceptInvite(player: Player, inviteId: string): boolean {
    const invite = this._pendingInvites.get(inviteId);
    if (!invite) {
      console.log('Invite not found or expired');
      return false;
    }

    if (invite.toPlayerId !== player.id) {
      console.log('Invite not for this player');
      return false;
    }

    if (Date.now() > invite.expiresAt) {
      console.log('Invite expired');
      this._expireInvite(inviteId);
      return false;
    }

    const party = this._parties.get(invite.partyId);
    if (!party) {
      console.log('Party not found');
      return false;
    }

    if (party.length >= 4) {
      console.log('Party is full');
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
          console.log(`Cannot accept invite - ${player.username} is host of a party with ${existingParty.length - 1} other members`);
          return false;
        }
        
        // Check if combined party size would exceed maximum
        const combinedSize = party.length + existingParty.length;
        if (combinedSize > 4) {
          console.log(`Cannot accept invite - combined party size would be ${combinedSize} (max 4)`);
          return false;
        }
      }
      
      console.log(`🎯 Player ${player.username} is leaving party ${currentPartyId} to join party ${invite.partyId}`);
      
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
                console.log(`🎯 Deleted empty party ${currentPartyId}`);
              } else if (wasHost && currentParty.length > 0) {
                // Transfer host to next player
                const nextHost = currentParty[0];
                if (nextHost) {
                  nextHost.isHost = true;
                  this._updatePartyUIForAll(currentParty);
                  console.log(`🎯 Transferred host in party ${currentPartyId} to ${nextHost.username}`);
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

    console.log(`${player.username} joined party`);
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
    console.log(`🎯 kickPlayer called - host: ${hostPlayer.username}, target: "${targetUsername}"`);
    
    // Validate input
    if (!targetUsername || targetUsername.trim().length === 0) {
      console.log('Invalid username provided');
      return false;
    }

    const cleanUsername = targetUsername.trim();
    
    // Don't allow self-kicks
    if (hostPlayer.username === cleanUsername) {
      console.log('Cannot kick yourself');
      return false;
    }

    // Get host's party
    const hostPartyId = this._playerPartyMap.get(hostPlayer.id);
    if (!hostPartyId) {
      console.log('Host is not in a party');
      return false;
    }

    const party = this._parties.get(hostPartyId);
    if (!party) {
      console.log('Party not found');
      return false;
    }

    // Check if player is actually the host
    const hostMember = party.find(member => member.playerId === hostPlayer.id);
    if (!hostMember || !hostMember.isHost) {
      console.log('Only party host can kick players');
      return false;
    }

    // Find target player in party
    const targetMember = party.find(member => member.username === cleanUsername);
    if (!targetMember) {
      console.log(`Player ${cleanUsername} is not in this party`);
      return false;
    }

    // Find target player object
    const targetPlayer = this._findPlayerById(targetMember.playerId);
    if (!targetPlayer) {
      console.log(`Target player ${cleanUsername} not found or offline`);
      return false;
    }

    // Remove player from party
    const playerIndex = party.findIndex(member => member.playerId === targetMember.playerId);
    if (playerIndex === -1) {
      console.log(`Player ${cleanUsername} not found in party`);
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

    console.log(`${hostPlayer.username} kicked ${cleanUsername} from party`);
    return true;
  }

  /**
   * Leaves the current party
   */
  public leaveParty(player: Player): void {
    const partyId = this._playerPartyMap.get(player.id);
    if (!partyId) {
      console.log(`${player.username} is not in a party`);
      return;
    }

    const party = this._parties.get(partyId);
    if (!party) {
      console.log(`Party ${partyId} not found`);
      return;
    }

    // Find player in party
    const playerIndex = party.findIndex(member => member.playerId === player.id);
    if (playerIndex === -1) {
      console.log(`${player.username} not found in party ${partyId}`);
      return;
    }

    const playerMember = party[playerIndex];
    if (!playerMember) {
      console.log(`Player member data not found for ${player.username}`);
      return;
    }

    // Check if player is host and party has other members
    if (playerMember.isHost && party.length > 1) {
      console.log(`${player.username} cannot leave party - they are the host with ${party.length - 1} other members`);
      return;
    }

    const wasHost = playerMember.isHost;
    party.splice(playerIndex, 1);
    this._playerPartyMap.delete(player.id);

    if (party.length === 0) {
      // Party is empty, delete it
      this._parties.delete(partyId);
      console.log(`🎯 Deleted empty party ${partyId}`);
      
      // Notify the leaving player that their party was disbanded
      this._notifyPartyDisbanded(player);
    } else if (wasHost && party.length > 0) {
      // Transfer host to next player
      const nextHost = party[0];
      if (nextHost) {
        nextHost.isHost = true;
        this._updatePartyUIForAll(party);
        console.log(`🎯 Transferred host to ${nextHost.username}`);
      }
    } else {
      // Update UI for remaining members
      this._updatePartyUIForAll(party);
    }

    // Update UI for the player who left (create new solo party)
    this._updatePlayerLeftPartyUI(player);

    console.log(`${player.username} left party`);
  }

  /**
   * Initiates party deployment (host only)
   */
  public initiateDeploy(player: Player): boolean {
    console.log(`PartySystem.initiateDeploy called for player ${player.username}`);
    
    const partyId = this._playerPartyMap.get(player.id);
    if (!partyId) {
      console.log('No party ID found for player');
      return false;
    }

    const party = this._parties.get(partyId);
    if (!party) {
      console.log('No party found for party ID');
      return false;
    }

    console.log(`Party members: ${party.length}`, party.map(m => `${m.username} (${m.isHost ? 'host' : 'member'})`));

    // Don't initiate party deployment for solo players
    if (party.length <= 1) {
      console.log('Party deployment not needed for solo player');
      return false;
    }

    const playerMember = party.find(member => member.playerId === player.id);
    if (!playerMember || !playerMember.isHost) {
      console.log('Only party host can initiate deployment');
      return false;
    }

    // Check if all members are ready
    const notReadyMembers = party.filter(member => member.status !== 'ready');
    if (notReadyMembers.length > 0) {
      console.log('Not all party members are ready');
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
    console.log(`🎯 Sending party update to ${player.username}:`, data);
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

    console.log(`Deploying party with ${party.length} members`);

    // Deploy each party member
    party.forEach(member => {
      const player = this._findPlayerById(member.playerId);
      if (player) {
        const gamePlayer = GamePlayer.getOrCreate(player);
        gamePlayer.deploy();
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
   * Gets a player's level from their persisted data
   */
  private _getPlayerLevel(player: Player): number {
    try {
      const data = (player.getPersistedData?.() as any) || {};
      const prog = (data as any)?.progression || {};
      const level = Math.max(1, Math.floor(prog.level ?? 1));
      console.log(`🎯 Got level ${level} for player ${player.username} (raw: ${prog.level})`);
      return level;
    } catch (error) {
      console.error(`Failed to get level for player ${player.username}:`, error);
      return 1;
    }
  }

  /**
   * Finds a player by ID
   */
  private _findPlayerById(playerId: string): Player | null {
    console.log(`🎯 Finding player by ID: ${playerId}`);
    
    // Use PlayerManager to get all connected players
    const allPlayers = PlayerManager.instance.getConnectedPlayers();
    console.log(`🎯 Found ${allPlayers.length} total connected players`);
    
    const player = allPlayers.find(p => p.id === playerId);
    if (player) {
      console.log(`🎯 Found player: ${player.username} (ID: ${player.id})`);
      return player;
    }
    
    console.log(`🎯 Player not found for ID: ${playerId}`);
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
      console.log(`🎯 Cleared invite ${inviteId} for player ${playerId}`);
    }
  }

  /**
   * Updates UI for a player who left a party (creates new solo party)
   */
  private _updatePlayerLeftPartyUI(player: Player): void {
    console.log(`🎯 Updating UI for ${player.username} who left party`);
    
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
        console.log(`🎯 Sent party update to ${player.username} for new solo party`);
      } catch (error) {
        console.error(`🎯 Failed to send party update to ${player.username}:`, error);
      }
    }
  }

  /**
   * Notifies a player that their party was disbanded
   */
  private _notifyPartyDisbanded(player: Player): void {
    console.log(`🎯 Notifying ${player.username} that their party was disbanded`);
    
    try {
      player.ui.sendData({
        type: 'party-disbanded'
      });
      console.log(`🎯 Sent party disbanded notification to ${player.username}`);
    } catch (error) {
      console.error(`🎯 Failed to send party disbanded notification to ${player.username}:`, error);
    }
  }

  /**
   * Notifies a player that they were kicked from a party
   */
  private _notifyPlayerKicked(player: Player, reason?: string): void {
    console.log(`🎯 Notifying ${player.username} that they were kicked from party`);
    
    try {
      player.ui.sendData({
        type: 'party-kicked',
        reason: reason || 'Kicked from party'
      });
      console.log(`🎯 Sent party kicked notification to ${player.username}`);
    } catch (error) {
      console.error(`🎯 Failed to send party kicked notification to ${player.username}:`, error);
    }
  }

  /**
   * Finds a player by username
   */
  private _findPlayerByUsername(username: string): Player | null {
    console.log(`🎯 Finding player by username: "${username}"`);
    
    // Use PlayerManager to get all connected players
    const allPlayers = PlayerManager.instance.getConnectedPlayers();
    console.log(`🎯 Found ${allPlayers.length} total connected players`);
    console.log(`🎯 Available usernames:`, allPlayers.map(p => ({ username: p.username, id: p.id })));
    
    // Find player by username (case insensitive)
    const player = allPlayers.find(p => p.username.toLowerCase() === username.toLowerCase());
    if (player) {
      console.log(`🎯 Found player: ${player.username} (ID: ${player.id})`);
      return player;
    }
    
    console.log(`🎯 Player not found for username: "${username}"`);
    return null;
  }
}
