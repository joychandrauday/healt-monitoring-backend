import { Types } from "mongoose";
export interface Vital {
    _id: string;
    patientId: Types.ObjectId;
    doctorId: Types.ObjectId;
    status: "acknowledged" | "pending" | "in-progress" | "completed";
    feedback?: {
        prescriptions?: {
            medication: string;
            dosage: string; // E.g., "500mg twice daily"
            duration: string; // E.g., "7 days"
            instructions?: string; // E.g., "Take with food"
        }[];
        labTests?: {
            testName: string; // E.g., "CBC", "Lipid Panel"
            urgency: "routine" | "urgent";
            notes?: string; // E.g., "Fasting required"
        }[];
        recommendations?: string; // General advice, e.g., "Rest, hydrate, follow-up in 3 days"
    };
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
    notes?: string; // Additional clinical notes, e.g., "Patient reports dizziness"
    priority?: "low" | "medium" | "high"; // Urgency of the vital record
    timestamp: Date; // ISO date string
    updatedAt: Date; // Last updated timestamp
}