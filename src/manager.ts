import type { user } from "./user.js";

function normalizeKey(value: string) {
  return JSON.stringify(value).trim().toLowerCase();
}
export class Manager {
  rooms: Map<string, user[]> = new Map();
  static instance: Manager;

  private constructor() {
    this.rooms = new Map();
  }

  static getIntance() {
    if (!this.instance) {
      this.instance = new Manager();
    }
    return this.instance;
  }

  public addUsertoRoom(roomid: string, joiningUser: user) {
    const users = this.rooms.get(roomid) ?? [];
    const incomingKey = normalizeKey(joiningUser.key);

    const keyExists = users.some((u) => normalizeKey(u.key) === incomingKey);
    if (keyExists) {
      return false;
    }

    users.push(joiningUser);
    this.rooms.set(roomid, users);
    
    return true;
  }

  public getRoomUsers(roomid: string) {
    const users = this.rooms.get(roomid) ?? [];
    return users.map((u) => ({ key: u.key }));
  }

  public broadcast(message: any, user: user, roomid: string) {
    if (!this.rooms.has(roomid)) {
      return;
    }
    this.rooms.get(roomid)?.forEach((u) => {
      if (u.key !== user.key) {
        u.send(message);
      }
    });
  }

  public removeFromRoom(roomid: string, user: user) {
    if (!this.rooms.has(roomid)) {
      return;
    }
    const users = this.rooms.get(roomid);
    if (users) {
      const index = users.indexOf(user);
      if (index > -1) {
        users.splice(index, 1);
      }
      if (users.length === 0) {
        this.rooms.delete(roomid);
      }
    }
  }
}
