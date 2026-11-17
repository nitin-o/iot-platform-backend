
import { Router } from "express";
import { verifyJWT } from "../middleware/auth.middleware.js";

import {
  createComment,
  getPostComments,
  updateComment,
  deleteComment,
} from "../controllers/comment.controller.js";

const router = Router();

// Create a comment on a post
router.post("/:postId/comments", verifyJWT, createComment);

// Get all comments on a post
router.get("/:postId/comments", verifyJWT, getPostComments);

// Update your own comment
router.patch("/comments/:commentId", verifyJWT, updateComment);

// Delete your own comment
router.delete("/comments/:commentId", verifyJWT, deleteComment);

export default router;
