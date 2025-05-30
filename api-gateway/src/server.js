import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import helmet from "helmet";
import Redis from "ioredis";
import { rateLimit } from "express-rate-limit";
import { RedisStore } from "rate-limit-redis";
import { logger } from "./utils/logger.js";
import proxy from "express-http-proxy"
import { errorHandler } from "./middleware/errorHandler.js";
import { validateToken } from "./middleware/auth-middleware.js";

dotenv.config();

// express app
const app = express();
const PORT = process.env.PORT || 3000;

const redisClient = new Redis(process.env.REDIS_URL);

app.use(cors());
app.use(helmet());
app.use(express.json());

// rate limiting
const ratelimitOptions = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 100,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.error(`API Gateway rate limit exceeded for ip ${req.ip}`);
    res.status(429).json({
      success: false,
      message: "API Gatway - Too many requests",
    });
  },
  store: new RedisStore({
    sendCommand: (...args) => redisClient.call(...args),
  }),
});

app.use(ratelimitOptions)

// logger
app.use((req, res, next) => {
  logger.info(`Received ${req.method} request from ${req.url}`);
  logger.info(`Received body ${req.body}`);
  next();
});


// proxy path resolver
const proxyOptions = {
  proxyReqPathResolver: (req) => {
    return req.originalUrl.replace(/^\/v1/, "/api") // replace /v1 in "v1/auth" -> "api/auth"
  },
  proxyErrorHandler: (err, req, res, next) => {
    logger.error(`Proxy error: ${err.message}`)
    res.status(500).json({
      message: "Internal server error",
      error: err.message
    })
  }
}

// proxy redirect for the auth service
app.use("/v1/auth", proxy(process.env.AUTH_SERVICE_URL, {
  ...proxyOptions,
  proxyReqOptDecorator: (proxyReqOpts, srcReq) => {
    proxyReqOpts.headers['Content-Type'] = "application/json"
    return proxyReqOpts;
  },
  userResDecorator: (proxyRes, proxyResData, userReq, userRes) => {
    logger.info(`Response received from auth service: ${proxyRes.statusCode}`)
    return proxyResData;
  }
}))

// proxy settings for post service
app.use("/v1/posts", validateToken, proxy(process.env.POST_SERVICE_URL, {
  ...proxyOptions,
  proxyReqOptDecorator: (proxyReqOpts, srcReq) => {
    proxyReqOpts.headers['Content-Type'] = "application/json"
    proxyReqOpts.headers['x-user-id']=srcReq.user.userId
    return proxyReqOpts;
  },
  userResDecorator: (proxyRes, proxyResData, userReq, userRes) => {
    logger.info(`Response received from post service: ${proxyRes.statusCode}`)
    return proxyResData;
  }
}))

// setting up proxy for media service
app.use("/v1/media", validateToken, proxy(process.env.MEDIA_SERVICE_URL, {
  ...proxyOptions,
  proxyReqOptDecorator: (proxyReqOpts, srcReq) => {
    proxyReqOpts.headers['x-user-id']=srcReq.user.userId
    if(!srcReq.headers['content-type'].startsWith("multipart/form-data")){
      proxyReqOpts.headers['Content-Type'] = "application/json"
    }
    return proxyReqOpts;
  },
  userResDecorator: (proxyRes, proxyResData, userReq, userRes) => {
    logger.info(`Response received from media service: ${proxyRes.statusCode}`)
    return proxyResData;
  },
  parseReqBody: false
}))


// proxy settings for search service
app.use("/v1/search", validateToken, proxy(process.env.SEARCH_SERVICE_URL, {
  ...proxyOptions,
  proxyReqOptDecorator: (proxyReqOpts, srcReq) => {
    proxyReqOpts.headers['Content-Type'] = "application/json"
    proxyReqOpts.headers['x-user-id']=srcReq.user.userId
    return proxyReqOpts;
  },
  userResDecorator: (proxyRes, proxyResData, userReq, userRes) => {
    logger.info(`Response received from search service: ${proxyRes.statusCode}`)
    return proxyResData;
  }
}))

app.use(errorHandler)

// start server
app.listen(PORT, () => {
  logger.info(`API Gateway is running on port ${PORT}`)
  logger.info(`Auth service is running on ${process.env.AUTH_SERVICE_URL}`)
  logger.info(`Post service is running on ${process.env.POST_SERVICE_URL}`)
  logger.info(`Media service is running on ${process.env.MEDIA_SERVICE_URL}`)
  logger.info(`Search service is running on ${process.env.SEARCH_SERVICE_URL}`)
  logger.info(`Redis Url ${process.env.REDIS_URL}`)
})