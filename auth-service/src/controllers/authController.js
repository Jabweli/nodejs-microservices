import { RefreshToken } from "../models/refreshToken.js";
import { User } from "../models/user.js";
import { generateTokens } from "../utils/generateRefreshToken.js";
import { logger } from "../utils/logger.js";
import { validateLogin, validateRegistration } from "../utils/validation.js";

//  user registration
export const registerUser = async (req, res) => {
  logger.info("Hit user registration endpoint..");
  try {
    // validate schema
    const { error } = validateRegistration(req.body);
    if (error) {
      logger.warn("Validation error!", error.details[0].message);
      return res.status(400).json({
        success: false,
        message: error.details[0].message,
      });
    }

    const { username, email, password } = req.body;

    let user = await User.findOne({ $or: [{ username }, { email }] });
    if (user) {
      logger.warn("User already exists!");
      return res.status(400).json({
        success: false,
        message: "User already exists!",
      });
    }

    user = new User({ username, email, password });
    await user.save();
    logger.warn("User created successfully", user._id);

    const { accessToken, refreshToken } = await generateTokens(user);

    return res.status(201).json({
      success: true,
      message: "User registered successfully!",
      accessToken,
      refreshToken,
    });
  } catch (e) {
    logger.error("User registration error occurred!", e);
    return res.status(500).json({
      success: false,
      message: "Internal server error!",
    });
  }
};

// user login
export const loginUser = async (req, res, next) => {
  logger.info("Hit the login endpoint...");
  try {
    // validate schema
    const { error } = validateLogin(req.body);
    if (error) {
      logger.warn("Validation error!", error.details[0].message);
      return res.status(400).json({
        success: false,
        message: error.details[0].message,
      });
    }

    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) {
      logger.warn("User not found!");
      return res.status(401).json({
        success: false,
        message: "Invalid email or password.",
      });
    }

    // check user password
    const isValidPassword = await user.comparePassword(password);
    if (!isValidPassword) {
      logger.warn("Incorrect password.");
      return res.status(401).json({
        success: false,
        message: "Incorrect password.",
      });
    }

    // generate tokens
    const { accessToken, refreshToken } = await generateTokens(user);
    return res.status(200).json({
      message: "Logged in successfully!",
      accessToken,
      refreshToken,
      userId: user._id,
    });
  } catch (e) {
    logger.error("User login error occurred!", e);
    return res.status(500).json({
      success: false,
      message: "Internal server error!",
    });
  }
};

// refresh token
export const userRefreshToken = async (req, res) => {
  logger.info("Refresh token endpoint hit...");
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      logger.warn("Refresh token missing.");
      return res.status(401).json({
        success: false,
        message: "Refresh token missing.",
      });
    }

    const storedToken = await RefreshToken.findOne({ token: refreshToken });
    if (!storedToken || storedToken.expiresAt < new Date()) {
      logger.warn("Invalid or expired refresh token.");
      return res.status(401).json({
        success: false,
        message: "Invalid or expired refresh token.",
      });
    }

    const user = await User.findById(storedToken.user);
    if (!user) {
      logger.warn("User not found.");
      return res.status(400).json({
        success: false,
        message: "User not found.",
      });
    }

    const { accessToken: newAccessToken, refreshToken: newRefreshToken } =
      await generateTokens(user);

    // delete the old user refresh token
    await RefreshToken.deleteOne({ _id: storedToken._id });

    res.status(200).json({
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    });
  } catch (error) {
    logger.error("Refresh token error occurred!", e);
    return res.status(500).json({
      success: false,
      message: "Internal server error!",
    });
  }
};

// user logout
export const logoutUser = async (req, res) => {
  logger.info("logout endpoint hit...");
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      logger.warn("Refresh token missing.");
      return res.status(401).json({
        success: false,
        message: "Refresh token missing.",
      });
    }

    await RefreshToken.deleteOne({ token: refreshToken });
    logger.info("Refresh token deleted for logout");

    res.status(200).json({
      success: true,
      message: "Logged out successfully!",
    });
  } catch (error) {
    logger.error("Error while logging out.", e);
    return res.status(500).json({
      success: false,
      message: "Internal server error!",
    });
  }
};

// forgot-password

// reset-password