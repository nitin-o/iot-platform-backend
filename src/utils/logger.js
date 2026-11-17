
import winston from "winston";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";

// Current file path
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Logs directory: backend/logs
const logDirectory = path.resolve(__dirname, "../../logs");

fs.mkdirSync(logDirectory, { recursive: true });

// Custom log levels
const customLevels = {
    error: 0,
    warn: 1,
    info: 2,
    http: 3,
    verbose: 4,
    debug: 5,
    silly: 6
};

// Custom colors
winston.addColors({
    error: "red",
    warn: "yellow",
    info: "green",
    http: "magenta",
    verbose: "cyan",
    debug: "blue",
    silly: "grey"
});

// Log format
const logFormat = winston.format.combine(
    winston.format.timestamp({
        format: "YYYY-MM-DD HH:mm:ss"
    }),
    winston.format.errors({
        stack: true
    }),
    winston.format.json()
);

// Create logger
const logger = winston.createLogger({
    levels: customLevels,
    level: process.env.LOG_LEVEL || "info",
    format: logFormat,

    transports: [
        new winston.transports.File({
            filename: path.join(logDirectory, "error.log"),
            level: "error"
        }),

        new winston.transports.File({
            filename: path.join(logDirectory, "combined.log")
        })
    ],

    exceptionHandlers: [
        new winston.transports.File({
            filename: path.join(logDirectory, "exceptions.log")
        })
    ],

    rejectionHandlers: [
        new winston.transports.File({
            filename: path.join(logDirectory, "rejections.log")
        })
    ]
});

// Development console logging
if (process.env.NODE_ENV !== "production") {
    logger.add(
        new winston.transports.Console({
            format: winston.format.combine(
                winston.format.colorize(),
                winston.format.simple()
            )
        })
    );
}

export default logger;
