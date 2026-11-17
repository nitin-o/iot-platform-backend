
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import mongoose from "mongoose";

import authRouter from "./routes/auth.routes.js";
import userRouter from "./routes/user.routes.js";
import loggerMiddleware from "./middleware/logger.middleware.js";
import postRouter from "./routes/post.routes.js";
import likeRouter from "./routes/like.routes.js";
import commentRouter from "./routes/comment.routes.js";
import bookmarkRouter from "./routes/bookmark.routes.js";


const app = express();

const baseUrl = "/api/v1";

// ======================================
// Core Middleware
// ======================================

app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// ======================================
// CORS Configuration
// ======================================

app.use(cors({
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true
}));

// ======================================
// HTTP Request Logger
// ======================================

app.use(loggerMiddleware);

// ======================================
// Root Route
// ======================================

app.get("/", (req, res) => {
    res.status(200).json({
        success: true,
        statusCode: 200,
        message: "ConnectHub API is running",
        data: {
            name: "ConnectHub API",
            version: "1.0.0"
        }
    });
});

// ======================================
// Backend and MongoDB Health Check
// ======================================

app.get(`${baseUrl}/health`, (req, res) => {
    const dbState = mongoose.connection.readyState;

    const dbStatus = {
        0: "Disconnected",
        1: "Connected",
        2: "Connecting",
        3: "Disconnecting"
    };

    const isConnected = dbState === 1;

    res.status(isConnected ? 200 : 503).json({
        success: isConnected,
        statusCode: isConnected ? 200 : 503,
        backend: "Running",
        mongodb: dbStatus[dbState] || "Unknown",
        timestamp: new Date().toISOString()
    });
});

// ======================================
// API Routes
// ======================================

app.use(`${baseUrl}/auth`, authRouter);
app.use(`${baseUrl}/users`, userRouter);

// Bookmark routes must come before post routes
app.use(`${baseUrl}/posts`, bookmarkRouter);

app.use(`${baseUrl}/posts`, postRouter);
app.use(`${baseUrl}/posts`, likeRouter);
app.use(`${baseUrl}/posts`, commentRouter);

// More routes will be added as we build each feature:
// /api/v1/users
// /api/v1/posts
// /api/v1/friends
// /api/v1/notifications
// /api/v1/conversations
// /api/v1/stories

// ======================================
// 404 Handler
// ======================================

app.use((req, res) => {
    res.status(404).json({
        success: false,
        statusCode: 404,
        message: "API route not found"
    });
});

// ======================================
// Export
// ======================================

export default app;
