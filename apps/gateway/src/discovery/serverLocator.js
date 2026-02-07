import { redisMap } from './redisMap.js'

export class ServerLocator {
  constructor(options = {}) {
    this.options = {
      rebalance: false,
      maxRoomsPerServer: options.maxRoomsPerServer || 200,
      ...options
    }
  }

  // ─────────────────────────────────────────
  // Public API
  // ─────────────────────────────────────────

  async locate(roomId) {
    // 1. existing sticky?
    const existing = await redisMap.getRoomServer(roomId)

    if (existing) {
      const alive = await redisMap.isAlive(existing)

      if (alive) {
        return {
          serverId: existing,
          reason: 'sticky'
        }
      }

      // dead → remove mapping
      await redisMap.deleteRoom(roomId)
    }

    // 2. choose new
    const server = await this._selectServer()

    if (!server) {
      throw new Error('NO_AUDIO_SERVERS_AVAILABLE')
    }

    await redisMap.setRoomServer(roomId, server.id)

    return {
      serverId: server.id,
      reason: 'assigned'
    }
  }

  async release(roomId) {
    const serverId = await redisMap.getRoomServer(roomId)

    if (serverId) {
      await redisMap.decrServerLoad(serverId)
      await redisMap.deleteRoom(roomId)
    }
  }

  // ─────────────────────────────────────────
  // Selection Logic
  // ─────────────────────────────────────────

  async _selectServer() {
    const servers = await redisMap.listServers()

    if (!servers.length) return null

    // Filter overloaded
    const candidates = servers.filter(s =>
      (s.load || 0) < this.options.maxRoomsPerServer
    )

    if (!candidates.length) return null

    // Least loaded first
    candidates.sort((a, b) =>
      (a.load || 0) - (b.load || 0)
    )

    const chosen = candidates[0]

    await redisMap.incrServerLoad(chosen.id)

    return chosen
  }

  // ─────────────────────────────────────────
  // Introspection
  // ─────────────────────────────────────────

  async debugState() {
    const servers = await redisMap.listServers()

    const rooms = {}

    for (const s of servers) {
      rooms[s.id] = s.load || 0
    }

    return {
      servers,
      rooms
    }
  }
}

export const serverLocator = new ServerLocator()
