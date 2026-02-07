// inputs/midiReceiver.js

import { MidiValidator } from "./validator.js";

export class MidiReceiver {

  constructor(roomRegistry, logger = console) {

    // roomRegistry must return RoomEngine instances
    this.rooms = roomRegistry;
    this.log = logger;
  }

  // called from websocket/api layer
  receiveBundle(bundle) {

    // ---- STRUCTURE CHECK ----
    if (!MidiValidator.validateBundle(bundle)) {
      this.log.warn("Invalid bundle");
      return;
    }

    const room =
      this.rooms.get(bundle.roomId);

    if (!room) {
      this.log.warn(
        "Room not found",
        bundle.roomId
      );
      return;
    }

    // ---- PER EVENT ----
    for (const raw of bundle.events) {

      if (!MidiValidator.validateEvent(raw))
        continue;

      const event =
        MidiValidator.sanitizeEvent(raw);

      try {

        // ---- MAIN FIX ----
        room.pushMidi(event);

      } catch (err) {

        this.log.error(
          "Midi push failed",
          err
        );
      }
    }
  }
}
