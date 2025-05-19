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
const model_2 = require("../user/model"); // Assuming you have a UserModel
class DoctorService {
    registerDoctor(userId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const user = yield model_2.UserModel.findById(userId);
                if (!user)
                    throw new error_1.AppError('User not found', 404);
                const existingDoctor = yield model_1.DoctorModel.findOne({ user: userId });
                if (existingDoctor)
                    throw new error_1.AppError('Doctor already registered with this user', 400);
                const doctor = yield model_1.DoctorModel.create({
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
                yield model_2.UserModel.findByIdAndUpdate(userId, { role: 'doctor' }, { new: true });
                const token = jsonwebtoken_1.default.sign({ id: user._id, email: user.email, role: 'doctor' }, process.env.JWT_SECRET, { expiresIn: '1d' });
                return { doctor, token };
            }
            catch (error) {
                console.error("❌ Error in registerDoctor:", error);
                throw new error_1.AppError(error.message || "Something went wrong", 500);
            }
        });
    }
    loginDoctor(email, password) {
        return __awaiter(this, void 0, void 0, function* () {
            const user = yield model_2.UserModel.findOne({ email });
            if (!user || !(yield bcryptjs_1.default.compare(password, user.password))) {
                throw new error_1.AppError('Invalid credentials', 401);
            }
            const doctor = yield model_1.DoctorModel.findOne({ user: user._id });
            if (!doctor)
                throw new error_1.AppError('Doctor profile not found', 404);
            const token = jsonwebtoken_1.default.sign({ id: user._id, email: user.email, role: 'doctor' }, process.env.JWT_SECRET, { expiresIn: '1d' });
            return { doctor, token };
        });
    }
    getDoctorById(id) {
        return __awaiter(this, void 0, void 0, function* () {
            const doctor = yield model_1.DoctorModel.findOne({ user: id }) // user is ObjectId
                .populate('user', '-password') // populate the user field, exclude password
                .select('-reviews'); // optionally exclude reviews
            if (!doctor)
                throw new error_1.AppError('Doctor not found', 404);
            return doctor;
        });
    }
    updateDoctor(id, data) {
        return __awaiter(this, void 0, void 0, function* () {
            const doctor = yield model_1.DoctorModel.findByIdAndUpdate(id, data, { new: true }).select('-reviews');
            if (!doctor)
                throw new error_1.AppError('Doctor not found', 404);
            return doctor;
        });
    }
    deleteDoctor(id) {
        return __awaiter(this, void 0, void 0, function* () {
            const doctor = yield model_1.DoctorModel.findByIdAndDelete(id);
            if (!doctor)
                throw new error_1.AppError('Doctor not found', 404);
        });
    }
    getAllDoctors(query) {
        return __awaiter(this, void 0, void 0, function* () {
            const { search, page = 1, limit = 10 } = query;
            const filters = {};
            if (search) {
                const regex = new RegExp(search, 'i');
                filters.$or = [{ major: regex }];
            }
            const skip = (Number(page) - 1) * Number(limit);
            const total = yield model_1.DoctorModel.countDocuments(filters);
            const doctors = yield model_1.DoctorModel.find(filters)
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
        });
    }
}
exports.DoctorService = DoctorService;
