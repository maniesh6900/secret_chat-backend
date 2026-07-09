import {Redis} from "ioredis";

let redis: Redis
let SUB: Redis;
export const connectRedis = () => {
    redis = new Redis(process.env.REDIS as string)
    if(!redis) console.error("Redis is not connnected");
    console.log("redis connected ");
    SUB = redis.duplicate();
}


export {redis, SUB}