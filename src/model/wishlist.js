import mongoose from "mongoose";


const wishlistSchema = new mongoose.Schema({
    user_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    post_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'post',
        required: true,
    },
    isBusinessAccount: {
        type: Boolean,
        default: false,
    },
    createdAt: {
        type: Date,
        default: Date.now,
    }
}, { versionKey: false });

wishlistSchema.index({ user_id: 1, post_id: 1 }, { unique: true });

const WishlistModel = mongoose.model('Wishlist', wishlistSchema);
 export default WishlistModel;