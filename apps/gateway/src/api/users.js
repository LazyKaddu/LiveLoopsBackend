// In-memory presence (gateway local, not global truth)
const socketsByUser = new Map()

export function attachUserAPI(app, io) {

  // ─────────────────────────────
  // HTTP
  // ─────────────────────────────

  app.get('/users/me', (req, res) => {
    res.json({
      id: req.user.id,
      role: req.user.role,
      name: req.user.name
    })
  })

  app.get('/users/online', (req, res) => {
    res.json({
      count: socketsByUser.size,
      users: [...socketsByUser.keys()]
    })
  })

  // ─────────────────────────────
  // Socket Presence
  // ─────────────────────────────

  io.on('connection', socket => {
    const user = socket.data.user
    if (!user) return

    const set = socketsByUser.get(user.id) || new Set()
    set.add(socket.id)
    socketsByUser.set(user.id, set)

    socket.on('disconnect', () => {
      const s = socketsByUser.get(user.id)
      if (!s) return

      s.delete(socket.id)
      if (!s.size) {
        socketsByUser.delete(user.id)
      }
    })
  })
}

// helpers for other modules
export const isUserOnline = id =>
  socketsByUser.has(id)

export const getUserSockets = id =>
  [...(socketsByUser.get(id) || [])]
