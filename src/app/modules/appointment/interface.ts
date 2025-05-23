import { Schema } from "mongoose";
import { Types } from "mongoose";

export interface IAppointment extends Document {
    patientId: Schema.Types.ObjectId;
    doctorId: Schema.Types.ObjectId;
    appointmentDate: Date;
    duration: number;
    status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
    type: 'in-person' | 'teleconsultation';
    payment?: {
        amount: number;
        currency: string;
        status: 'pending' | 'completed' | 'failed' | 'refunded';
        transactionId?: string;
        paymentMethod?: 'credit_card' | 'debit_card' | 'online_payment' | 'insurance';
        paidAt?: Date;
    };
    vital: Schema.Types.ObjectId;
    reason: string;
    notes?: string;
    createdAt: Date;
    updatedAt: Date;
}