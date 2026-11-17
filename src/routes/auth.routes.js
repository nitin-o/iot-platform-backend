
import { Router } from "express";

import { verifyJWT } from "../middleware/auth.middleware.js";

import {
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
    getCurrentUser,
} from "../controllers/auth.controller.js";

const router = Router();

// Register
router.post("/register", registerUser);

// Login
router.post("/login", loginUser);

// Logout
router.post("/logout", verifyJWT, logoutUser);

// Refresh access token
router.post("/refresh-token", refreshAccessToken);

// Get logged-in user
router.get("/current-user", verifyJWT, getCurrentUser);

export default router;
