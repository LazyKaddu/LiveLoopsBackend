// bucket/merger.js

export class Merger {

  merge(roomId, events) {

    // sort by time for fairness
    events.sort((a, b) => a.time - b.time);

    return {
      roomId,
      serverTime: Date.now(),

      events: events.map(e => ({
        note: e.note,
        velocity: e.velocity ?? 100,
        userId: e.userId,
        t: e.time
      }))
    };
  }
}
