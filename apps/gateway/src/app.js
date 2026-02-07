import express from 'express'
import { createServer } from 'http'
import { Server } from 'socket.io'
import bodyParser from 'body-parser'
import morgan from 'morgan'

import { httpAuth, socketAuth, attachIdentity } from './auth/middleware.js'

import { attachUserAPI } from './api/users.js'
import { attachRoomsAPI } from './api/rooms.js'
import { attachStreamsAPI } from './api/streams.js'

import { redisMap } from './discovery/redisMap.js'

// ─────────────────────────────────────────────
// Config
// ─────────────────────────────────────────────

const PORT = process.env.PORT || 3000
const HOST = process.env.HOST || '0.0.0.0'

const SHUTDOWN_TIMEOUT = 5000

// ─────────────────────────────────────────────
// App + HTTP
// ─────────────────────────────────────────────

const app = express()
const http = createServer(app)

// basic middleware
app.use(bodyParser.json({ limit: '1mb' }))
app.use(morgan('dev'))

// auth for HTTP
app.use(httpAuth(true))
app.use(attachIdentity)

// ─────────────────────────────────────────────
// Socket.IO
// ─────────────────────────────────────────────

const io = new Server(http, {
  cors: { origin: '*' },

  pingInterval: 8000,
  pingTimeout: 16000,

  maxHttpBufferSize: 1e6,
  transports: ['websocket']
})

// auth for sockets
socketAuth(io)

// ─────────────────────────────────────────────
// APIs
// ─────────────────────────────────────────────

attachUserAPI(app, io)
attachRoomsAPI(app, io)
attachStreamsAPI(app, io)

// ─────────────────────────────────────────────
// Health & Meta
// ─────────────────────────────────────────────

app.get('/health', async (req, res) => {
  try {
    // check redis connectivity
    await redisMap.redis.ping()

    res.json({
      ok: true,
      time: Date.now()
    })
  } catch (err) {
    res.status(500).json({
      ok: false,
      error: 'REDIS_DOWN'
    })
  }
})

app.get('/metrics', async (req, res) => {
  const state = await redisMap.listServers()

  res.json({
    servers: state.length,
    time: Date.now()
  })
})

// ─────────────────────────────────────────────
// Error Handling
// ─────────────────────────────────────────────

app.use((err, req, res, next) => {
  console.error('http_error', {
    id: req.id,
    message: err.message
  })

  res.status(500).json({
    error: 'INTERNAL_ERROR',
    requestId: req.id
  })
})

// socket error boundary
io.engine.on('connection_error', err => {
  console.error('socket_error', err.message)
})

// ─────────────────────────────────────────────
// Startup
// ─────────────────────────────────────────────

async function start() {
  await redisMap.redis.ping()

  http.listen(PORT, HOST, () => {
    console.log(`gateway listening ${HOST}:${PORT}`)
  })
}

// ─────────────────────────────────────────────
// Graceful Shutdown
// ─────────────────────────────────────────────

async function shutdown() {
  console.log('shutting down gateway')

  const force = setTimeout(() => {
    console.error('forced shutdown')
    process.exit(1)
  }, SHUTDOWN_TIMEOUT)

  http.close(() => {
    clearTimeout(force)
    process.exit(0)
  })

  // stop accepting sockets
  io.close()
}

process.on('SIGTERM', shutdown)
process.on('SIGINT', shutdown)

// ─────────────────────────────────────────────

start().catch(err => {
  console.error('failed to start', err)
  process.exit(1)
})
