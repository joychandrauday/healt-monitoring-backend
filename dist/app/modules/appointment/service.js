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
const model_1 = require("./model");
const model_2 = require("../user/model");
const error_1 = require("../../utils/error");
const notifier_1 = require("../../utils/notifier");
class AppointmentService {
    createAppointment(data) {
        return __awaiter(this, void 0, void 0, function* () {
            const appointment = yield model_1.AppointmentModel.create(data);
            const doctor = yield model_2.UserModel.findById(data.doctorId).select('email');
            if (doctor) {
                yield (0, notifier_1.sendNotification)(doctor.email, 'New appointment request');
            }
            return appointment;
        });
    }
    getAppointments(query) {
        return __awaiter(this, void 0, void 0, function* () {
            const { status, startDate, endDate, page = 1, limit = 10 } = query;
            const filters = {};
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
            const total = yield model_1.AppointmentModel.countDocuments(filters);
            const appointments = yield model_1.AppointmentModel.find(filters)
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
        });
    }
    getAppointmentsByUserId(userId, query) {
        return __awaiter(this, void 0, void 0, function* () {
            const { status, startDate, endDate, page = 1, limit = 10 } = query;
            const filters = {
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
            const total = yield model_1.AppointmentModel.countDocuments(filters);
            const appointments = yield model_1.AppointmentModel.find(filters)
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
        });
    }
    updateAppointment(id, data) {
        return __awaiter(this, void 0, void 0, function* () {
            const appointment = yield model_1.AppointmentModel.findByIdAndUpdate(id, data, { new: true });
            if (!appointment)
                throw new error_1.AppError('Appointment not found', 404);
            const patient = yield model_2.UserModel.findById(appointment.patientId).select('email');
            if (patient) {
                yield (0, notifier_1.sendNotification)(patient.email, `Appointment ${data.status}`);
            }
            return appointment;
        });
    }
    deleteAppointment(id) {
        return __awaiter(this, void 0, void 0, function* () {
            const appointment = yield model_1.AppointmentModel.findByIdAndDelete(id);
            if (!appointment)
                throw new error_1.AppError('Appointment not found', 404);
        });
    }
}
exports.AppointmentService = AppointmentService;
