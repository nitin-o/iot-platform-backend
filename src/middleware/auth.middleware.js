
import jwt from "jsonwebtoken";
import User from "../models/user.model.js";
import Session from "../models/session.model.js";

const verifyJWT = async (req, res, next) => {
    try {
        // 1. Get access token from cookie or Authorization header
        const authHeader = req.headers.authorization;

        const token =
            req.cookies?.accessToken ||
            (authHeader?.startsWith("Bearer ")
                ? authHeader.slice(7)
                : null);

        if (!token) {
            return res.status(401).json({
                success: false,
                message: "Access token is required.",
            });
        }

        // 2. Verify access token
        const decodedToken = jwt.verify(
            token,
            process.env.ACCESS_TOKEN_SECRET
        );

        // 3. Validate token payload
        if (!decodedToken._id || !decodedToken.sid) {
            return res.status(401).json({
                success: false,
                message: "Invalid access token payload.",
            });
        }

        // 4. Find active session
        const session = await Session.findOne({
            _id: decodedToken.sid,
            user: decodedToken._id,
            revokedAt: null,
            expiresAt: { $gt: new Date() },
        });

        if (!session) {
            return res.status(401).json({
                success: false,
                message: "Session expired or revoked. Please login again.",
            });
        }

        // 5. Find user
        const user = await User.findById(decodedToken._id);

        if (!user || user.isActive === false) {
            return res.status(401).json({
                success: false,
                message: "User account is unavailable.",
            });
        }

        // 6. Attach authenticated data to request
        req.user = user;
        req.session = session;

        // 7. Continue to controller
        return next();

    } catch (error) {
        if (error.name === "TokenExpiredError") {
            return res.status(401).json({
                success: false,
                message: "Access token expired. Please refresh your token.",
            });
        }

        if (error.name === "JsonWebTokenError") {
            return res.status(401).json({
                success: false,
                message: "Invalid access token.",
            });
        }

        console.error("Authentication middleware error:", error);

        return res.status(401).json({
            success: false,
            message: "Authentication failed.",
        });
    }
};

export { verifyJWT };
