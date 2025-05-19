import { VitalModel } from './model';
import { UserModel } from '../user/model';
import { Vital } from './interface';
import { AppError } from '../../utils/error';
import { sendNotification } from '../../utils/notifier';
import { User } from '../user/interface';
import { Types } from 'mongoose';

// Access the global io instance
const io = (global as any).io;

export class VitalsService {
    async createVital(data: Partial<Vital>): Promise<Vital> {
        const vital = await VitalModel.create(data);
        await this.checkThresholds(vital);
        return vital;
    }

    async getVitalsByPatientId(patientId: string, query: any): Promise<{ vitals: Vital[]; meta: any }> {
        const { search, page = 1, limit = 10 } = query;

        const filters: Record<string, any> = { patientId };

        if (search) {
            const searchRegex = new RegExp(search, "i");
            filters.$or = [
                { heartRate: { $regex: searchRegex } },
                { bloodPressure: { $regex: searchRegex } },
                { note: { $regex: searchRegex } }
            ];
        }

        const pageNumber = Number(page) > 0 ? Number(page) : 1;
        const limitNumber = Number(limit) > 0 ? Number(limit) : 10;
        const skip = (pageNumber - 1) * limitNumber;

        const totalVitals = await VitalModel.countDocuments(filters);

        let vitalsQuery = VitalModel.find(filters)
            .sort({ createdAt: -1 }) // newest first
            .populate("patientId", "name email _id")
            .skip(skip)
            .limit(limitNumber);

        const vitals = await vitalsQuery;

        const meta = {
            total: totalVitals,
            page: pageNumber,
            limit: limitNumber,
            totalPages: Math.ceil(totalVitals / limitNumber),
        };

        return { vitals, meta };
    }
    async getVitalsByDoctorId(doctorId: string, query: any): Promise<{ vitals: Vital[]; meta: any }> {
        const { search, page = 1, limit = 10 } = query;

        const filters: Record<string, any> = { doctorId };
        console.log(doctorId);
        if (search) {
            const searchRegex = new RegExp(search, "i");
            filters.$or = [
                { heartRate: { $regex: searchRegex } },
                { bloodPressure: { $regex: searchRegex } },
                { note: { $regex: searchRegex } }
            ];
        }

        const pageNumber = Number(page) > 0 ? Number(page) : 1;
        const limitNumber = Number(limit) > 0 ? Number(limit) : 10;
        const skip = (pageNumber - 1) * limitNumber;

        const totalVitals = await VitalModel.countDocuments(filters);

        let vitalsQuery = VitalModel.find(filters)
            .sort({ createdAt: -1 })
            .populate("patientId", "name email _id")
            .skip(skip)
            .limit(limitNumber);

        const vitals = await vitalsQuery;

        const meta = {
            total: totalVitals,
            page: pageNumber,
            limit: limitNumber,
            totalPages: Math.ceil(totalVitals / limitNumber),
        };

        return { vitals, meta };
    }

    async getPatientsByDoctorId(doctorId: string): Promise<User[]> {
        try {
            // Validate doctorId as a valid ObjectId
            if (!Types.ObjectId.isValid(doctorId)) {
                throw new Error('Invalid doctorId');
            }

            // Use aggregation to get distinct patientIds for a given doctorId
            const patients = await VitalModel.aggregate<User>([
                { $match: { doctorId: new Types.ObjectId(doctorId) } },
                { $group: { _id: '$patientId' } },
                {
                    $lookup: {
                        from: 'users', // Assuming the User collection is named 'users'
                        localField: '_id',
                        foreignField: '_id',
                        as: 'patient',
                    },
                },
                { $unwind: '$patient' },
                {
                    $project: {
                        _id: '$patient._id',
                        name: '$patient.name', // Adjust fields based on your User schema
                        email: '$patient.email', // Include other fields as needed
                        avatar: '$patient.avatar', // Include other fields as needed
                    },
                },
            ]);

            return patients;
        } catch (error) {
            throw new Error(error instanceof Error ? error.message : 'Failed to fetch patients');
        }
    };
    async getVitalById(id: string): Promise<Vital | null> {
        const vital = await VitalModel.findById(id).populate('patientId');
        if (!vital) throw new AppError('Vital not found', 404);
        return vital;
    }

    async updateVital(id: string, data: Partial<Vital>): Promise<Vital | null> {
        const vital = await VitalModel.findByIdAndUpdate(id, data, { new: true });
        if (!vital) throw new AppError('Vital not found', 404);
        await this.checkThresholds(vital);
        return vital;
    }

    async deleteVital(id: string): Promise<void> {
        await VitalModel.findByIdAndDelete(id);
    }

    private async checkThresholds(vital: Vital): Promise<void> {
        if (vital.heartRate && vital.heartRate > 100) {
            // Notify all doctors connected to their rooms:
            const doctors = await UserModel.find({ role: 'doctor' });
            for (const doctor of doctors) {
                io.to(`user:${doctor._id.toString()}`).emit('vital:alert', {
                    patientId: vital.patientId,
                    message: `High heart rate detected: ${vital.heartRate} bpm`,
                });
                await sendNotification(
                    doctor.email,
                    `High heart rate detected for patient ${vital.patientId}: ${vital.heartRate} bpm`
                );
            }
        }
    }
}
