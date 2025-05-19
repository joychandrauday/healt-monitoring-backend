
import { Types } from 'mongoose';

export interface BloodPressure {
    systolic: number;
    diastolic: number;
}

export interface Injury {
    type: 'internal' | 'external' | 'none';
    description?: string;
    severity?: 'mild' | 'moderate' | 'severe';
}

export interface Analytics {
    patientId: Types.ObjectId | string;
    period: 'daily' | 'weekly' | 'monthly' | 'custom' | string;
    data: {
        heartRate: number[];
        bloodPressure: BloodPressure[];
        glucoseLevel: number[];
        oxygenSaturation: number[];
        temperature: number[];
        respiratoryRate: number[];
        painLevel: number[];
        injury: Injury[];
        visuals: string[];
        timestamps: Date[];
    };
}
