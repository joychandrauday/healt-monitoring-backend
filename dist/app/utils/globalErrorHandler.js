"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.globalErrorHandler = void 0;
const mongoose_1 = require("mongoose");
const globalErrorHandler = (err, req, res, next) => {
    // Default values
    let statusCode = err.statusCode || 500;
    let message = err.message || 'Something went wrong';
    let errorMessages = [];
    // ✅ Handle Mongoose validation error
    if (err instanceof mongoose_1.Error.ValidationError) {
        statusCode = 400;
        message = 'Validation Error';
        errorMessages = Object.values(err.errors).map((error) => ({
            path: error.path,
            message: error.message,
        }));
    }
    // ✅ Final response
    res.status(statusCode).json({
        success: false,
        message,
        errorMessages,
        stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    });
};
exports.globalErrorHandler = globalErrorHandler;
