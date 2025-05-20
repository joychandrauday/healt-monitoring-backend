import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AppError } from '../utils/error';
import { CustomRequest } from '../types';

export const authMiddleware = async (req: CustomRequest, res: Response, next: NextFunction) => {
    try {
        const token = req.headers.authorization?.split('Bearer ')[1];
        if (!token) {
            return next(new AppError('No token provided', 401));
        }
        const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { id: string; email: string; role: string };
        req.user = { id: decoded.id, email: decoded.email, role: decoded.role };
        next();
    } catch (error) {
        next(new AppError('Invalid or expired token.', 401));
    }
};
