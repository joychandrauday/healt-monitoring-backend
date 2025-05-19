import { AppointmentModel } from './model';
import { UserModel } from '../user/model';
import { Appointment } from './interface';
import { AppError } from '../../utils/error';
import { sendNotification } from '../../utils/notifier';
import { QueryParams } from '../../types';

export class AppointmentService {
    async createAppointment(data: Partial<Appointment>): Promise<Appointment> {
        const appointment = await AppointmentModel.create(data);
        const doctor = await UserModel.findById(data.doctorId).select('email');
        if (doctor) {
            await sendNotification(doctor.email, 'New appointment request');
        }
        return appointment;
    }

    async getAppointments(query: QueryParams): Promise<{ appointments: Appointment[]; meta: any }> {
        const { status, startDate, endDate, page = 1, limit = 10 } = query;

        const filters: Record<string, any> = {};

        if (status) {
            filters.status = status;
        }

        if (startDate || endDate) {
            filters.createdAt = {};
            if (startDate) {
                filters.createdAt.$gte = new Date(startDate);
            }
            if (endDate) {
                filters.createdAt.$lte = new Date(endDate);
            }
        }

        const pageNumber = Number(page) > 0 ? Number(page) : 1;
        const limitNumber = Number(limit) > 0 ? Number(limit) : 10;
        const skip = (pageNumber - 1) * limitNumber;

        const total = await AppointmentModel.countDocuments(filters);

        const appointments = await AppointmentModel.find(filters)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limitNumber)
            .populate('patientId')
            .populate('doctorId');

        const meta = {
            total,
            page: pageNumber,
            limit: limitNumber,
            totalPages: Math.ceil(total / limitNumber),
        };

        return { appointments, meta };
    }
    async getAppointmentsByUserId(userId: string, query: QueryParams): Promise<{ appointments: Appointment[]; meta: any }> {
        const { status, startDate, endDate, page = 1, limit = 10 } = query;

        const filters: Record<string, any> = {
            $or: [{ patientId: userId }, { doctorId: userId }],
        };

        if (status) {
            filters.status = status;
        }

        if (startDate || endDate) {
            filters.createdAt = {};
            if (startDate) {
                filters.createdAt.$gte = new Date(startDate);
            }
            if (endDate) {
                filters.createdAt.$lte = new Date(endDate);
            }
        }

        const pageNumber = Number(page) > 0 ? Number(page) : 1;
        const limitNumber = Number(limit) > 0 ? Number(limit) : 10;
        const skip = (pageNumber - 1) * limitNumber;

        const total = await AppointmentModel.countDocuments(filters);

        const appointments = await AppointmentModel.find(filters)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limitNumber)
            .populate('patientId')
            .populate('doctorId');

        const meta = {
            total,
            page: pageNumber,
            limit: limitNumber,
            totalPages: Math.ceil(total / limitNumber),
        };

        return { appointments, meta };
    }

    async updateAppointment(id: string, data: Partial<Appointment>): Promise<Appointment | null> {
        const appointment = await AppointmentModel.findByIdAndUpdate(id, data, { new: true });
        if (!appointment) throw new AppError('Appointment not found', 404);
        const patient = await UserModel.findById(appointment.patientId).select('email');
        if (patient) {
            await sendNotification(patient.email, `Appointment ${data.status}`);
        }
        return appointment;
    }

    async deleteAppointment(id: string): Promise<void> {
        const appointment = await AppointmentModel.findByIdAndDelete(id);
        if (!appointment) throw new AppError('Appointment not found', 404);
    }
}