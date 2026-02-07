import { serverLocator } from '../discovery/serverLocator.js'

// local socket → room map
const socketRooms = new Map()

export function attachRoomsAPI(app, io) {

  // ─────────────────────────────
  // HTTP
  // ─────────────────────────────

  // Create room → choose audio server
  app.post('/rooms', async (req, res) => {
    try {
      const roomId =
        req.body?.roomId ||
        `room_${Date.now().toString(36)}`

      const { serverId } =
        await serverLocator.locate(roomId)

      res.json({
        roomId,
        audioServer: serverId,
        joinToken: roomId   // later replace with signed intent
      })
    } catch (err) {
      res.status(503).json({
        error: err.message
      })
    }
  })

  app.get('/rooms/:id/server', async (req, res) => {
    const { serverId } =
      await serverLocator.locate(req.params.id)

    res.json({ serverId })
  })

  // ─────────────────────────────
  // Socket
  // ─────────────────────────────

  io.on('connection', socket => {
    const user = socket.data.user

    // musician or listener joins room
    socket.on('room:join', async (payload, cb) => {
      try {
        const { roomId, mode = 'listen' } = payload

        const { serverId } =
          await serverLocator.locate(roomId)

        // join local socket room
        socket.join(roomId)
        socketRooms.set(socket.id, roomId)

        // inform client where audio lives
        cb?.({
          ok: true,
          roomId,
          audioServer: serverId,
          mode
        })

        // notify others (gateway only signal)
        socket.to(roomId).emit('room:user_join', {
          userId: user.id,
          mode
        })

      } catch (err) {
        cb?.({ ok: false, error: err.message })
      }
    })

    socket.on('room:leave', async (_, cb) => {
      const roomId = socketRooms.get(socket.id)
      if (!roomId) return cb?.({ ok: true })

      socket.leave(roomId)
      socketRooms.delete(socket.id)

      socket.to(roomId).emit('room:user_leave', {
        userId: user.id
      })

      cb?.({ ok: true })
    })

    socket.on('disconnect', () => {
      const roomId = socketRooms.get(socket.id)
      if (!roomId) return

      socket.to(roomId).emit('room:user_leave', {
        userId: user.id
      })

      socketRooms.delete(socket.id)
    })
  })
}
