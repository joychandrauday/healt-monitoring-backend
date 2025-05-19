import { VitalModel } from '../vitals/model';
import { Analytics } from './interface';
import { AppError } from '../../utils/error';

export class AnalyticsService {
    async getVitalTrends(patientId: string, period: string): Promise<Analytics> {
        const vitals = await VitalModel.find({ patientId }).sort({ timestamp: 1 });
        if (!vitals.length) throw new AppError('No vitals found', 404);
        const data: Analytics = {
            patientId,
            period: period,
            data: {
                heartRate: vitals.map(v => v.heartRate).filter(Boolean) as number[],
                bloodPressure: vitals
                    .map(v => v.bloodPressure)
                    .filter(Boolean) as { systolic: number; diastolic: number }[],
                glucoseLevel: vitals.map(v => v.glucoseLevel).filter(Boolean) as number[],
                oxygenSaturation: vitals.map(v => v.oxygenSaturation).filter(Boolean) as number[],
                temperature: vitals.map(v => v.temperature).filter(Boolean) as number[],
                respiratoryRate: vitals.map(v => v.respiratoryRate).filter(Boolean) as number[],
                painLevel: vitals.map(v => v.painLevel).filter(Boolean) as number[],
                injury: vitals
                    .map(v => v.injury)
                    .filter(i => i && i.type !== 'none') as {
                        type: 'internal' | 'external' | 'none';
                        description?: string;
                        severity?: 'mild' | 'moderate' | 'severe';
                    }[],
                visuals: vitals.flatMap(v => v.visuals || []),
                timestamps: vitals.map(v => v.timestamp),
            },
        };

        return data;
    }
    async generateReport(patientId: string, period: string): Promise<Analytics> {
        console.log(patientId);
        return this.getVitalTrends(patientId, period);
    }
}