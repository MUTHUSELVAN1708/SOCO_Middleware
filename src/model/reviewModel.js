import mongoose from "mongoose";

const reviewSchema = new mongoose.Schema({
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'user' } ,// not 'User'

    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'products', required: true },
    rating: { type: Number, min: 1, max: 5, required: true },
    reviewText: { type: String },
    images: [{ type: String }], 
    createdAt: { type: Date, default: Date.now },
}, { versionKey: false, });


const ReviewModel = mongoose.models.Review || mongoose.model("Review", reviewSchema);
export default ReviewModel;