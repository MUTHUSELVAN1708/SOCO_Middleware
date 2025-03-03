import mongoose from "mongoose";

const bookmarkSchema = new mongoose.Schema(
    {
        user_id: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
        post_id: { type: mongoose.Schema.Types.ObjectId, ref: "Post", required: true },
        isBusinessAccount: { type: Boolean, default: false },
        isProduct: { type: Boolean, default: false },
        timestamp: { type: Date, default: Date.now },
    },
    { timestamps: true, versionKey: false }
);

bookmarkSchema.index({ user_id: 1, post_id: 1 }, { unique: true });

const BookmarkModel = mongoose.models.Bookmark || mongoose.model("Bookmark", bookmarkSchema);

export default BookmarkModel;
