import type WebSocket from "ws";
import { Manager } from "./manager.js";

export class user {
  private ws: WebSocket;
  public roomid: string = "";
  public key: string = "";

  constructor(ws: WebSocket) {
    this.ws = ws;
    this.initHandler();
  }

  private leaveRoom() {
    if (!this.roomid || !this.key) {
      return;
    }

    const previousRoom = this.roomid;
    const previousKey = this.key;

    Manager.getIntance().removeFromRoom(previousRoom, this);
    Manager.getIntance().broadcast(
      {
        type: "left",
        key: previousKey,
        text: `${previousKey} left the room.`,
        users: Manager.getIntance().getRoomUsers(previousRoom),
      },
      this,
      previousRoom,
    );

    this.roomid = "";
    this.key = "";
  }

  initHandler() {
    this.ws.on("message", async (data) => {
      const msg = JSON.parse(data.toString());

      switch (msg.type) {
        case "join": {
          const nextKey = typeof msg.key === "string" ? msg.key.trim().toLowerCase() : "";
          const nextRoom = typeof msg.roomid === "string" ? msg.roomid.trim() : "";

          if (!nextKey || !nextRoom) {
            this.send({
              type: "join_error",
              message: "Both key and roomid are required.",
            });
            break;
          }

          if (this.roomid && this.key) {
            this.leaveRoom();
          }

          this.key = nextKey;
          this.roomid = nextRoom;

          const added = Manager.getIntance().addUsertoRoom(this.roomid, this);
          if (!added) {
            this.send({
              type: "key_taken",
              key: this.key,
              roomid: this.roomid,
              message: `Key '${this.key}' is already in use in this room.`,
            });
            this.roomid = "";
            this.key = "";
            break;
          }

          Manager.getIntance().broadcast(
            {
              type: "joined_user",
              key: this.key,
              text: `${this.key} joined the room.`,
              users: Manager.getIntance().getRoomUsers(this.roomid),
            },
            this,
            this.roomid,
          );

          this.send({
            type: "joined",
            key: this.key,
            roomid: this.roomid,
            users: Manager.getIntance().getRoomUsers(this.roomid),
          });
          break;
        }

        case "msg": {
          if (!this.roomid || !this.key) {
            this.send({
              type: "join_error",
              message: "Join a room before sending messages.",
            });
            break;
          }

          Manager.getIntance().broadcast(
            {
              type: "msg",
              text: msg.text,
              key: this.key,
            },
            this,
            this.roomid,
          );

          this.send({
            type: "msg",
            text: msg.text,
            key: this.key,
          });
          break;
        }

        case "left":
          this.leaveRoom();
          break;
      }
    });
  }

  public send(message: any) {
    this.ws.send(JSON.stringify(message));
  }

  public destroy() {
    this.leaveRoom();
  }
}
