import { Types } from "mongoose";

export interface User {
    _id: string;
    email: string;
    password: string;
    bio: string;
    name: string;
    role: 'patient' | 'doctor' | 'admin';
    avatar: string;
    assignedDoctorId: Types.ObjectId;
    doctorRequest: boolean;
    gender: 'male' | 'female' | 'other';
    bloodGroup: 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-';
    age: number;
    phone: string;
    address: Address;
    createdAt: Date;
    updatedAt: Date;
}

export interface Address {
    street: string;
    city: string;
    state?: string;
    postalCode?: string;
    country?: string;
}