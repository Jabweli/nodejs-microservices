import express from "express";
import {
  loginUser,
  logoutUser,
  registerUser,
  userRefreshToken,
} from "../controllers/authController.js";

const router = express.Router();

router.post("/register", registerUser);
router.post("/login", loginUser);
router.post("/refresh-token", userRefreshToken);
router.post("/logout", logoutUser)

export { router };
