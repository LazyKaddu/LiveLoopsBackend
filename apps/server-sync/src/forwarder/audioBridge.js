// forwarder/audioBridge.js

import { io } from "socket.io-client";
import { Retry } from "./retry.js";

export class AudioBridge {

  constructor(redisClient) {

    this.redisClient = redisClient;
    this.url = null;
    this.socket = null;

    this.retry = new Retry();

    // if server-audio is down we queue bundles
    this.queue = [];

    this.connected = false;

    this.initialize();
  }

  async initialize() {
    try {
      // Discover available server-audio instances from Redis
      this.url = await this.discoverAudioServer();
      if (this.url) {
        console.log(`[AudioBridge] Initialization successful, connecting to ${this.url}`);
        this.connect();
      } else {
        console.error("[AudioBridge] No available audio server found in Redis");
        this.scheduleRediscovery();
      }
    } catch (error) {
      console.error("[AudioBridge] Initialization error:", error);
      this.scheduleRediscovery();
    }
  }

  async discoverAudioServer() {
    try {
      // Query Redis hash for available server-audio instances
      // server-audio stores in hash "audio-servers" with field "{hostname}:{port}"
      const servers = await this.redisClient.hGetAll("audio-servers");

      if (!servers || Object.keys(servers).length === 0) {
        console.warn("[AudioBridge] No server-audio instances found in Redis");
        return null;
      }

      // Get all available servers and build connection URLs
      const availableServers = [];
      for (const [id, serverData] of Object.entries(servers)) {
        try {
          const server = JSON.parse(serverData);
          // Build URL from address field (e.g., "http://hostname:4000")
          if (server.address) {
            availableServers.push({
              id,
              url: server.address.startsWith("http") 
                ? server.address 
                : `http://${server.address}`,
              server
            });
          }
        } catch (e) {
          console.warn(`[AudioBridge] Failed to parse server ${id}:`, e.message);
        }
      }

      if (availableServers.length === 0) {
        console.warn("[AudioBridge] No healthy server-audio instances found");
        return null;
      }

      // Pick a random available server
      const selected = availableServers[Math.floor(Math.random() * availableServers.length)];
      console.log(`[AudioBridge] Discovered ${availableServers.length} audio server(s), selected: ${selected.id} at ${selected.url}`);
      return selected.url;
    } catch (error) {
      console.error("[AudioBridge] Discovery error:", error);
      return null;
    }
  }

  scheduleRediscovery() {
    // Retry discovery after delay
    setTimeout(() => this.initialize(), 5000);
  }

  // ---------- CONNECTION ----------

  connect() {

    this.socket = io(this.url, {
      autoConnect: false,
      reconnection: false        // we control it
    });

    this.socket.on("connect", () => {
      console.log("[AudioBridge] connected");
      this.connected = true;
      this.retry.reset();
      this.flushQueue();
    });

    this.socket.on("disconnect", () => {
      console.log("[AudioBridge] disconnected");
      this.connected = false;
      this.reconnectLoop();
    });

    this.socket.on("connect_error", () => {
      this.connected = false;
      this.reconnectLoop();
    });

    this.socket.connect();
  }

  async reconnectLoop() {

    if (this.connected) return;

    await this.retry.wait();

    if (!this.connected) {
      console.log("[AudioBridge] retry connect...");
      // Try current server, if fails, rediscover
      if (this.socket.connected) {
        this.socket.connect();
      } else {
        console.log("[AudioBridge] Attempting rediscovery due to connection failure");
        await this.initialize();
      }
    }
  }

  // ---------- SEND PATH ----------

  send(bundle) {

    if (this.connected) {
      this.socket.emit("midi-bundle", bundle);
      return;
    }

    // offline → queue
    this.queue.push(bundle);

    // protect memory
    const maxQueue = parseInt(process.env.MAX_QUEUE_SIZE) || 2000;
    if (this.queue.length > maxQueue) {
      this.queue.shift();   // drop oldest
    }
  }

  flushQueue() {

    if (!this.connected) return;

    for (const b of this.queue) {
      this.socket.emit("midi-bundle", b);
    }

    this.queue = [];
  }

  // ---------- OPTIONAL ----------

  isHealthy() {
    return this.connected;
  }

  queueSize() {
    return this.queue.length;
  }
}
