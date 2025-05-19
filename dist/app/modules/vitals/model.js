"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.VitalModel = void 0;
const mongoose_1 = require("mongoose");
const vitalSchema = new mongoose_1.Schema({
    patientId: { type: mongoose_1.Schema.Types.ObjectId, ref: "User", required: true },
    doctorId: { type: mongoose_1.Schema.Types.ObjectId, ref: "Doctor", required: true },
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
exports.VitalModel = (0, mongoose_1.model)('Vital', vitalSchema);
