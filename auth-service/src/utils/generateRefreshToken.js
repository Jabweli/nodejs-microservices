import jwt from "jsonwebtoken";
import crypto from "crypto"
import dotenv from "dotenv";
import { RefreshToken } from "../models/refreshToken.js";

dotenv.config();

export const generateTokens = async (user) => {
  const accessToken = jwt.sign(
    { userId: user._id, username: user.username },
    process.env.JWT_SECRET,
    { expiresIn: "30m" }
  );

  const refreshToken = crypto.randomBytes(40).toString('hex');
  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + 7) // refresh token expires in 7 days

  // save token to db
  await RefreshToken.create({
    token: refreshToken,
    user: user._id,
    expiresAt
  })

  return {accessToken, refreshToken}
};
