import jwt from 'jsonwebtoken'

const JWT_ALG = 'HS256'

export class JWTService {
  constructor(config = {}) {
    this.secret = config.secret || process.env.JWT_SECRET
    this.issuer = config.issuer || 'liveloops'
    this.audience = config.audience || 'gateway'

    if (!this.secret) {
      throw new Error('JWT_SECRET not configured')
    }
  }

  verify(token) {
    try {
      const payload = jwt.verify(token, this.secret, {
        algorithms: [JWT_ALG],
        issuer: this.issuer,
        audience: this.audience
      })

      return {
        ok: true,
        user: {
          id: payload.sub,
          role: payload.role || 'user',
          name: payload.name || null,
          features: payload.features || []
        },
        payload
      }
    } catch (err) {
      return {
        ok: false,
        error: this._normalizeError(err)
      }
    }
  }

  sign(user, opts = {}) {
    const payload = {
      sub: user.id,
      role: user.role || 'user',
      name: user.name,
      features: user.features || []
    }

    return jwt.sign(payload, this.secret, {
      algorithm: JWT_ALG,
      issuer: this.issuer,
      audience: this.audience,
      expiresIn: opts.expiresIn || '7d'
    })
  }

  decodeUnsafe(token) {
    try {
      return jwt.decode(token)
    } catch {
      return null
    }
  }

  _normalizeError(err) {
    if (err.name === 'TokenExpiredError') {
      return { code: 'TOKEN_EXPIRED', message: 'Token expired' }
    }

    if (err.name === 'JsonWebTokenError') {
      return { code: 'TOKEN_INVALID', message: 'Invalid token' }
    }

    return { code: 'TOKEN_ERROR', message: err.message }
  }
}

// Lazy singleton - instantiate only when first accessed
let _instance = null

export function getJWTService() {
  if (!_instance) {
    _instance = new JWTService()
  }
  return _instance
}

// For backward compatibility, export as property
export const jwtService = new Proxy({}, {
  get: (target, prop) => {
    return getJWTService()[prop]
  }
})
