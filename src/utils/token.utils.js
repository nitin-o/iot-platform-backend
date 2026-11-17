
import crypto from "node:crypto";
import jwt from "jsonwebtoken";

// Create SHA-256 hash of a token
const hashToken = (token) => {
    if (typeof token !== "string" || !token) {
        throw new Error("A valid token is required.");
    }

    return crypto
        .createHash("sha256")
        .update(token)
        .digest("hex");
};

// Get token expiry date
const getTokenExpiryDate = (token) => {
    const decoded = jwt.decode(token);

    if (!decoded || typeof decoded.exp !== "number") {
        throw new Error("Invalid token expiry.");
    }

    return new Date(decoded.exp * 1000);
};

export {
    hashToken,
    getTokenExpiryDate,
};
