import { Request } from 'express';

export interface CustomRequest extends Request {
    user?: {
        _id?: string;
        id: string;
        email: string;
        role: string;
    };
}
export interface QueryParams {
    userId?: string;
    status?: string;
    doctorRequest?: boolean;
    startDate?: string;
    endDate?: string;
    role?: string;
    search?: string;
    page?: number;
    limit?: number;
    type?: 'string'
}
export interface Meta {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}