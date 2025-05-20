"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.VitalModel = void 0;
const mongoose_1 = require("mongoose");
const vitalSchema = new mongoose_1.Schema({
    patientId: { type: mongoose_1.Schema.Types.ObjectId, ref: "User", required: true },
    doctorId: { type: mongoose_1.Schema.Types.ObjectId, ref: "Doctor", required: true },
    status: {
        type: String,
        enum: ["acknowledged", "pending", "in-progress", "completed"],
        default: "pending"
    },
    feedback: {
        type: {
            prescriptions: [{
                    medication: { type: String, trim: true },
                    dosage: { type: String, trim: true },
                    duration: { type: String, trim: true },
                    instructions: { type: String, trim: true },
                }],
            labTests: [{
                    testName: { type: String, trim: true },
                    urgency: { type: String, enum: ["routine", "urgent"], default: "routine" },
                    notes: { type: String, trim: true },
                }],
            recommendations: { type: String, trim: true },
        },
        default: {}, // Default to empty object
        required: false, // Explicitly not required
    },
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
        type: { type: String, enum: ["internal", "external", "none"], default: "none" },
        description: { type: String, trim: true },
        severity: { type: String, enum: ["mild", "moderate", "severe"] },
    },
    visuals: [{ type: String, trim: true }],
    notes: { type: String, trim: true },
    priority: {
        type: String,
        enum: ["low", "medium", "high"],
        default: "low"
    },
    timestamp: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
}, {
    timestamps: { updatedAt: 'updatedAt' } // Automatically manage updatedAt
});
exports.VitalModel = (0, mongoose_1.model)('Vital', vitalSchema);
