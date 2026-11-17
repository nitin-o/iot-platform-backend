
import mongoose from "mongoose";
import jwt from "jsonwebtoken";

import User from "../models/user.model.js";
import Session from "../models/session.model.js";

import {
    hashToken,
    getTokenExpiryDate,
} from "../utils/token.utils.js";

// ======================================
// Register User
// ======================================

const registerUser = async (req, res) => {
    try {
        const firstName = req.body.firstName?.trim();
        const lastName = req.body.lastName?.trim();
        const email = req.body.email?.trim().toLowerCase();
        const password = req.body.password;

        if (!firstName || !lastName || !email || !password) {
            return res.status(400).json({
                success: false,
                message: "All fields are required.",
            });
        }

        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            return res.status(400).json({
                success: false,
                message: "Please enter a valid email address.",
            });
        }

        if (typeof password !== "string" || password.length < 8 || password.length > 72) {
            return res.status(400).json({
                success: false,
                message: "Password must be between 8 and 72 characters.",
            });
        }

        const existingUser = await User.findOne({ email });

        if (existingUser) {
            return res.status(409).json({
                success: false,
                message: "Email already registered.",
            });
        }

        const user = await User.create({
            firstName,
            lastName,
            email,
            password,
        });

        const createdUser = await User.findById(user._id);

        return res.status(201).json({
            success: true,
            message: "Account created successfully.",
            user: createdUser,
        });

    } catch (error) {
        console.error("Registration error:", error);

        if (error.code === 11000) {
            return res.status(409).json({
                success: false,
                message: "Email or username already exists.",
            });
        }

        if (error.name === "ValidationError") {
            return res.status(400).json({
                success: false,
                message: error.message,
            });
        }

        return res.status(500).json({
            success: false,
            message: "Something went wrong during registration.",
        });
    }
};

// ======================================
// Login User
// ======================================

const loginUser = async (req, res) => {
    try {
        const email = req.body.email?.trim().toLowerCase();
        const password = req.body.password;

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: "Email and password are required.",
            });
        }

        // Explicitly select password because the User model uses select: false
        const user = await User.findOne({ email }).select("+password");

        if (!user || !(await user.isPasswordCorrect(password))) {
            return res.status(401).json({
                success: false,
                message: "Invalid email or password.",
            });
        }

        if (!user.isActive) {
            return res.status(403).json({
                success: false,
                message: "This account is currently unavailable.",
            });
        }

        // Create unique session ID
        const sessionId = new mongoose.Types.ObjectId();

        // Generate tokens
        const accessToken = user.generateAccessToken(sessionId);
        const refreshToken = user.generateRefreshToken(sessionId);

        // Create session
        const session = await Session.create({
            _id: sessionId,
            user: user._id,
            refreshTokenHash: hashToken(refreshToken),
            deviceInfo: req.get("user-agent") || "Unknown Device",
            clientType: ["android", "web", "other"].includes(req.body.clientType)
                ? req.body.clientType
                : "other",
            expiresAt: getTokenExpiryDate(refreshToken),
        });

        const loggedInUser = await User.findById(user._id);

        return res.status(200).json({
            success: true,
            message: "Login successful.",
            user: loggedInUser,
            accessToken,
            refreshToken,
            sessionId: session._id,
        });

    } catch (error) {
        console.error("Login error:", error);

        return res.status(500).json({
            success: false,
            message: "Something went wrong during login.",
        });
    }
};

// ======================================
// Logout User
// ======================================

const logoutUser = async (req, res) => {
    try {
        if (!req.session || req.session.revokedAt) {
            return res.status(401).json({
                success: false,
                message: "Session already logged out or expired.",
            });
        }

        req.session.revokedAt = new Date();

        await req.session.save();

        return res.status(200).json({
            success: true,
            message: "Logout successful.",
        });

    } catch (error) {
        console.error("Logout error:", error);

        return res.status(500).json({
            success: false,
            message: "Something went wrong during logout.",
        });
    }
};

// ======================================
// Refresh Access Token
// ======================================

const refreshAccessToken = async (req, res) => {
    try {
        const incomingRefreshToken =
            req.body?.refreshToken ||
            req.cookies?.refreshToken;

        if (!incomingRefreshToken) {
            return res.status(401).json({
                success: false,
                message: "Refresh token is required.",
            });
        }

        let decodedToken;

        try {
            decodedToken = jwt.verify(
                incomingRefreshToken,
                process.env.REFRESH_TOKEN_SECRET
            );
        } catch {
            return res.status(401).json({
                success: false,
                message: "Invalid or expired refresh token.",
            });
        }

        if (!decodedToken.sid || !decodedToken._id) {
            return res.status(401).json({
                success: false,
                message: "Invalid refresh token.",
            });
        }

        // Find active session
        const session = await Session.findOne({
            _id: decodedToken.sid,
            user: decodedToken._id,
            revokedAt: null,
            expiresAt: { $gt: new Date() },
        }).select("+refreshTokenHash");

        if (!session) {
            return res.status(401).json({
                success: false,
                message: "Session expired or revoked. Please login again.",
            });
        }

        // Compare refresh token hash
        const incomingTokenHash = hashToken(incomingRefreshToken);

        if (incomingTokenHash !== session.refreshTokenHash) {
            session.revokedAt = new Date();
            await session.save();

            return res.status(401).json({
                success: false,
                message: "Refresh token reuse detected. Please login again.",
            });
        }

        // Find user
        const user = await User.findById(decodedToken._id);

        if (!user || !user.isActive) {
            return res.status(401).json({
                success: false,
                message: "User account is unavailable.",
            });
        }

        // Generate new tokens
        const newAccessToken = user.generateAccessToken(session._id);
        const newRefreshToken = user.generateRefreshToken(session._id);

        // Rotate refresh token
        session.refreshTokenHash = hashToken(newRefreshToken);
        session.expiresAt = getTokenExpiryDate(newRefreshToken);
        session.lastUsedAt = new Date();

        await session.save();

        return res.status(200).json({
            success: true,
            message: "Tokens refreshed successfully.",
            accessToken: newAccessToken,
            refreshToken: newRefreshToken,
        });

    } catch (error) {
        console.error("Refresh token error:", error);

        return res.status(500).json({
            success: false,
            message: "Something went wrong while refreshing the token.",
        });
    }
};

// ======================================
// Get Current User
// ======================================

const getCurrentUser = async (req, res) => {
    res.set("Cache-Control", "no-store");

    return res.status(200).json({
        success: true,
        message: "Current user fetched successfully.",
        user: req.user,
    });
};

// ======================================
// Exports
// ======================================

export {
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
    getCurrentUser,
};
