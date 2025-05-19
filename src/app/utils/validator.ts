import { z } from 'zod';
import { AppError } from './error';

export const validate = <T>(schema: z.ZodSchema<T>) => {
    return (data: any) => {
        const result = schema.safeParse(data);
        if (!result.success) {
            throw new AppError(result.error.errors.map(e => e.message).join(', '), 400);
        }
        return result.data;
    };
};