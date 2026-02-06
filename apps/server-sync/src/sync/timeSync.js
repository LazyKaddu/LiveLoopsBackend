// sync/timeSync.js

export class TimeSync {

  constructor() {
    // socketId → offset info
    this.offsets = new Map();
  }

  // called when client responds to ping-check
  registerSample(socketId, clientTime, serverTime, rtt) {

    const estimatedOffset =
      serverTime - (clientTime + rtt / 2);

    const prev = this.offsets.get(socketId);

    // exponential smoothing
    const smooth =
      prev
        ? prev * 0.8 + estimatedOffset * 0.2
        : estimatedOffset;

    this.offsets.set(socketId, smooth);

    return smooth;
  }

  // convert client timestamp → server time
  toServerTime(socketId, clientTime) {
    const off = this.offsets.get(socketId) || 0;
    return clientTime + off;
  }

  remove(socketId) {
    this.offsets.delete(socketId);
  }
}
