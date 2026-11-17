
import { Router } from "express";
import { verifyJWT } from "../middleware/auth.middleware.js";

import {
  getMyProfile,
  updateMyProfile,
  getUserProfile,
  searchUsers,
  followUser,
  unfollowUser,
  getFollowers,
  getFollowing,
  getFollowRequests,
  acceptFollowRequest,
  rejectFollowRequest,
} from "../controllers/user.controller.js";
import { getUserPosts } from "../controllers/post.controller.js";

const router = Router();

router.get("/me", verifyJWT, getMyProfile);
router.get("/search", verifyJWT, searchUsers);

router.patch("/me", verifyJWT, updateMyProfile);

router.post("/:userId/follow", verifyJWT, followUser);
router.delete("/:userId/follow", verifyJWT, unfollowUser);

router.get("/:userId/followers", verifyJWT, getFollowers);
router.get("/:userId/following", verifyJWT, getFollowing);
router.get("/:userId/posts", verifyJWT, getUserPosts);
router.get("/me/follow-requests", verifyJWT, getFollowRequests);

router.patch(
  "/follow-requests/:requestId/accept",
  verifyJWT,
  acceptFollowRequest
);  

router.delete(
  "/follow-requests/:requestId/reject",
  verifyJWT,
  rejectFollowRequest
);

router.get("/:userId", verifyJWT, getUserProfile);

export default router;
