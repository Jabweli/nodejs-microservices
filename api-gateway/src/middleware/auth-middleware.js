import { logger } from "../utils/logger.js";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
dotenv.config();

export const validateToken = (req, res, next) => {
  const authHeaders = req.headers["authorization"];
  const token = authHeaders && authHeaders.split(" ")[1];

  if (!token) {
    logger.error("Access attempted without a valid token");
    return res.status(401).json({
      success: false,
      message: "Authentication required!",
    });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      logger.warn("Invalid token");
      return res.status(429).json({
        success: false,
        message: "Invalid token",
      });
    }
    req.user = user
    next();
  });
};
