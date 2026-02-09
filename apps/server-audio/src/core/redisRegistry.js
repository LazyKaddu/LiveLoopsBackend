import { createClient } from "redis";
import os from "os";

export async function initializeRedis() {
  try {
    const redisClient = createClient({
      host: process.env.REDIS_HOST || "localhost",
      port: process.env.REDIS_PORT || 6379,
      url: process.env.REDIS_URL
    });

    redisClient.on("error", (err) => console.error("[Redis] Error:", err));
    redisClient.on("connect", () => console.log("[Redis] Connected"));

    await redisClient.connect();

    console.log("[Redis] Successfully initialized");

    return redisClient;
  } catch (error) {
    console.error("[Redis] Initialization failed:", error);
    throw error;
  }
}

export class RedisRegistry {
  constructor(redisClient, options = {}) {
    this.client = redisClient;
    this.serverPort = options.serverPort || 4000;
    this.heartbeatInterval = options.heartbeatInterval || 5000;
    this.registryKey = "audio-servers";
    
    // Allow configurable host for service discovery
    // In containerized environments, use ADVERTISE_HOST or AUDIO_SERVER_HOST
    const advertiseHost = process.env.ADVERTISE_HOST 
      || process.env.AUDIO_SERVER_HOST 
      || process.env.HOST
      || "localhost";
    
    this.serverInstanceId = `${advertiseHost}:${this.serverPort}`;
    this.advertiseHost = advertiseHost;
    this.heartbeatTimer = null;
  }

  async register() {
    if (!this.client) {
      console.warn("[Redis] Client not connected, cannot register");
      return false;
    }

    try {
      const serverInfo = {
        host: this.advertiseHost,
        port: this.serverPort,
        address: `http://${this.advertiseHost}:${this.serverPort}`,
        pid: process.pid,
        uptime: process.uptime(),
        timestamp: Date.now()
      };

      // Store server info with TTL of 30 seconds
      await this.client.hSet(
        this.registryKey,
        this.serverInstanceId,
        JSON.stringify(serverInfo)
      );

      // Set expiration
      await this.client.expire(this.registryKey, 30);

      console.log(`[Redis] Registered as ${this.serverInstanceId} at ${serverInfo.address}`);
      return true;
    } catch (error) {
      console.error("[Redis] Registration failed:", error.message);
      return false;
    }
  }

  startHeartbeat() {
    this.heartbeatTimer = setInterval(async () => {
      await this.register();
    }, this.heartbeatInterval);

    console.log(`[Redis] Heartbeat started (every ${this.heartbeatInterval}ms)`);
  }

  stopHeartbeat() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
      console.log("[Redis] Heartbeat stopped");
    }
  }

  async disconnect() {
    this.stopHeartbeat();
    if (this.client) {
      await this.client.quit();
      console.log("[Redis] Disconnected");
    }
  }

  async getActiveServers() {
    if (!this.client) return [];

    try {
      const servers = await this.client.hGetAll(this.registryKey);
      return Object.entries(servers).map(([id, data]) => ({
        id,
        ...JSON.parse(data)
      }));
    } catch (error) {
      console.error("[Redis] Failed to get active servers:", error.message);
      return [];
    }
  }
}
