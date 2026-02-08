// index.js (Express version)

import dotenv from "dotenv";
dotenv.config();

import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";

import { setupSocketServer } from "./ws/connection.js";
import { RoomManager } from "./rooms/roomManager.js";
import { AudioBridge } from "./forwarder/audioBridge.js";
import { initializeRedis } from "./config/redis.js";
import { redisMap } from "./config/redisMap.js";


// ---------- EXPRESS ----------
const app = express();

// optional middlewares
app.use(express.json());

app.get("/", (req, res) => {
  res.send("server-sync alive");
});

// ---------- HTTP + SOCKET.IO ----------
const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: process.env.CORS_ORIGIN || "*",
    methods: ["GET", "POST"]
  }
});

// ---------- INITIALIZATION ----------
async function startServer() {
  try {
    // Initialize Redis
    const redisClient = await initializeRedis();

    // Initialize audio forwarder with Redis for dynamic discovery
    const audioForwarder = new AudioBridge(redisClient);

    const roomManager = new RoomManager(io, audioForwarder);

    // attach socket layer
    setupSocketServer(io, roomManager);

    // ---------- REGISTER WITH GATEWAY ----------
    const PORT = process.env.PORT || 3001;
    const HOST = process.env.HOST || '0.0.0.0';
    const ADVERTISE_HOST = process.env.ADVERTISE_HOST || 'localhost';
    const serverId = process.env.SERVER_ID || `server-sync-${Date.now()}`;

    await redisMap.registerServer(serverId, {
      host: ADVERTISE_HOST,
      port: PORT,
      load: 0,
      rooms: 0,
      type: 'sync'
    });

    console.log(`[Server] Registered with id: ${serverId}`);

    // Start heartbeat to keep server alive in Redis
    let heartbeatInterval = setInterval(async () => {
      try {
        await redisMap.heartbeat(serverId);
      } catch (err) {
        console.error('[Server] Heartbeat error:', err);
      }
    }, 5000); // heartbeat every 5 seconds

    // ---------- START ----------
    httpServer.listen(PORT, HOST, () =>
      console.log(`server-sync running on ${HOST}:${PORT}`)
    );

    // ---------- GRACEFUL SHUTDOWN ----------
    process.on('SIGTERM', async () => {
      console.log('[Server] SIGTERM received, shutting down gracefully...');
      clearInterval(heartbeatInterval);
      
      try {
        await redisMap.redis.del(`gw:server:${serverId}:hb`);
        await redisMap.redis.srem(`gw:servers:audio`, serverId);
        await redisMap.redis.del(`gw:server:${serverId}:meta`);
      } catch (err) {
        console.error('[Server] Error cleaning up Redis:', err);
      }

      process.exit(0);
    });

  } catch (error) {
    console.error("[Server] Startup error:", error);
    process.exit(1);
  }
}

startServer();
