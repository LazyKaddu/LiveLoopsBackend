import Redis from 'ioredis'

/**
 * Key structure
 *
 * servers:audio                → set of serverIds
 * server:{id}:meta             → json { host, port, load, rooms }
 * server:{id}:hb               → expiring heartbeat key
 * room:{roomId}:server         → serverId
 */

export class RedisMap {
  constructor(config = {}) {
    this.redis = new Redis(config.url || process.env.REDIS_URL)

    this.ttl = config.ttl || 10        // heartbeat ttl (sec)
    this.prefix = config.prefix || 'gw'
  }

  // ─────────────────────────────────────────
  // Audio Server Registration
  // ─────────────────────────────────────────

  async registerServer(serverId, meta) {
    const p = this.redis.pipeline()

    p.sadd(`${this.prefix}:servers:audio`, serverId)

    p.set(
      `${this.prefix}:server:${serverId}:meta`,
      JSON.stringify({
        ...meta,
        registeredAt: Date.now()
      })
    )

    p.set(
      `${this.prefix}:server:${serverId}:hb`,
      '1',
      'EX',
      this.ttl
    )

    await p.exec()
  }

  async heartbeat(serverId) {
    await this.redis.set(
      `${this.prefix}:server:${serverId}:hb`,
      '1',
      'EX',
      this.ttl
    )
  }

  async isAlive(serverId) {
    const v = await this.redis.get(
      `${this.prefix}:server:${serverId}:hb`
    )
    return !!v
  }

  async listServers() {
    const ids = await this.redis.smembers(
      `${this.prefix}:servers:audio`
    )

    const servers = []

    for (const id of ids) {
      const alive = await this.isAlive(id)
      if (!alive) continue

      const meta = await this.redis.get(
        `${this.prefix}:server:${id}:meta`
      )

      if (!meta) continue

      servers.push({
        id,
        ...JSON.parse(meta)
      })
    }

    return servers
  }

  // ─────────────────────────────────────────
  // Room → Server Mapping
  // ─────────────────────────────────────────

  async setRoomServer(roomId, serverId) {
    await this.redis.set(
      `${this.prefix}:room:${roomId}:server`,
      serverId
    )
  }

  async getRoomServer(roomId) {
    return this.redis.get(
      `${this.prefix}:room:${roomId}:server`
    )
  }

  async deleteRoom(roomId) {
    await this.redis.del(
      `${this.prefix}:room:${roomId}:server`
    )
  }

  // ─────────────────────────────────────────
  // Load Counters
  // ─────────────────────────────────────────

  async incrServerLoad(serverId, by = 1) {
    await this.redis.hincrby(
      `${this.prefix}:server:${serverId}:meta`,
      'load',
      by
    )
  }

  async decrServerLoad(serverId, by = 1) {
    await this.redis.hincrby(
      `${this.prefix}:server:${serverId}:meta`,
      'load',
      -by
    )
  }

  // ─────────────────────────────────────────
  // Cleanup
  // ─────────────────────────────────────────

  async pruneDeadServers() {
    const ids = await this.redis.smembers(
      `${this.prefix}:servers:audio`
    )

    for (const id of ids) {
      const alive = await this.isAlive(id)
      if (!alive) {
        await this.redis.srem(
          `${this.prefix}:servers:audio`,
          id
        )
      }
    }
  }
}

// singleton
export const redisMap = new RedisMap()
