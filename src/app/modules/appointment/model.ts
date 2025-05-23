import { Schema, model } from 'mongoose';
import { IAppointment } from './interface';

const appointmentSchema = new Schema<IAppointment>({
    patientId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    doctorId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    appointmentDate: {
        type: Date,
        required: true,
    },
    duration: {
        type: Number,
        required: true, // Duration in minutes, e.g., 30
    },
    status: {
        type: String,
        enum: ['pending', 'confirmed', 'completed', 'cancelled'],
        default: 'pending',
    },
    type: {
        type: String,
        enum: ['in-person', 'teleconsultation'],
        required: true,
    },
    payment: {
        amount: {
            type: Number,
            required: true, // Amount to be paid for the appointment
        },
        currency: {
            type: String,
            required: true, // e.g., "USD"
            default: 'USD',
        },
        status: {
            type: String,
            enum: ['pending', 'completed', 'failed', 'refunded'],
            default: 'pending',
        },
        transactionId: {
            type: String,
            required: false, // Payment gateway transaction ID
        },
        paymentMethod: {
            type: String,
            enum: ['credit_card', 'debit_card', 'online_payment', 'insurance'],
            required: false,
        },
        paidAt: {
            type: Date,
            required: false,
        },
    },
    reason: {
        type: String,
        required: true, // Reason for appointment, e.g., "General Checkup"
    },
    vital: {
        type: Schema.Types.ObjectId,
        ref: 'Vital',
        required: true,
    },
    notes: {
        type: String,
        required: false, // Additional notes from patient
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
    updatedAt: {
        type: Date,
        default: Date.now,
    },
});

// Update updatedAt timestamp on save
appointmentSchema.pre('save', function (next) {
    this.updatedAt = new Date();
    next();
});

export const Appointment = model<IAppointment>('Appointment', appointmentSchema);