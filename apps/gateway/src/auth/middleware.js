import { jwtService } from './jwt.js'
import crypto from 'crypto'

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

const getBearer = (header = '') => {
  if (!header) return null
  const [type, token] = header.split(' ')
  return type === 'Bearer' ? token : null
}

const createRequestId = () =>
  crypto.randomBytes(8).toString('hex')

// ─────────────────────────────────────────────
// HTTP Middleware
// ─────────────────────────────────────────────

export function httpAuth(required = true) {
  return (req, res, next) => {
    req.id = req.headers['x-request-id'] || createRequestId()

    const token = getBearer(req.headers['authorization'])

    if (!token) {
      if (required) {
        return res.status(401).json({
          error: 'AUTH_REQUIRED',
          requestId: req.id
        })
      }
      return next()
    }

    const result = jwtService.verify(token)

    if (!result.ok) {
      return res.status(401).json({
        error: result.error.code,
        message: result.error.message,
        requestId: req.id
      })
    }

    req.user = result.user
    req.tokenPayload = result.payload

    next()
  }
}

// ─────────────────────────────────────────────
// Socket.IO Middleware
// ─────────────────────────────────────────────

export function socketAuth(io, options = {}) {
  const required = options.required ?? true

  io.use((socket, next) => {
    const reqId =
      socket.handshake.headers['x-request-id'] ||
      createRequestId()

    socket.data.requestId = reqId

    const token =
      socket.handshake.auth?.token ||
      getBearer(socket.handshake.headers['authorization'])

    if (!token) {
      if (required) {
        return next(new Error('AUTH_REQUIRED'))
      }
      return next()
    }

    const result = jwtService.verify(token)

    if (!result.ok) {
      const err = new Error(result.error.code)
      err.data = { message: result.error.message }
      return next(err)
    }

    socket.data.user = result.user
    socket.data.tokenPayload = result.payload

    next()
  })
}

// ─────────────────────────────────────────────
// Guards
// ─────────────────────────────────────────────

export const requireRole = (...roles) =>
  function (req, res, next) {
    if (!req.user) {
      return res.status(401).json({ error: 'AUTH_REQUIRED' })
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'FORBIDDEN' })
    }

    next()
  }

export const socketRequireRole = (...roles) =>
  function (socket, next) {
    const user = socket.data.user

    if (!user) {
      return next(new Error('AUTH_REQUIRED'))
    }

    if (!roles.includes(user.role)) {
      return next(new Error('FORBIDDEN'))
    }

    next()
  }

// ─────────────────────────────────────────────
// Rate-limit hook (placeholder for later)
// ─────────────────────────────────────────────

export const attachIdentity = (req, res, next) => {
  res.setHeader('x-request-id', req.id)

  if (req.user) {
    res.setHeader('x-user-id', req.user.id)
  }

  next()
}
