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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DoctorService = void 0;
const error_1 = require("../../utils/error");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const model_1 = require("./model");
const model_2 = require("../user/model");
class DoctorService {
    registerDoctor(userId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const user = yield model_2.UserModel.findById(userId).select('+password');
                if (!user)
                    throw new error_1.AppError('User not found', 404);
                const existingDoctor = yield model_1.DoctorModel.findOne({ user: userId });
                if (existingDoctor)
                    throw new error_1.AppError('Doctor already registered with this user', 400);
                const doctor = yield model_1.DoctorModel.create({
                    user: user._id,
                    major: '',
                    qualifications: [],
                    experience: 1,
                    bio: 'I am a doctor',
                    availableDays: ['Monday', 'Wednesday', 'Friday'],
                    availableTime: {
                        from: '10:00 AM',
                        to: '4:00 PM',
                    },
                });
                yield model_2.UserModel.findByIdAndUpdate(userId, { role: 'doctor' }, { new: true });
                const token = jsonwebtoken_1.default.sign({ id: user._id, email: user.email, role: 'doctor' }, process.env.JWT_SECRET, { expiresIn: '1d' });
                return { doctor, token };
            }
            catch (error) {
                console.error('❌ Error in registerDoctor:', error);
                throw new error_1.AppError(error.message || 'Failed to register doctor', 500);
            }
        });
    }
    loginDoctor(email, password) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const user = yield model_2.UserModel.findOne({ email }).select('+password');
                if (!user || !(yield bcryptjs_1.default.compare(password, user.password))) {
                    throw new error_1.AppError('Invalid credentials', 401);
                }
                const doctor = yield model_1.DoctorModel.findOne({ user: user._id }).populate('user', '-password');
                if (!doctor)
                    throw new error_1.AppError('Doctor profile not found', 404);
                const token = jsonwebtoken_1.default.sign({ id: user._id, email: user.email, role: 'doctor' }, process.env.JWT_SECRET, { expiresIn: '1d' });
                return { doctor, token };
            }
            catch (error) {
                console.error('❌ Error in loginDoctor:', error);
                throw new error_1.AppError(error.message || 'Failed to login doctor', 500);
            }
        });
    }
    getDoctorById(id) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const doctor = yield model_1.DoctorModel.findOne({ user: id })
                    .populate('user', '-password')
                    .select('-reviews');
                if (!doctor)
                    throw new error_1.AppError('Doctor not found', 404);
                return doctor;
            }
            catch (error) {
                console.error('❌ Error in getDoctorById:', error);
                throw new error_1.AppError(error.message || 'Failed to fetch doctor', 500);
            }
        });
    }
    updateDoctor(id, data) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const doctor = yield model_1.DoctorModel.findByIdAndUpdate(id, data, { new: true })
                    .populate('user', '-password')
                    .select('-reviews');
                if (!doctor)
                    throw new error_1.AppError('Doctor not found', 404);
                return doctor;
            }
            catch (error) {
                console.error('❌ Error in updateDoctor:', error);
                throw new error_1.AppError(error.message || 'Failed to update doctor', 500);
            }
        });
    }
    deleteDoctor(id) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const doctor = yield model_1.DoctorModel.findByIdAndDelete(id);
                if (!doctor)
                    throw new error_1.AppError('Doctor not found', 404);
            }
            catch (error) {
                console.error('❌ Error in deleteDoctor:', error);
                throw new error_1.AppError(error.message || 'Failed to delete doctor', 500);
            }
        });
    }
    getAllDoctors(query) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { search, page = 1, limit = 10 } = query;
                const filters = {};
                if (search) {
                    const regex = new RegExp(search, 'i');
                    filters.$or = [{ major: regex }, { 'user.name': regex }]; // Search by major or user name
                }
                const skip = (Number(page) - 1) * Number(limit);
                const total = yield model_1.DoctorModel.countDocuments(filters);
                const doctors = yield model_1.DoctorModel.find(filters)
                    .populate('user', 'name email avatar') // Include avatar for UserList
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
            catch (error) {
                console.error('❌ Error in getAllDoctors:', error);
                throw new error_1.AppError(error.message || 'Failed to fetch doctors', 500);
            }
        });
    }
}
exports.DoctorService = DoctorService;
