import { Request, Response, NextFunction } from 'express';
import { Error as MongooseError } from 'mongoose';

export const globalErrorHandler = (
    err: any,
    req: Request,
    res: Response,
    next: NextFunction
) => {
    // Default values
    let statusCode = err.statusCode || 500;
    let message = err.message || 'Something went wrong';
    let errorMessages: { path: string; message: string }[] = [];

    // ✅ Handle Mongoose validation error
    if (err instanceof MongooseError.ValidationError) {
        statusCode = 400;
        message = 'Validation Error';
        errorMessages = Object.values(err.errors).map((error: any) => ({
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
