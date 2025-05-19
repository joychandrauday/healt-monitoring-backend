"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.roleMiddleware = void 0;
const error_1 = require("../utils/error");
const roleMiddleware = (roles) => {
    return (req, res, next) => {
        if (!req.user || !roles.includes(req.user.role)) {
            throw new error_1.AppError('Access denied', 403);
        }
        next();
    };
};
exports.roleMiddleware = roleMiddleware;
