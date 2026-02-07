// inputs/validator.js

export class MidiValidator {

  static NOTE_MIN = 0;
  static NOTE_MAX = 127;

  static VELOCITY_MIN = 0;
  static VELOCITY_MAX = 127;

  static TYPES = new Set(["noteOn", "noteOff"]);

  static validateEvent(e) {

    if (!e) return false;

    // basic shape
    if (typeof e.note !== "number") return false;
    if (typeof e.velocity !== "number") return false;
    if (typeof e.type !== "string") return false;

    // ranges
    if (e.note < this.NOTE_MIN ||
        e.note > this.NOTE_MAX)
      return false;

    if (e.velocity < this.VELOCITY_MIN ||
        e.velocity > this.VELOCITY_MAX)
      return false;

    if (!this.TYPES.has(e.type))
      return false;

    // timestamp optional but must be sane
    if (e.timestamp &&
        typeof e.timestamp !== "number")
      return false;

    return true;
  }

  static sanitizeEvent(e) {

    return {
      note: Math.round(e.note),
      velocity: Math.round(e.velocity),
      type: e.type,
      timestamp: e.timestamp || Date.now(),
      userId: e.userId || "anon"
    };
  }

  static validateBundle(bundle) {

    if (!bundle) return false;

    if (typeof bundle.roomId !== "string")
      return false;

    if (!Array.isArray(bundle.events))
      return false;

    if (bundle.events.length > 200)
      return false;        // anti-spam

    return true;
  }
}
