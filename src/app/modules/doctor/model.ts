import { Schema, model } from 'mongoose';
import { Doctor } from './interface';

const reviewSchema = new Schema(
    {
        user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        content: { type: String, required: true },
        ratings: { type: Number, required: true, min: 1, max: 5 },
    },
    { timestamps: true }
);

const doctorSchema = new Schema<Doctor>(
    {
        user: { type: Schema.Types.ObjectId, ref: 'User', required: true }, // user is required
        major: { type: String }, // optional now
        qualifications: { type: [String], default: [] },
        experience: { type: Number, default: 0 },
        bio: { type: String },
        availableDays: { type: [String], default: [] },
        availableTime: {
            from: { type: String },
            to: { type: String },
        },
        reviews: { type: [reviewSchema], default: [] },
        averageRating: { type: Number, default: 0 },
        isOnline: { type: Boolean, default: false }
    },
    {
        timestamps: true,
    }
);

// Optional: Middleware to update averageRating if reviews are modified
doctorSchema.pre('save', function (this: any, next) {
    if (Array.isArray(this.reviews)) {
        const total = this.reviews.reduce(
            (sum: number, review: { ratings: number }) => sum + review.ratings,
            0
        );
        this.averageRating = this.reviews.length
            ? parseFloat((total / this.reviews.length).toFixed(2))
            : 0;
    }
    next();
});

export const DoctorModel = model<Doctor>('Doctor', doctorSchema);
