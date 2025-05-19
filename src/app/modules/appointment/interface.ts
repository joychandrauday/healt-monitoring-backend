import { Types } from "mongoose";

export interface Appointment {
    populate(arg0: string): unknown;
    _id: string;
    patientId: Types.ObjectId;
    doctorId: Types.ObjectId;
    date: Date;
    status: 'pending' | 'confirmed' | 'rejected' | 'cancelled';
    createdAt: Date;
}