// index.js (Express version)

import dotenv from "dotenv";
dotenv.config();

import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";

import { setupSocketServer } from "./ws/connection.js";
import { RoomManager } from "./rooms/roomManager.js";
import { AudioBridge } from "./forwarder/audioBridge.js";


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

// ---------- SERVICES ----------
const audioForwarder =
  new AudioBridge(process.env.AUDIO_SERVER_URL || "http://localhost:4000");

const roomManager =
  new RoomManager(io, audioForwarder);

// attach socket layer
setupSocketServer(io, roomManager);

// ---------- START ----------
const PORT = process.env.PORT || 3001;

httpServer.listen(PORT, () =>
  console.log(`server-sync running on ${PORT}`)
);
