
import { Router } from "express";
import { verifyJWT } from "../middleware/auth.middleware.js";

import {
  likePost,
  unlikePost,
  getPostLikes,
} from "../controllers/like.controller.js";

const router = Router();

router.post("/:postId/like", verifyJWT, likePost);

router.delete("/:postId/like", verifyJWT, unlikePost);

router.get("/:postId/likes", verifyJWT, getPostLikes);

export default router;
