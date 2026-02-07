import fetch from 'node-fetch'
import { serverLocator } from '../discovery/serverLocator.js'

// simple back-pressure guard
const IN_FLIGHT = new Map()
const MAX_IN_FLIGHT = 8

export function attachStreamsAPI(app, io) {

  // ─────────────────────────────
  // HTTP – audience HLS
  // ─────────────────────────────

  app.get('/streams/:roomId', async (req, res) => {
    try {
      const { serverId } =
        await serverLocator.locate(req.params.roomId)

      // gateway does NOT proxy media,
      // only tells client where playlist lives
      res.json({
        hls: `http://${serverId}/hls/${req.params.roomId}/index.m3u8`,
        serverId
      })
    } catch (err) {
      res.status(503).json({
        error: 'NO_AUDIO_SERVER'
      })
    }
  })

  // ─────────────────────────────
  // Socket – musician MIDI proxy
  // ─────────────────────────────

  io.on('connection', socket => {
    const user = socket.data.user

    socket.on('midi:bundle', async (bundle, cb) => {
      const roomId = bundle.roomId
      if (!roomId) {
        return cb?.({ ok: false, error: 'NO_ROOM' })
      }

      // back-pressure per socket
      const inflight =
        IN_FLIGHT.get(socket.id) || 0

      if (inflight > MAX_IN_FLIGHT) {
        return cb?.({
          ok: false,
          error: 'BACKPRESSURE'
        })
      }

      IN_FLIGHT.set(socket.id, inflight + 1)

      try {
        const { serverId } =
          await serverLocator.locate(roomId)

        // forward to server-sync
        await forwardToSync(serverId, {
          ...bundle,
          userId: user.id
        })

        cb?.({ ok: true })
      } catch (err) {
        cb?.({ ok: false, error: err.message })
      } finally {
        IN_FLIGHT.set(
          socket.id,
          (IN_FLIGHT.get(socket.id) || 1) - 1
        )
      }
    })
  })
}

// ─────────────────────────────
// Transport to server-sync
// (placeholder – replace with real address map)
// ─────────────────────────────

async function forwardToSync(serverId, bundle) {
  // In real deploy this comes from service discovery
  const url = `http://${serverId}/ingest/midi`

  const r = await fetch(url, {
    method: 'POST',
    headers: {
      'content-type': 'application/json'
    },
    body: JSON.stringify(bundle),
    timeout: 2000
  })

  if (!r.ok) {
    throw new Error('SYNC_REJECTED')
  }
}
