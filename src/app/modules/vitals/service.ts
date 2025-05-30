import mongoose, { Types, Document } from "mongoose";
import { VitalModel } from './model';
import { UserModel } from '../user/model';
import { Vital } from './interface';
import { AppError, NotFoundError } from '../../utils/error';
import { sendNotification } from '../../utils/notifier';
import { User } from '../user/interface';

// Access the global io instance
const io = (global as any).io;

// Define interfaces for request data
interface Prescription {
    medication: string;
    brandName?: string;
    dosage: string;
    duration: string;
    instructions?: string;
}

interface LabTest {
    testName: string;
    urgency: "routine" | "urgent";
    notes?: string;
    scheduledDate?: string;
    labLocation?: string;
    status?: "pending" | "completed" | "cancelled";
    resultLink?: string;
    physicianNote?: string;
}

export class VitalsService {
    async createVital(data: Partial<Vital>): Promise<Vital> {
        try {
            const vital = await VitalModel.create(data);
            try {
                await this.checkThresholds(vital);
            } catch (error: any) {
                console.error('Error in checkThresholds during createVital:', error.message);
                // Continue to return the vital
            }
            return vital;
        } catch (error: any) {
            console.error('Error in createVital:', error.message, error);
            throw new AppError(error.message || 'Failed to create vital', 500);
        }
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
                        name: '$patient.name',
                        email: '$patient.email',
                        avatar: '$patient.avatar',
                    },
                },
            ]);
            

            return patients;
        } catch (error) {
            throw new Error(error instanceof Error ? error.message : 'Failed to fetch patients');
        }
    }

    async getVitalById(id: string): Promise<Vital | null> {
        console.log(id);
        const vital = await VitalModel.findById(id)
            .populate('patientId')
            .populate('doctorId');
        if (!vital) throw new AppError('Vital not found', 404);
        return vital;
    }

    async updateVital(id: string, data: Partial<Vital>): Promise<Vital | null> {
        const vital = await VitalModel.findByIdAndUpdate(id, data, { new: true });
        if (!vital) throw new AppError('Vital not found', 404);
        await this.checkThresholds(vital);
        return vital;
    }
    async addRecommendation(id: string, data: Partial<Vital>): Promise<Vital | null> {
        const vital = await VitalModel.findByIdAndUpdate(
            id,
            { 'feedback.recommendations': data },
            { new: true }
        );
        if (!vital) throw new AppError('Vital not found', 404);
        return vital;
    }

    async deleteVital(id: string): Promise<void> {
        await VitalModel.findByIdAndDelete(id);
    }

    private async checkThresholds(vital: Vital): Promise<void> {
        try {
            // Log vital details for debugging
            console.log('checkThresholds called for vital:', {
                id: vital._id.toString(),
                heartRate: vital.heartRate,
                bloodPressure: vital.bloodPressure,
                doctorId: vital.doctorId,
            });

            // Skip if no doctorId is provided
            if (!vital.doctorId) {
                console.log('No doctorId provided in vital; skipping notifications');
                return;
            }

            // Find the specific doctor
            const doctor = await UserModel.findById(vital.doctorId);
            if (!doctor || doctor.role !== 'doctor') {
                console.warn(`Doctor with ID ${vital.doctorId} not found or not a doctor`);
                return;
            }

            console.log('Found doctor:', { id: doctor._id.toString(), email: doctor.email });

            // Validate email
            if (!doctor.email || typeof doctor.email !== 'string' || !doctor.email.includes('@')) {
                console.warn(`Invalid or missing email for doctor ${doctor._id.toString()}: ${doctor.email}`);
                return;
            }

            // Validate io
            const io = (global as any).io;
            if (!io) {
                console.error('Socket.IO instance is undefined; cannot emit vital:new');
                // Proceed with email notification
            }

            // Check for critical heart rate
            if (vital.heartRate && vital.heartRate > 100) {
                const notification = {
                    _id: new mongoose.Types.ObjectId().toString(),
                    message: `High heart rate detected: ${vital.heartRate} bpm`,
                    timestamp: new Date().toISOString(),
                    acknowledged: false,
                    type: 'vital_alert',
                };

                // Emit Socket.IO event
                if (io) {
                    try {
                        console.log(`Emitting vital:new to user:${doctor._id.toString()}`);
                        io.to(`user:${doctor._id.toString()}`).emit('vital:new', {
                            sender: vital.patientId,
                            vitalId: vital._id.toString(),
                            vital,
                            notification,
                        });
                        console.log(`Emitted vital:new to user:${doctor._id.toString()}`);
                    } catch (socketError: any) {
                        console.error(`Failed to emit vital:new to user:${doctor._id.toString()}:`, socketError.message);
                    }
                }

                // Send email notification
                try {
                    console.log(`Sending email to ${doctor.email} for vital ${vital._id.toString()}`);
                    await sendNotification(
                        doctor.email,
                        `High heart rate detected for patient ${vital.patientId}: ${vital.heartRate} bpm`
                    );
                    console.log(`Email sent successfully to ${doctor.email}`);
                } catch (emailError: any) {
                    console.error(`Failed to send email to ${doctor.email} for vital ${vital._id.toString()}:`, emailError.message);
                }
            }

            // Check for critical blood pressure
            if (vital.bloodPressure && (vital.bloodPressure.systolic > 140 || vital.bloodPressure.diastolic > 90)) {
                const notification = {
                    _id: new mongoose.Types.ObjectId().toString(),
                    message: `Critical BP detected: ${vital.bloodPressure.systolic}/${vital.bloodPressure.diastolic} mmHg`,
                    timestamp: new Date().toISOString(),
                    acknowledged: false,
                    type: 'vital_alert',
                };

                // Emit Socket.IO event
                if (io) {
                    try {
                        console.log(`Emitting vital:new to user:${doctor._id.toString()}`);
                        io.to(`user:${doctor._id.toString()}`).emit('vital:new', {
                            sender: vital.patientId,
                            vitalId: vital._id.toString(),
                            vital,
                            notification,
                        });
                        console.log(`Emitted vital:new to user:${doctor._id.toString()}`);
                    } catch (socketError: any) {
                        console.error(`Failed to emit vital:new to user:${doctor._id.toString()}:`, socketError.message);
                    }
                }

                // Send email notification
                try {
                    console.log(`Sending email to ${doctor.email} for vital ${vital._id.toString()}`);
                    await sendNotification(
                        doctor.email,
                        `Critical BP detected for patient ${vital.patientId}: ${vital.bloodPressure.systolic}/${vital.bloodPressure.diastolic} mmHg`
                    );
                    console.log(`Email sent successfully to ${doctor.email}`);
                } catch (emailError: any) {
                    console.error(`Failed to send email to ${doctor.email} for vital ${vital._id.toString()}:`, emailError.message);
                }
            }
        } catch (error: any) {
            console.error('Error in checkThresholds:', error.message, error);
            // Do not throw; allow createVital to continue
        }
    }

    // Prescription operations
    async addPrescription(vitalId: string, data: Prescription): Promise<Vital> {
        if (!Types.ObjectId.isValid(vitalId)) {
            throw new NotFoundError("Invalid vital ID");
        }

        const updateQuery = { $push: { "feedback.prescriptions": data } };
        const vital = await VitalModel.findByIdAndUpdate(vitalId, updateQuery, { new: true });

        if (!vital) {
            throw new NotFoundError("Vital not found");
        }
        return vital;
    }

    async deletePrescription(vitalId: string, match: Partial<Prescription>): Promise<Vital> {
        if (!Types.ObjectId.isValid(vitalId)) {
            throw new NotFoundError("Invalid vital ID");
        }

        const updateQuery = { $pull: { "feedback.prescriptions": match } };
        const vital = await VitalModel.findByIdAndUpdate(vitalId, updateQuery, { new: true });

        if (!vital) {
            throw new NotFoundError("Vital not found");
        }

        await this.checkThresholds(vital);
        return vital;
    }

    async updatePrescription(vitalId: string, match: Partial<Prescription>, update: Partial<Prescription>): Promise<Vital> {
        if (!Types.ObjectId.isValid(vitalId)) {
            throw new NotFoundError("Invalid vital ID");
        }

        const arrayFilters: any[] = [];
        const filterConditions: Record<string, any> = {};

        Object.entries(match).forEach(([key, value]) => {
            filterConditions[`elem.${key}`] = value;
        });

        arrayFilters.push(filterConditions);

        const updateQuery = {
            $set: { "feedback.prescriptions.$[elem]": { ...match, ...update } }
        };

        const vital = await VitalModel.findByIdAndUpdate(vitalId, updateQuery, {
            new: true,
            arrayFilters,
        });

        if (!vital) {
            throw new NotFoundError("Vital not found");
        }

        await this.checkThresholds(vital);
        return vital;
    }

    // Lab Test operations
    async addLabTest(vitalId: string, data: LabTest): Promise<Vital> {
        if (!Types.ObjectId.isValid(vitalId)) {
            throw new NotFoundError("Invalid vital ID");
        }
        const updateQuery = { $push: { "feedback.labTests": data } };
        const vital = await VitalModel.findByIdAndUpdate(vitalId, updateQuery, { new: true });

        if (!vital) {
            throw new NotFoundError("Vital not found");
        }

        return vital;
    }

    async deleteLabTest(vitalId: string, match: Partial<LabTest>): Promise<Vital> {
        if (!Types.ObjectId.isValid(vitalId)) {
            throw new NotFoundError("Invalid vital ID");
        }

        const updateQuery = { $pull: { "feedback.labTests": match } };
        const vital = await VitalModel.findByIdAndUpdate(vitalId, updateQuery, { new: true });

        if (!vital) {
            throw new NotFoundError("Vital not found");
        }

        return vital;
    }

    async updateLabTest(vitalId: string, match: Partial<LabTest>, update: Partial<LabTest>): Promise<Vital> {
        if (!Types.ObjectId.isValid(vitalId)) {
            throw new NotFoundError("Invalid vital ID");
        }

        const arrayFilters: any[] = [];
        const filterConditions: Record<string, any> = {};

        Object.entries(match).forEach(([key, value]) => {
            filterConditions[`elem.${key}`] = value;
        });

        arrayFilters.push(filterConditions);

        const updateQuery = {
            $set: { "feedback.labTests.$[elem]": { ...match, ...update } }
        };

        const vital = await VitalModel.findByIdAndUpdate(vitalId, updateQuery, {
            new: true,
            arrayFilters,
        });

        if (!vital) {
            throw new NotFoundError("Vital not found");
        }

        return vital;
    }
}