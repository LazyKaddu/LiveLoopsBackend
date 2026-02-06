// bucket/dispatcher.js

export class Dispatcher {

  constructor(io, audioForwarder = null) {
    this.io = io;
    this.audioForwarder = audioForwarder;
  }

  dispatch(bundle) {

    const room = bundle.roomId;

    // → musicians
    this.io.to(room).emit("midi-bundle", bundle);

    // → server 2 (optional)
    if (this.audioForwarder) {
      this.audioForwarder.send(bundle);
    }
  }
}
