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
exports.UserService = void 0;
const model_1 = require("./model");
const error_1 = require("../../utils/error");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
class UserService {
    registerUser(data) {
        return __awaiter(this, void 0, void 0, function* () {
            const existingUser = yield model_1.UserModel.findOne({ email: data.email });
            if (existingUser)
                throw new error_1.AppError('Email already exists', 400);
            const user = yield model_1.UserModel.create(data);
            const token = jsonwebtoken_1.default.sign({ id: user._id, email: user.email, role: user.role, avatar: user.avatar }, process.env.JWT_SECRET, {
                expiresIn: '1d',
            });
            return { user, token };
        });
    }
    loginUser(email, password) {
        return __awaiter(this, void 0, void 0, function* () {
            const user = yield model_1.UserModel.findOne({ email });
            if (!user || !(yield bcryptjs_1.default.compare(password, user.password))) {
                throw new error_1.AppError('Invalid credentials', 401);
            }
            const token = jsonwebtoken_1.default.sign({ id: user._id, email: user.email, role: user.role, avatar: user.avatar }, process.env.JWT_SECRET, {
                expiresIn: '1d',
            });
            return { user, token };
        });
    }
    getUserById(id) {
        return __awaiter(this, void 0, void 0, function* () {
            const user = yield model_1.UserModel.findById(id).select('-password');
            if (!user)
                throw new error_1.AppError('User not found', 404);
            return user;
        });
    }
    updateUser(id, data) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const user = yield model_1.UserModel.findByIdAndUpdate(id, { $set: data }, { new: true, runValidators: true });
                if (!user) {
                    throw new error_1.NotFoundError('User not found');
                }
                return user;
            }
            catch (error) {
                throw error;
            }
        });
    }
    deleteUser(id) {
        return __awaiter(this, void 0, void 0, function* () {
            const user = yield model_1.UserModel.findByIdAndDelete(id);
            if (!user)
                throw new error_1.AppError('User not found', 404);
        });
    }
    getAllUsers(query) {
        return __awaiter(this, void 0, void 0, function* () {
            // return UserModel.find().select('-password');
            const { status, role, search, page = 1, limit, doctorRequest } = query;
            const filters = {};
            if (status) {
                filters.status = status;
            }
            if (doctorRequest) {
                filters.doctorRequest = doctorRequest;
            }
            if (role) {
                filters.role = role;
            }
            if (search) {
                const searchRegex = new RegExp(search, "i"); // Case-insensitive search
                filters.$or = [
                    { name: searchRegex },
                    { email: searchRegex }
                ];
            }
            // Pagination setup
            const pageNumber = Number(page) > 0 ? Number(page) : 1;
            const limitNumber = limit ? Number(limit) : 10;
            const skip = (pageNumber - 1) * limitNumber;
            const totalUsers = yield model_1.UserModel.countDocuments(filters);
            let usersQuery = model_1.UserModel.find(filters).select('-password');
            usersQuery = usersQuery.sort({ createdAt: -1 });
            if (limitNumber > 0) {
                usersQuery.skip(skip).limit(limitNumber);
            }
            const users = yield usersQuery;
            const meta = {
                total: totalUsers,
                page: pageNumber,
                limit: limitNumber > 0 ? limitNumber : totalUsers,
                totalPages: limitNumber > 0 ? Math.ceil(totalUsers / limitNumber) : 1,
            };
            return { users, meta };
        });
    }
}
exports.UserService = UserService;
