// import dotenv from "dotenv"
// dotenv.config()
import type WebSocket from "ws";
import { Manager } from "./manager.js";

import { redis, SUB } from "./redisConnection.js";
  
const joinChannel = process.env.JOINS as string;
const msgChannel = process.env.MSG as string;
const leftChannel  =  process.env.LEFT as string;


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
         
          await redis.publish(joinChannel, JSON.stringify({key: this.key, roomid : this.roomid}))

          await SUB.subscribe(joinChannel, (err, count)=> {
            if(err) return console.error(err);
          })
          SUB.on("message", (joinChannel, message)=> {
            const  parsedData = JSON.parse(message.toString());
            
            if(this.roomid == parsedData.roomid) {
              this.send({
                type: "joined",
                key: parsedData.key,
                roomid: parsedData.roomid,
                users: Manager.getIntance().getRoomUsers(this.roomid),
              });
              Manager.getIntance().addUsertoRoom(this.roomid, parsedData)
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
            }
            
          })
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


          await redis.publish(msgChannel, JSON.stringify({
              type: "msg",
              text: msg.text,
              key: this.key,
              user : this, 
              roomid : this.roomid,
            }
          ))

          await SUB.subscribe(msgChannel, (err, count)=> {
           if(err) return console.error(err);
          })
          SUB.on("message",(msgChannel, message) => {
            const parsedData_msg = JSON.parse(message);
            // console.log(parsedData_msg );
            
          } )
          this.send({
            type: "msg",
            text: msg.text,
            key: this.key,
          });

          Manager.getIntance().broadcast(
            {
              type: "msg",
              text: msg.text,
              key: this.key,
            },
            this,
            this.roomid,
          );

          break;
        }

        case "left":
          this.leaveRoom();
          // redis.publish(process.env.LEFT as string, JSON.stringify({
          //   type: "User-LEFT-redis",
          //   key: this.key,
          //   roomid: this.roomid,
          // }))
          break;
      }
    });
  }

  public send(message: any) {
    this.ws.send(JSON.stringify(message));
  }

  public async destroy() {
    this.leaveRoom();
    await redis.srem('room', JSON.stringify({key: this.key, roomid: this.roomid}));
  }
}