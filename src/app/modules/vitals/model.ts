import { Schema, model } from 'mongoose';
import { Vital } from './interface';

const vitalSchema = new Schema<Vital>({
    patientId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    doctorId: { type: Schema.Types.ObjectId, ref: "Doctor", required: true },
    heartRate: { type: Number, min: 0 },
    bloodPressure: {
        systolic: { type: Number, min: 0 },
        diastolic: { type: Number, min: 0 },
    },
    glucoseLevel: { type: Number, min: 0 },
    oxygenSaturation: { type: Number, min: 0, max: 100 },
    temperature: { type: Number, min: 0 },
    respiratoryRate: { type: Number, min: 0 },
    painLevel: { type: Number, min: 0, max: 10 },
    injury: {
        type: { type: String, enum: ["internal", "external", "none"] },
        description: { type: String },
        severity: { type: String, enum: ["mild", "moderate", "severe"] },
    },
    visuals: [{ type: String }],
    timestamp: { type: Date, default: Date.now },
});

export const VitalModel = model<Vital>('Vital', vitalSchema);