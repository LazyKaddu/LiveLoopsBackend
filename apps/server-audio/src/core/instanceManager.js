// core/instanceManager.js

import { RoomEngine } from "../engine/roomEngine.js";
import { LifeCycle, RoomState } from "./lifecycle.js";
import { CrashGuard } from "./crashGuard.js";

export class InstanceManager {

  constructor(options = {}) {

    this.rooms = new Map();

    this.options = options;
    
    // ---- SHARED CLOCK ----
    this.clock = options.clock || null;

    // periodic janitor
    setInterval(
      () => this.cleanup(),
      30_000
    );
  }

  get(roomId) {

    if (!this.rooms.has(roomId))
      this.create(roomId);

    const r = this.rooms.get(roomId);

    r.life.touch();

    return r.engine;
  }

  create(roomId) {

    const life =
      new LifeCycle(roomId);

    const guard =
      new CrashGuard(roomId);

    const engine =
      new RoomEngine(roomId, this.clock);

    // ---- START FFMPEG PIPELINE ----
    engine.ffmpeg.start();

    // ---- WATCH ENGINE ----
    engine.ffmpeg.process?.on(
      "exit",
      code =>
        this.handleCrash(
          roomId,
          new Error(`ffmpeg exit ${code}`)
        )
    );

    life.setState(RoomState.RUNNING);

    this.rooms.set(roomId, {
      engine,
      life,
      guard
    });
  }

  handleCrash(roomId, err) {

    const inst =
      this.rooms.get(roomId);

    if (!inst) return;

    inst.guard.registerCrash(err);

    inst.life.setState(RoomState.DEAD);

    inst.engine.stop();

    if (inst.guard.canRestart()) {

      const wait =
        inst.guard.backoffMs();

      setTimeout(
        () => this.create(roomId),
        wait
      );

    } else {

      console.error(
        `[ROOM ${roomId}] too many crashes`
      );

      this.rooms.delete(roomId);
    }
  }

  cleanup() {

    for (const [id, inst] of this.rooms) {

      if (inst.life.isIdle()) {

        inst.life.setState(
          RoomState.STOPPING
        );

        inst.engine.stop();

        this.rooms.delete(id);

        console.log(
          `[ROOM ${id}] idle removed`
        );
      }
    }
  }

  stats() {

    const out = {};

    for (const [id, inst] of this.rooms) {

      out[id] = {
        state: inst.life.state,
        age: inst.life.age(),
        meter: inst.engine.stats()
      };
    }

    return out;
  }
}
