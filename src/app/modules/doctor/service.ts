import { AppError } from '../../utils/error';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { Meta, QueryParams } from '../../types';
import { Doctor } from './interface';
import { DoctorModel } from './model';
import { UserModel } from '../user/model'; // Assuming you have a UserModel

export class DoctorService {
    async registerDoctor(userId: string): Promise<{ doctor: Doctor; token: string }> {
        try {
            const user = await UserModel.findById(userId);
            if (!user) throw new AppError('User not found', 404);

            const existingDoctor = await DoctorModel.findOne({ user: userId });
            if (existingDoctor) throw new AppError('Doctor already registered with this user', 400);

            const doctor = await DoctorModel.create({
                user: user._id,
                major: "", // 
                qualifications: [],
                experience: 1,
                bio: "I am a doctor",
                availableDays: ["Monday", "Wednesday", "Friday"],
                availableTime: {
                    from: "10:00 AM",
                    to: "4:00 PM"
                }
            });

            await UserModel.findByIdAndUpdate(
                userId,
                { role: 'doctor' },
                { new: true }
            );

            const token = jwt.sign(
                { id: user._id, email: user.email, role: 'doctor' },
                process.env.JWT_SECRET!,
                { expiresIn: '1d' }
            );

            return { doctor, token };

        } catch (error: any) {
            console.error("❌ Error in registerDoctor:", error);
            throw new AppError(error.message || "Something went wrong", 500);
        }
    }
    async loginDoctor(email: string, password: string): Promise<{ doctor: Doctor; token: string }> {
        const user = await UserModel.findOne({ email });
        if (!user || !(await bcrypt.compare(password, user.password))) {
            throw new AppError('Invalid credentials', 401);
        }

        const doctor = await DoctorModel.findOne({ user: user._id });
        if (!doctor) throw new AppError('Doctor profile not found', 404);

        const token = jwt.sign(
            { id: user._id, email: user.email, role: 'doctor' },
            process.env.JWT_SECRET!,
            { expiresIn: '1d' }
        );

        return { doctor, token };
    }
    async getDoctorById(id: string): Promise<Doctor | null> {
        const doctor = await DoctorModel.findOne({ user: id }) // user is ObjectId
            .populate('user', '-password') // populate the user field, exclude password
            .select('-reviews'); // optionally exclude reviews

        if (!doctor) throw new AppError('Doctor not found', 404);

        return doctor;
    }



    async updateDoctor(id: string, data: Partial<Doctor>): Promise<Doctor | null> {
        const doctor = await DoctorModel.findByIdAndUpdate(id, data, { new: true }).select('-reviews');
        if (!doctor) throw new AppError('Doctor not found', 404);
        return doctor;
    }

    async deleteDoctor(id: string): Promise<void> {
        const doctor = await DoctorModel.findByIdAndDelete(id);
        if (!doctor) throw new AppError('Doctor not found', 404);
    }

    async getAllDoctors(query: QueryParams): Promise<{ doctors: Doctor[]; meta: Meta }> {
        const { search, page = 1, limit = 10 } = query;
        const filters: Record<string, any> = {};

        if (search) {
            const regex = new RegExp(search, 'i');
            filters.$or = [{ major: regex }];
        }

        const skip = (Number(page) - 1) * Number(limit);
        const total = await DoctorModel.countDocuments(filters);
        const doctors = await DoctorModel.find(filters)
            .populate('user', '-password')
            .select('-reviews')
            .skip(skip)
            .limit(Number(limit))
            .sort({ createdAt: -1 });

        const meta = {
            total,
            page: Number(page),
            limit: Number(limit),
            totalPages: Math.ceil(total / Number(limit)),
        };

        return { doctors, meta };
    }
}
