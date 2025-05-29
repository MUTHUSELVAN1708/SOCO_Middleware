import mongoose from "mongoose";

const reviewHelpfulSchema = new mongoose.Schema({
  reviewId: { type: mongoose.Schema.Types.ObjectId, ref: 'Review', required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, required: true },
  isBusinessAccount: { type: Boolean, default: false },
}, {
  timestamps: true,
  versionKey: false
});

// Prevent duplicate votes
reviewHelpfulSchema.index({ reviewId: 1, userId: 1, isBusinessAccount: 1 }, { unique: true });

const ReviewHelpfulModel = mongoose.models.ReviewHelpful || mongoose.model("ReviewHelpful", reviewHelpfulSchema);
export default ReviewHelpfulModel;
