// forwarder/audioBridge.js

import { io } from "socket.io-client";
import { Retry } from "./retry.js";

export class AudioBridge {

  constructor(url) {

    this.url = url;
    this.socket = null;

    this.retry = new Retry();

    // if server-audio is down we queue bundles
    this.queue = [];

    this.connected = false;

    this.connect();
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
      this.socket.connect();
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
    if (this.queue.length > 2000) {
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
