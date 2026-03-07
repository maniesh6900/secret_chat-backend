import {WebSocketServer} from "ws";
import { user } from "./user.js";

const wss  = new WebSocketServer({port : 3001});

let key;
let roomid;




wss.on("connection", (ws)=> {
    ws.on('error', console.error);
    const privateUser: any = new user(ws);
    privateUser.send("welcome to the server");
     ws.on('close', () => {
        privateUser.destroy();
    });
})