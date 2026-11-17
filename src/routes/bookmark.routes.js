
import { Router } from "express";
import { verifyJWT } from "../middleware/auth.middleware.js";

import {
  savePost,
  removeSavedPost,
  getSavedPosts,
} from "../controllers/bookmark.controller.js";

const router = Router();

// Save a post
router.post("/:postId/save", verifyJWT, savePost);

// Remove a saved post
router.delete("/:postId/save", verifyJWT, removeSavedPost);

// Get all saved posts
router.get("/saved", verifyJWT, getSavedPosts);

export default router;
