"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DoctorModel = void 0;
const mongoose_1 = require("mongoose");
const reviewSchema = new mongoose_1.Schema({
    user: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', required: true },
    content: { type: String, required: true },
    ratings: { type: Number, required: true, min: 1, max: 5 },
}, { timestamps: true });
const doctorSchema = new mongoose_1.Schema({
    user: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', required: true }, // user is required
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
}, {
    timestamps: true,
});
// Optional: Middleware to update averageRating if reviews are modified
doctorSchema.pre('save', function (next) {
    if (Array.isArray(this.reviews)) {
        const total = this.reviews.reduce((sum, review) => sum + review.ratings, 0);
        this.averageRating = this.reviews.length
            ? parseFloat((total / this.reviews.length).toFixed(2))
            : 0;
    }
    next();
});
exports.DoctorModel = (0, mongoose_1.model)('Doctor', doctorSchema);
