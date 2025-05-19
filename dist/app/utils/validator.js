"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validate = void 0;
const error_1 = require("./error");
const validate = (schema) => {
    return (data) => {
        const result = schema.safeParse(data);
        if (!result.success) {
            throw new error_1.AppError(result.error.errors.map(e => e.message).join(', '), 400);
        }
        return result.data;
    };
};
exports.validate = validate;
