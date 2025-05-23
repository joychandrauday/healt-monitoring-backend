"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
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
const mongoose_1 = __importStar(require("mongoose"));
const model_1 = require("./model");
const model_2 = require("../user/model");
const error_1 = require("../../utils/error");
const notifier_1 = require("../../utils/notifier");
// Access the global io instance
const io = global.io;
class VitalsService {
    createVital(data) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const vital = yield model_1.VitalModel.create(data);
                try {
                    yield this.checkThresholds(vital);
                }
                catch (error) {
                    console.error('Error in checkThresholds during createVital:', error.message);
                    // Continue to return the vital
                }
                return vital;
            }
            catch (error) {
                console.error('Error in createVital:', error.message, error);
                throw new error_1.AppError(error.message || 'Failed to create vital', 500);
            }
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
                            name: '$patient.name',
                            email: '$patient.email',
                            avatar: '$patient.avatar',
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
    getVitalById(id) {
        return __awaiter(this, void 0, void 0, function* () {
            console.log(id);
            const vital = yield model_1.VitalModel.findById(id)
                .populate('patientId')
                .populate('doctorId');
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
    addRecommendation(id, data) {
        return __awaiter(this, void 0, void 0, function* () {
            const vital = yield model_1.VitalModel.findByIdAndUpdate(id, { 'feedback.recommendations': data }, { new: true });
            if (!vital)
                throw new error_1.AppError('Vital not found', 404);
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
                const doctor = yield model_2.UserModel.findById(vital.doctorId);
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
                const io = global.io;
                if (!io) {
                    console.error('Socket.IO instance is undefined; cannot emit vital:new');
                    // Proceed with email notification
                }
                // Check for critical heart rate
                if (vital.heartRate && vital.heartRate > 100) {
                    const notification = {
                        _id: new mongoose_1.default.Types.ObjectId().toString(),
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
                        }
                        catch (socketError) {
                            console.error(`Failed to emit vital:new to user:${doctor._id.toString()}:`, socketError.message);
                        }
                    }
                    // Send email notification
                    try {
                        console.log(`Sending email to ${doctor.email} for vital ${vital._id.toString()}`);
                        yield (0, notifier_1.sendNotification)(doctor.email, `High heart rate detected for patient ${vital.patientId}: ${vital.heartRate} bpm`);
                        console.log(`Email sent successfully to ${doctor.email}`);
                    }
                    catch (emailError) {
                        console.error(`Failed to send email to ${doctor.email} for vital ${vital._id.toString()}:`, emailError.message);
                    }
                }
                // Check for critical blood pressure
                if (vital.bloodPressure && (vital.bloodPressure.systolic > 140 || vital.bloodPressure.diastolic > 90)) {
                    const notification = {
                        _id: new mongoose_1.default.Types.ObjectId().toString(),
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
                        }
                        catch (socketError) {
                            console.error(`Failed to emit vital:new to user:${doctor._id.toString()}:`, socketError.message);
                        }
                    }
                    // Send email notification
                    try {
                        console.log(`Sending email to ${doctor.email} for vital ${vital._id.toString()}`);
                        yield (0, notifier_1.sendNotification)(doctor.email, `Critical BP detected for patient ${vital.patientId}: ${vital.bloodPressure.systolic}/${vital.bloodPressure.diastolic} mmHg`);
                        console.log(`Email sent successfully to ${doctor.email}`);
                    }
                    catch (emailError) {
                        console.error(`Failed to send email to ${doctor.email} for vital ${vital._id.toString()}:`, emailError.message);
                    }
                }
            }
            catch (error) {
                console.error('Error in checkThresholds:', error.message, error);
                // Do not throw; allow createVital to continue
            }
        });
    }
    // Prescription operations
    addPrescription(vitalId, data) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!mongoose_1.Types.ObjectId.isValid(vitalId)) {
                throw new error_1.NotFoundError("Invalid vital ID");
            }
            const updateQuery = { $push: { "feedback.prescriptions": data } };
            const vital = yield model_1.VitalModel.findByIdAndUpdate(vitalId, updateQuery, { new: true });
            if (!vital) {
                throw new error_1.NotFoundError("Vital not found");
            }
            return vital;
        });
    }
    deletePrescription(vitalId, match) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!mongoose_1.Types.ObjectId.isValid(vitalId)) {
                throw new error_1.NotFoundError("Invalid vital ID");
            }
            const updateQuery = { $pull: { "feedback.prescriptions": match } };
            const vital = yield model_1.VitalModel.findByIdAndUpdate(vitalId, updateQuery, { new: true });
            if (!vital) {
                throw new error_1.NotFoundError("Vital not found");
            }
            yield this.checkThresholds(vital);
            return vital;
        });
    }
    updatePrescription(vitalId, match, update) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!mongoose_1.Types.ObjectId.isValid(vitalId)) {
                throw new error_1.NotFoundError("Invalid vital ID");
            }
            const arrayFilters = [];
            const filterConditions = {};
            Object.entries(match).forEach(([key, value]) => {
                filterConditions[`elem.${key}`] = value;
            });
            arrayFilters.push(filterConditions);
            const updateQuery = {
                $set: { "feedback.prescriptions.$[elem]": Object.assign(Object.assign({}, match), update) }
            };
            const vital = yield model_1.VitalModel.findByIdAndUpdate(vitalId, updateQuery, {
                new: true,
                arrayFilters,
            });
            if (!vital) {
                throw new error_1.NotFoundError("Vital not found");
            }
            yield this.checkThresholds(vital);
            return vital;
        });
    }
    // Lab Test operations
    addLabTest(vitalId, data) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!mongoose_1.Types.ObjectId.isValid(vitalId)) {
                throw new error_1.NotFoundError("Invalid vital ID");
            }
            console.log(data);
            const updateQuery = { $push: { "feedback.labTests": data } };
            const vital = yield model_1.VitalModel.findByIdAndUpdate(vitalId, updateQuery, { new: true });
            if (!vital) {
                throw new error_1.NotFoundError("Vital not found");
            }
            return vital;
        });
    }
    deleteLabTest(vitalId, match) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!mongoose_1.Types.ObjectId.isValid(vitalId)) {
                throw new error_1.NotFoundError("Invalid vital ID");
            }
            const updateQuery = { $pull: { "feedback.labTests": match } };
            const vital = yield model_1.VitalModel.findByIdAndUpdate(vitalId, updateQuery, { new: true });
            if (!vital) {
                throw new error_1.NotFoundError("Vital not found");
            }
            return vital;
        });
    }
    updateLabTest(vitalId, match, update) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!mongoose_1.Types.ObjectId.isValid(vitalId)) {
                throw new error_1.NotFoundError("Invalid vital ID");
            }
            const arrayFilters = [];
            const filterConditions = {};
            Object.entries(match).forEach(([key, value]) => {
                filterConditions[`elem.${key}`] = value;
            });
            arrayFilters.push(filterConditions);
            const updateQuery = {
                $set: { "feedback.labTests.$[elem]": Object.assign(Object.assign({}, match), update) }
            };
            const vital = yield model_1.VitalModel.findByIdAndUpdate(vitalId, updateQuery, {
                new: true,
                arrayFilters,
            });
            if (!vital) {
                throw new error_1.NotFoundError("Vital not found");
            }
            return vital;
        });
    }
}
exports.VitalsService = VitalsService;
