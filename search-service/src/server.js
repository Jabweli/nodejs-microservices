import mongoose from "mongoose";
import express from "express";
import helmet from "helmet";
import cors from "cors";
import dotenv from "dotenv";
import Redis from "ioredis";
import { router as searchRoutes } from "./routes/search-routes.js";
import { logger } from "./utils/logger.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { connectToRabbitMq, consumeEvent } from "./utils/rabbitmq.js";
import {
  handlePostCreated,
  handlePostDeleted,
} from "./utils/event-handlers.js";
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3004;

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

// search server
app.use(
  "/api/search",
  (req, res, next) => {
    req.redisClient = redisClient;
    next();
  },
  searchRoutes
);

// error handler
app.use(errorHandler);

const startServer = async () => {
  try {
    await connectToRabbitMq();

    // consume all the published events
    await consumeEvent("post:created", handlePostCreated);
    await consumeEvent("post:deleted", handlePostDeleted);

    app.listen(PORT, () => {
      logger.info(`Search service running on port ${PORT}`);
    });
  } catch (error) {
    logger.error(`Failed to connect to server`, error);
    process.exit(1);
  }
};

startServer();

// unhandled promise rejection
process.on("unhandledRejection", (reason, promise) => {
  logger.error("Unhandled rejection at:", promise, "reason:", reason);
});
