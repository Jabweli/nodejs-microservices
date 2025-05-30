import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import helmet from "helmet";
import dotenv from "dotenv";
import Redis from "ioredis";
import { RateLimiterRedis } from "rate-limiter-flexible";
import rateLimit from "express-rate-limit";
import { RedisStore } from "rate-limit-redis";
import { logger } from "./utils/logger.js";
import { router } from "./routes/auth-routes.js";
import { errorHandler } from "./middleware/errorHandler.js";

dotenv.config();

const app = express();

// connect to db
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => logger.info("Connected to mongodb"))
  .catch((e) => logger.error("Mongodb connection error", e));


const redisClient = new Redis(process.env.REDIS_URL);

redisClient.on("error", (err) => {
  logger.error(`Redis client error occured: ${err.message}`);
})

// express app middlewares
app.use(cors());
app.use(helmet());
app.use(express.json());

app.use((req, res, next) => {
  logger.info(`Received ${req.method} request from ${req.url}`);
  logger.info(`Received body ${req.body}`);
  next();
});

// DDos protection and rate limiting
const rateLimiter = new RateLimiterRedis({
  storeClient: redisClient,
  keyPrefix: "middleware",
  points: 10, // requests,
  duration: 1, // 10 requests in 1 second
});

app.use((req, res, next) => {
  rateLimiter
    .consume(req.ip)
    .then(() => next())
    .catch(() => {
      logger.error(`Rate limit exceeded for ip ${req.ip}`);
      res.status(429).json({
        success: false,
        message: "Too many requests",
      });
    });
});

// ip based rate limiting for sensitive endpoints
const sensitiveEndpointsLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // limit for 15 minutes,
  limit: 50,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.error(`Sensitive rate limit exceeded for ip ${req.ip}`);
    res.status(429).json({
      success: false,
      message: "Too many requests",
    });
  },
  store: new RedisStore({
    sendCommand: (...args) => redisClient.call(...args),
  }),
});

// apply sensitiveEndpointsLimiter to our routes
app.use("/api/auth/register", sensitiveEndpointsLimiter);

// Routes
app.use("/api/auth", router);

// error handler
app.use(errorHandler);

// start server
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  logger.info(`Auth Service running on port ${PORT}`);
});

// unhandled promise rejection
process.on("unhandledRejection", (reason, promise) => {
  logger.error("Unhandled rejection at", promise, "reason", reason);
});
