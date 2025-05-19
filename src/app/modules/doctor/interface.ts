import { Types } from "mongoose";

export interface Review {
    user: Types.ObjectId;
    content: string;
    ratings: number;
    createdAt?: Date;
    updatedAt?: Date;
}

export interface Doctor {
    _id: string;
    user: Types.ObjectId;
    major?: string;
    qualifications?: string[];
    experience?: number; // in years
    bio?: string;
    availableDays?: string[]; // e.g., ['Monday', 'Wednesday']
    availableTime?: {
        from?: string; // e.g., "09:00"
        to?: string;   // e.g., "17:00"
    };
    reviews?: Review[];
    averageRating?: number; // 👈 Optional: because initially no rating
    createdAt?: Date;
    updatedAt?: Date;
}
