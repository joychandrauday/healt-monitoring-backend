import { Schema, model } from 'mongoose';
import { User } from './interface';
import bcrypt from 'bcryptjs';

const addressSchema = new Schema({
    street: { type: String, required: false },
    city: { type: String, required: false },
    state: { type: String, required: false },
    country: { type: String, required: false },
    postalCode: { type: String, required: false },
});

const userSchema = new Schema<User>({
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    name: { type: String, required: true },
    assignedDoctorId: { type: Schema.Types.ObjectId, ref: 'Doctor', required: false },
    role: { type: String, enum: ['patient', 'doctor', 'admin'], default: 'patient', required: true },
    avatar: { type: String, required: false },
    doctorRequest: { type: Boolean, default: false },
    bio: { type: String, required: false },
    gender: { type: String, enum: ['male', 'female', 'other', ''], required: false },
    bloodGroup: { type: String, enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', ''], required: false },
    age: { type: Number, required: false, min: 0 },
    phone: { type: String, required: false },
    address: { type: addressSchema, required: false },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
});

userSchema.pre('save', async function (next) {
    if (this.isModified('password')) {
        this.password = await bcrypt.hash(this.password, 10);
    }
    this.updatedAt = new Date();
    next();
});

userSchema.pre('findOneAndUpdate', function (next) {
    this.set({ updatedAt: new Date() });
    next();
});

export const UserModel = model<User>('User', userSchema);