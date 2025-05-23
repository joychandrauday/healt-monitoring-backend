// appointment/service.ts
import { Appointment } from './model';
import { UserModel } from '../user/model';
import { IAppointment } from './interface';
import { AppError } from '../../utils/error';
import { sendNotification } from '../../utils/notifier';
import { QueryParams } from '../../types';

export class AppointmentService {
    async createAppointment(data: Partial<IAppointment>): Promise<IAppointment> {
        if (!data.appointmentDate || !data.duration || !data.type || !data.reason || !data.vital) {
            throw new AppError('Missing required fields', 400);
        }
        const appointment = await Appointment.create({
            ...data,
            payment: data.payment ? {
                ...data.payment,
                currency: data.payment.currency || 'USD',
                status: data.payment.status || 'pending',
            } : undefined,
        });
        const doctor = await UserModel.findById(data.doctorId).select('email');
        if (doctor && data.appointmentDate) {
            const dateObj = new Date(data.appointmentDate);
            await sendNotification(
                doctor.email,
                `New appointment request for ${dateObj.toDateString()} at ${dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
            );
        } else {
            console.warn('No doctor found or no appointment date provided');
        }
        return appointment;
    }

    async getAppointments(query: QueryParams): Promise<{ appointments: IAppointment[]; meta: any }> {
        const { status, startDate, endDate, type, page = 1, limit = 10 } = query;

        const filters: Record<string, any> = {};

        if (status) {
            filters.status = status;
        }
        if (type) {
            filters.type = type;
        }
        if (startDate || endDate) {
            filters.appointmentDate = {};
            if (startDate) {
                filters.appointmentDate.$gte = new Date(startDate);
            }
            if (endDate) {
                filters.appointmentDate.$lte = new Date(endDate);
            }
        }

        const pageNumber = Number(page) > 0 ? Number(page) : 1;
        const limitNumber = Number(limit) > 0 ? Number(limit) : 10;
        const skip = (pageNumber - 1) * limitNumber;

        const total = await Appointment.countDocuments(filters);

        const appointments = await Appointment.find(filters)
            .sort({ appointmentDate: -1, appointmentTime: -1 })
            .skip(skip)
            .limit(limitNumber)
            .populate('patientId', 'name email')
            .populate('doctorId', 'name email')
            .populate('vital');

        const meta = {
            total,
            page: pageNumber,
            limit: limitNumber,
            totalPages: Math.ceil(total / limitNumber),
        };

        return { appointments, meta };
    }

    async getAppointmentsByUserId(userId: string, query: QueryParams): Promise<{ appointments: IAppointment[]; meta: any }> {
        const { status, startDate, endDate, type, page = 1, limit = 10 } = query;

        const filters: Record<string, any> = {
            $or: [{ patientId: userId }, { doctorId: userId }],
        };

        if (status) {
            filters.status = status;
        }
        if (type) {
            filters.type = type;
        }
        if (startDate || endDate) {
            filters.appointmentDate = {};
            if (startDate) {
                filters.appointmentDate.$gte = new Date(startDate);
            }
            if (endDate) {
                filters.appointmentDate.$lte = new Date(endDate);
            }
        }

        const pageNumber = Number(page) > 0 ? Number(page) : 1;
        const limitNumber = Number(limit) > 0 ? Number(limit) : 10;
        const skip = (pageNumber - 1) * limitNumber;

        const total = await Appointment.countDocuments(filters);

        const appointments = await Appointment.find(filters)
            .sort({ appointmentDate: -1, appointmentTime: -1 })
            .skip(skip)
            .limit(limitNumber)
            .populate('patientId')
            .populate('doctorId')
            .populate('vital');

        const meta = {
            total,
            page: pageNumber,
            limit: limitNumber,
            totalPages: Math.ceil(total / limitNumber),
        };

        return { appointments, meta };
    }
    async getSingleAppointment(id: string): Promise<IAppointment | null> {

        const appointment = await Appointment.findById(id)
            .populate('patientId')
            .populate('doctorId')
            .populate('vital');
        if (!appointment) throw new AppError('Appointment not found', 404);
        return appointment;
    }

    async updateAppointment(id: string, data: Partial<IAppointment>): Promise<IAppointment | null> {
        // if (data.status === 'confirmed') {
        //     if (!data.payment || !data.payment.amount || data.payment.amount <= 0) {
        //         throw new AppError('Valid payment amount is required to confirm appointment', 400);
        //     }
        //     if (data.payment.status === 'completed' && !data.payment.transactionId) {
        //         throw new AppError('Transaction ID required for completed payment status', 400);
        //     }
        // }
        const appointment = await Appointment.findByIdAndUpdate(
            id,
            { ...data, updatedAt: new Date() },
            { new: true }
        );
        if (!appointment) throw new AppError('Appointment not found', 404);
        const patient = await UserModel.findById(appointment.patientId).select('email');
        if (patient && data.status) {
            await sendNotification(patient.email, `Appointment updated to ${data.status}`);
        }
        return appointment;
    }

    async deleteAppointment(id: string): Promise<void> {
        const appointment = await Appointment.findByIdAndDelete(id);
        if (!appointment) throw new AppError('Appointment not found', 404);
        const patient = await UserModel.findById(appointment.patientId).select('email');
        if (patient) {
            await sendNotification(patient.email, 'Appointment cancelled');
        }
    }
}