// index.js  (server-audio)

import express from "express";
import http from "http";
import { Server } from "socket.io";
import path from "path";
import { fileURLToPath } from "url";

import { InstanceManager } from "./core/instanceManager.js";
import { MidiReceiver } from "./inputs/midiReceiver.js";
import { FrameClock } from "./renderer/frameClock.js";
import { initializeRedis, RedisRegistry } from "./core/redisRegistry.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ----------------------------------------------------

const PORT = process.env.PORT || 4000;

const app = express();
app.use(express.json());

const httpServer = http.createServer(app);

const io = new Server(httpServer, {
  cors: { origin: "*" }
});

// ---- CORE SERVICES ----

// Initialize the global audio clock (all rooms sync to this)
const clock = new FrameClock({
  sampleRate: 48000,
  blockSize: 256
});

const instances = new InstanceManager({ clock });

const midi = new MidiReceiver(instances);

// ----------------------------------------------------
//  WEBSOCKET INPUT (from server-sync)
// ----------------------------------------------------

io.on("connection", socket => {

  console.log("[AUDIO] connected:", socket.id);

  socket.on("midi-bundle", bundle => {
    midi.receiveBundle(bundle);
  });

  socket.on("disconnect", () => {
    console.log("[AUDIO] disconnect:", socket.id);
  });
});

// ----------------------------------------------------
//  HTTP MONITORING API
// ----------------------------------------------------

// health
app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    rooms: Object.keys(instances.stats()).length
  });
});

// room stats
app.get("/rooms", (req, res) => {
  res.json(instances.stats());
});

// single room
app.get("/rooms/:id", (req, res) => {

  const room = instances.stats()[req.params.id];

  if (!room)
    return res.status(404).json({ error: "not found" });

  res.json(room);
});

// force create (debug)
app.post("/rooms/:id", (req, res) => {

  const engine = instances.get(req.params.id);

  res.json({
    status: "created",
    room: req.params.id,
    engine: !!engine
  });
});

// ---- HLS STREAM SERVING ----

// Serve HLS playlists and segments
app.use("/streams", express.static(path.join(process.cwd(), "streams")));

// HLS stream URL endpoint
app.get("/streams/:roomId/playlist.m3u8", (req, res) => {
  const room = instances.get(req.params.roomId);
  
  if (!room) {
    return res.status(404).json({ error: "room not found" });
  }
  
  // Read and serve the actual playlist file
  const filePath = path.join(process.cwd(), "streams", req.params.roomId, "playlist.m3u8");
  res.sendFile(filePath);
});

// ---- START SERVER ----

let redis = null;
let redisClient = null;

httpServer.listen(PORT, async () => {
  console.log(`[AUDIO] running on ${PORT}`);
  
  // Start the global clock
  clock.start();
  console.log("[AUDIO] FrameClock started");

  // Initialize Redis
  try {
    redisClient = await initializeRedis();
    redis = new RedisRegistry(redisClient, { serverPort: PORT });
    await redis.register();
    redis.startHeartbeat();
  } catch (error) {
    console.error("[AUDIO] Redis initialization failed:", error.message);
  }
});

// Graceful shutdown
process.on("SIGTERM", async () => {
  console.log("[AUDIO] SIGTERM received, shutting down...");
  if (redis) await redis.disconnect();
  process.exit(0);
});

process.on("SIGINT", async () => {
  console.log("[AUDIO] SIGINT received, shutting down...");
  if (redis) await redis.disconnect();
  process.exit(0);
});
