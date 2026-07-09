import  dotenv from "dotenv"
dotenv.config({
    path :"./.env", 
})

import { WebSocketServer } from "ws";
import { user } from "./user.js";
import { connectRedis } from "./redisConnection.js";

const wss = new WebSocketServer({port : Number(process.env.PORT)});

connectRedis()
console.log(wss.options.port);


wss.on("connection", (ws) => {
    ws.on('error', console.error);
    const privateUser: any = new user(ws);
    privateUser.send("welcome to the server",  wss.options.port);
    console.log(wss.options.port);
    ws.on('close', () => {
        privateUser.destroy();
    });
})