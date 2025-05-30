import express from "express"
import { authenticateRequest } from "../middleware/authMiddleware.js";
import { searchPostController } from "../controllers/search-controller.js";


export const router = express.Router();

router.use(authenticateRequest)

router.get("/posts", searchPostController)