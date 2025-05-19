import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/error';
import { CustomRequest } from '../types';

export const roleMiddleware = (roles: string[]) => {
    return (req: CustomRequest, res: Response, next: NextFunction) => {
        if (!req.user || !roles.includes(req.user.role)) {
            throw new AppError('Access denied', 403);
        }
        next();
    };
};