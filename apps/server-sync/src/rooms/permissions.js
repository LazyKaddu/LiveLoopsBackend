// rooms/permissions.js

export class Permissions {

  canSendMidi(room, userId) {
    const user = room.users.get(userId);
    if (!user) return false;

    // later you can add:
    // - listener role
    // - muted
    // - banned

    return user.role === "player";
  }

  canJoin(room, user) {
    // later: private rooms, invites
    return true;
  }

  canChangeSettings(room, userId) {
    const user = room.users.get(userId);
    return user?.role === "host";
  }
}
