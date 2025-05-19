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
exports.VitalsService = void 0;
const model_1 = require("./model");
const model_2 = require("../user/model");
const error_1 = require("../../utils/error");
const notifier_1 = require("../../utils/notifier");
const mongoose_1 = require("mongoose");
// Access the global io instance
const io = global.io;
class VitalsService {
    createVital(data) {
        return __awaiter(this, void 0, void 0, function* () {
            const vital = yield model_1.VitalModel.create(data);
            yield this.checkThresholds(vital);
            return vital;
        });
    }
    getVitalsByPatientId(patientId, query) {
        return __awaiter(this, void 0, void 0, function* () {
            const { search, page = 1, limit = 10 } = query;
            const filters = { patientId };
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
            const totalVitals = yield model_1.VitalModel.countDocuments(filters);
            let vitalsQuery = model_1.VitalModel.find(filters)
                .sort({ createdAt: -1 }) // newest first
                .populate("patientId", "name email _id")
                .skip(skip)
                .limit(limitNumber);
            const vitals = yield vitalsQuery;
            const meta = {
                total: totalVitals,
                page: pageNumber,
                limit: limitNumber,
                totalPages: Math.ceil(totalVitals / limitNumber),
            };
            return { vitals, meta };
        });
    }
    getVitalsByDoctorId(doctorId, query) {
        return __awaiter(this, void 0, void 0, function* () {
            const { search, page = 1, limit = 10 } = query;
            const filters = { doctorId };
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
            const totalVitals = yield model_1.VitalModel.countDocuments(filters);
            let vitalsQuery = model_1.VitalModel.find(filters)
                .sort({ createdAt: -1 })
                .populate("patientId", "name email _id")
                .skip(skip)
                .limit(limitNumber);
            const vitals = yield vitalsQuery;
            const meta = {
                total: totalVitals,
                page: pageNumber,
                limit: limitNumber,
                totalPages: Math.ceil(totalVitals / limitNumber),
            };
            return { vitals, meta };
        });
    }
    getPatientsByDoctorId(doctorId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // Validate doctorId as a valid ObjectId
                if (!mongoose_1.Types.ObjectId.isValid(doctorId)) {
                    throw new Error('Invalid doctorId');
                }
                // Use aggregation to get distinct patientIds for a given doctorId
                const patients = yield model_1.VitalModel.aggregate([
                    { $match: { doctorId: new mongoose_1.Types.ObjectId(doctorId) } },
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
            }
            catch (error) {
                throw new Error(error instanceof Error ? error.message : 'Failed to fetch patients');
            }
        });
    }
    ;
    getVitalById(id) {
        return __awaiter(this, void 0, void 0, function* () {
            const vital = yield model_1.VitalModel.findById(id).populate('patientId');
            if (!vital)
                throw new error_1.AppError('Vital not found', 404);
            return vital;
        });
    }
    updateVital(id, data) {
        return __awaiter(this, void 0, void 0, function* () {
            const vital = yield model_1.VitalModel.findByIdAndUpdate(id, data, { new: true });
            if (!vital)
                throw new error_1.AppError('Vital not found', 404);
            yield this.checkThresholds(vital);
            return vital;
        });
    }
    deleteVital(id) {
        return __awaiter(this, void 0, void 0, function* () {
            yield model_1.VitalModel.findByIdAndDelete(id);
        });
    }
    checkThresholds(vital) {
        return __awaiter(this, void 0, void 0, function* () {
            if (vital.heartRate && vital.heartRate > 100) {
                // Notify all doctors connected to their rooms:
                const doctors = yield model_2.UserModel.find({ role: 'doctor' });
                for (const doctor of doctors) {
                    io.to(`user:${doctor._id.toString()}`).emit('vital:alert', {
                        patientId: vital.patientId,
                        message: `High heart rate detected: ${vital.heartRate} bpm`,
                    });
                    yield (0, notifier_1.sendNotification)(doctor.email, `High heart rate detected for patient ${vital.patientId}: ${vital.heartRate} bpm`);
                }
            }
        });
    }
}
exports.VitalsService = VitalsService;
