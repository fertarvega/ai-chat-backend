import { Redis } from "@upstash/redis";
import { config } from "dotenv";

config();

const redis_db = new Redis({
  url: process.env.URL_REDIS,
  token: process.env.TOKEN_REDIS,
});

export default redis_db;
