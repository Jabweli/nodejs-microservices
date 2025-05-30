import express from "express"
import { authenticateRequest } from "../middleware/authMiddleware.js";
import { createPost, deletePost, getAllPosts, getPost } from "../controllers/post-controller.js";

const router = express.Router();

// middleware to check if user is authenticated
router.use(authenticateRequest)

router.delete("/:id", deletePost)
router.post("/create", createPost)
router.get("/all-posts", getAllPosts)
router.get("/:id", getPost)

export {router}