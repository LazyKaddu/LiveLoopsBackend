// ws/auth.js
export function authenticate(socket, next) {
  try {
    const token = socket.handshake.auth?.token;

    // For now – fake auth (replace with JWT later)
    if (!token) {
      return next(new Error("AUTH_REQUIRED"));
    }

    // Demo user object
    socket.user = {
      id: token,                 // later decode JWT
      name: "User-" + token.slice(0,4),
      connectedAt: Date.now()
    };

    next();
  } catch (err) {
    next(new Error("AUTH_FAILED"));
  }
}
