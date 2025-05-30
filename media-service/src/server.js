import mongoose from "mongoose";
import express from "express";
import helmet from "helmet";
import cors from "cors";
import dotenv from "dotenv";
import Redis from "ioredis";
import rateLimit from "express-rate-limit";
import { logger } from "./utils/logger.js";
import { router as mediaRoutes } from "./routes/media-routes.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { connectToRabbitMq, consumeEvent } from "./utils/rabbitmq.js";
import { handlePostDeleted } from "./utils/event-handlers.js";
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3003;

mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => logger.info("Connected to mongodb"))
  .catch(() => logger.error("Mongodb connection failed"));

const redisClient = new Redis(process.env.REDIS_URL);

// middleware
app.use(cors());
app.use(helmet());
app.use(express.json());

app.use((req, res, next) => {
  logger.info(`Received ${req.method} request from ${req.url}`);
  logger.info(`Received body ${req.body}`);
  next();
});

// ip based rate limiting for sensitive endpoints
const rateLimitOptions = rateLimit({
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
});

// apply sensitiveEndpointsLimiter to our routes
app.use(rateLimitOptions);

// routes
app.use("/api/media", mediaRoutes);

app.use(errorHandler);

// start server
const startServer = async () => {
  try {
    await connectToRabbitMq();

    // consume all the published events
    await consumeEvent('post:deleted', handlePostDeleted)

    app.listen(PORT, () => {
      logger.info(`Media service running on port ${PORT}`);
    });
  } catch (error) {
    logger.error(`Failed to connect to server`, error);
    process.exit(1);
  }
};

startServer();

// unhandled promise rejection
process.on("unhandledRejection", (reason, promise) => {
  logger.error("Unhandled rejection at", promise, "reason", reason);
});
