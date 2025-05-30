import mongoose from "mongoose";
import express from "express";
import helmet from "helmet";
import cors from "cors";
import dotenv from "dotenv";
import Redis from "ioredis";
import { logger } from "./utils/logger.js";
import { router as postRoutes } from "./routes/post-routes.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { connectToRabbitMq } from "./utils/rabbitmq.js";
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3002;

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

// routes
app.use(
  "/api/posts",
  (req, res, next) => {
    req.redisClient = redisClient;
    next();
  },
  postRoutes
);

app.use(errorHandler);

// start server

const startServer = async () => {
  try {
    await connectToRabbitMq();
    app.listen(PORT, () => {
      logger.info(`Post service running on port ${PORT}`);
    });
  } catch (error) {
    logger.error(`Failed to connect to server`, error);
    process.exit(1)
  }
};

startServer();


// unhandled promise rejection
process.on("unhandledRejection", (reason, promise) => {
  logger.error("Unhandled rejection at", promise, "reason", reason);
});
