
import { Router } from "express";
import { verifyJWT } from "../middleware/auth.middleware.js";

import {
  createPost,
  getPostById,
  updatePost,
  deletePost,
  getFeedPosts,
} from "../controllers/post.controller.js";

const router = Router();

router.post("/", verifyJWT, createPost);

// News feed
router.get("/", verifyJWT, getFeedPosts);

// Single post
router.get("/:postId", verifyJWT, getPostById);

// Update post
router.patch("/:postId", verifyJWT, updatePost);

// Delete post
router.delete("/:postId", verifyJWT, deletePost);

export default router;
