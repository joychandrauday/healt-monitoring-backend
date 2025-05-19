import { UserModel } from './model';
import { User } from './interface';
import { AppError, NotFoundError } from '../../utils/error';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { Meta, QueryParams } from '../../types/index'

export class UserService {
    async registerUser(data: Partial<User>): Promise<{ user: User; token: string }> {
        const existingUser = await UserModel.findOne({ email: data.email });
        if (existingUser) throw new AppError('Email already exists', 400);

        const user = await UserModel.create(data);
        const token = jwt.sign({ id: user._id, email: user.email, role: user.role }, process.env.JWT_SECRET!, {
            expiresIn: '1d',
        });
        return { user, token };
    }

    async loginUser(email: string, password: string): Promise<{ user: User; token: string }> {
        const user = await UserModel.findOne({ email });
        if (!user || !(await bcrypt.compare(password, user.password))) {
            throw new AppError('Invalid credentials', 401);
        }
        const token = jwt.sign({ id: user._id, email: user.email, role: user.role }, process.env.JWT_SECRET!, {
            expiresIn: '1d',
        });
        return { user, token };
    }

    async getUserById(id: string): Promise<User | null> {
        const user = await UserModel.findById(id).select('-password');
        if (!user) throw new AppError('User not found', 404);
        return user;
    }

    async updateUser(id: string, data: Partial<User>): Promise<User | null> {
        try {
            const user = await UserModel.findByIdAndUpdate(
                id,
                { $set: data },
                { new: true, runValidators: true }
            );

            if (!user) {
                throw new NotFoundError('User not found');
            }

            return user;
        } catch (error) {
            throw error;
        }
    }

    async deleteUser(id: string): Promise<void> {
        const user = await UserModel.findByIdAndDelete(id);
        if (!user) throw new AppError('User not found', 404);
    }

    async getAllUsers(query: QueryParams): Promise<{ users: User[]; meta: Meta }> {
        // return UserModel.find().select('-password');
        const { status, role, search, page = 1, limit, doctorRequest } = query;

        const filters: Record<string, any> = {};

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
            const searchRegex = new RegExp(search as string, "i"); // Case-insensitive search
            filters.$or = [
                { name: searchRegex },
                { email: searchRegex }
            ];
        }

        // Pagination setup
        const pageNumber = Number(page) > 0 ? Number(page) : 1;
        const limitNumber = limit ? Number(limit) : 10;
        const skip = (pageNumber - 1) * limitNumber;

        const totalUsers = await UserModel.countDocuments(filters);

        let usersQuery = UserModel.find(filters).select('-password');
        usersQuery = usersQuery.sort({ createdAt: -1 });

        if (limitNumber > 0) {
            usersQuery.skip(skip).limit(limitNumber);
        }

        const users = await usersQuery;
        const meta = {
            total: totalUsers,
            page: pageNumber,
            limit: limitNumber > 0 ? limitNumber : totalUsers,
            totalPages: limitNumber > 0 ? Math.ceil(totalUsers / limitNumber) : 1,
        };

        return { users, meta };
    }
}