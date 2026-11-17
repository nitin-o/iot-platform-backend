
import mongoose from "mongoose";
import logger from "../utils/logger.js";

const connectDB = async () => {
    try {
        const mongoUri = process.env.MONGO_URI;

        if (!mongoUri) {
            throw new Error("MONGO_URI is missing from the .env file");
        }

        await mongoose.connect(mongoUri, {
            serverSelectionTimeoutMS: 10000
        });

        logger.info("MongoDB Atlas connected successfully");

        console.log("✅ MongoDB Atlas Connected");

    } catch (error) {
        logger.error("MongoDB Connection Failed:", error);

        console.error(
            "❌ MongoDB Connection Failed:",
            error.message
        );

        throw error;
    }
};

export default connectDB;
