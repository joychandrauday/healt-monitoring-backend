"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppointmentService = void 0;
// appointment/service.ts
const model_1 = require("./model");
const model_2 = require("../user/model");
const error_1 = require("../../utils/error");
const notifier_1 = require("../../utils/notifier");
class AppointmentService {
    createAppointment(data) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!data.appointmentDate || !data.duration || !data.type || !data.reason || !data.vital) {
                throw new error_1.AppError('Missing required fields', 400);
            }
            const appointment = yield model_1.Appointment.create(Object.assign(Object.assign({}, data), { payment: data.payment ? Object.assign(Object.assign({}, data.payment), { currency: data.payment.currency || 'USD', status: data.payment.status || 'pending' }) : undefined }));
            const doctor = yield model_2.UserModel.findById(data.doctorId).select('email');
            if (doctor && data.appointmentDate) {
                const dateObj = new Date(data.appointmentDate);
                yield (0, notifier_1.sendNotification)(doctor.email, `New appointment request for ${dateObj.toDateString()} at ${dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`);
            }
            else {
                console.warn('No doctor found or no appointment date provided');
            }
            return appointment;
        });
    }
    getAppointments(query) {
        return __awaiter(this, void 0, void 0, function* () {
            const { status, startDate, endDate, type, page = 1, limit = 10 } = query;
            const filters = {};
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
            const total = yield model_1.Appointment.countDocuments(filters);
            const appointments = yield model_1.Appointment.find(filters)
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
        });
    }
    getAppointmentsByUserId(userId, query) {
        return __awaiter(this, void 0, void 0, function* () {
            const { status, startDate, endDate, type, page = 1, limit = 10 } = query;
            const filters = {
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
            const total = yield model_1.Appointment.countDocuments(filters);
            const appointments = yield model_1.Appointment.find(filters)
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
        });
    }
    getSingleAppointment(id) {
        return __awaiter(this, void 0, void 0, function* () {
            const appointment = yield model_1.Appointment.findById(id)
                .populate('patientId')
                .populate('doctorId')
                .populate('vital');
            if (!appointment)
                throw new error_1.AppError('Appointment not found', 404);
            return appointment;
        });
    }
    updateAppointment(id, data) {
        return __awaiter(this, void 0, void 0, function* () {
            // if (data.status === 'confirmed') {
            //     if (!data.payment || !data.payment.amount || data.payment.amount <= 0) {
            //         throw new AppError('Valid payment amount is required to confirm appointment', 400);
            //     }
            //     if (data.payment.status === 'completed' && !data.payment.transactionId) {
            //         throw new AppError('Transaction ID required for completed payment status', 400);
            //     }
            // }
            const appointment = yield model_1.Appointment.findByIdAndUpdate(id, Object.assign(Object.assign({}, data), { updatedAt: new Date() }), { new: true });
            if (!appointment)
                throw new error_1.AppError('Appointment not found', 404);
            const patient = yield model_2.UserModel.findById(appointment.patientId).select('email');
            if (patient && data.status) {
                yield (0, notifier_1.sendNotification)(patient.email, `Appointment updated to ${data.status}`);
            }
            return appointment;
        });
    }
    deleteAppointment(id) {
        return __awaiter(this, void 0, void 0, function* () {
            const appointment = yield model_1.Appointment.findByIdAndDelete(id);
            if (!appointment)
                throw new error_1.AppError('Appointment not found', 404);
            const patient = yield model_2.UserModel.findById(appointment.patientId).select('email');
            if (patient) {
                yield (0, notifier_1.sendNotification)(patient.email, 'Appointment cancelled');
            }
        });
    }
}
exports.AppointmentService = AppointmentService;
