import mongoose from "mongoose";

const reviewReplySchema = new mongoose.Schema({
  id: { type: String, required: true },
  userName: String,
  userAvatar: String,
  reply: String,
  datePosted: { type: Date, default: Date.now },
  isSellerResponse: { type: Boolean, default: false },
  isEdited: { type: Boolean, default: false },
}, { _id: false });

const reviewSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'user' },
  productId: { type: mongoose.Schema.Types.ObjectId, ref: 'products', required: true },
  rating: { type: Number, min: 1, max: 5, required: true },
  reviewText: { type: String },
  images: [{ type: String }],
  createdAt: { type: Date, default: Date.now },
  replies: [reviewReplySchema],
  helpfulCount: { type: Number, default: 0 },
}, { versionKey: false });



const ReviewModel = mongoose.models.Review || mongoose.model("Review", reviewSchema);
export default ReviewModel;