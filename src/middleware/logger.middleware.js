
import morgan from "morgan";
import logger from "../utils/logger.js";

const stream = {
    write: (message) => {
        logger.http(message.trim());
    }
};

const loggerMiddleware = morgan(
    ":date[iso] :method :url :status :response-time ms - IP: :remote-addr",
    { stream }
);

export default loggerMiddleware;
