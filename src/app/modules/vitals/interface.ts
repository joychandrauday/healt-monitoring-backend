import { Types } from "mongoose";

export interface Vital {
    _id: string;
    patientId: Types.ObjectId;
    doctorId: Types.ObjectId;
    heartRate?: number; // Beats per minute (bpm)
    bloodPressure?: { systolic: number; diastolic: number }; // mmHg
    glucoseLevel?: number; // mg/dL
    oxygenSaturation?: number; // Percentage (e.g., 95-100%)
    temperature?: number; // Celsius
    respiratoryRate?: number; // Breaths per minute
    painLevel?: number; // Scale of 0-10
    injury?: {
        type: "internal" | "external" | "none";
        description?: string; // E.g., "Fractured rib" or "Laceration on left arm"
        severity?: "mild" | "moderate" | "severe";
    };
    visuals?: string[]; // URLs or references to images/scans
    timestamp: Date; // ISO date string
}