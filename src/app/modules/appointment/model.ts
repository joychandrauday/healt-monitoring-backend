import { Schema, model } from 'mongoose';
import { Appointment } from './interface';

const appointmentSchema = new Schema<Appointment>({
    patientId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    doctorId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    date: { type: Date, required: true },
    status: {
        type: String,
        enum: ['pending', 'confirmed', 'rejected', 'cancelled'],
        default: 'pending',
    },
    createdAt: { type: Date, default: Date.now },
});

export const AppointmentModel = model<Appointment>('Appointment', appointmentSchema);