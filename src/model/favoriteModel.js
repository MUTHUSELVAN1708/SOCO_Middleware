import mongoose from "mongoose";

const favoriteSchema = new mongoose.Schema(
    {
        user_id: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
        post_id: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
        isBusinessAccount: { type: Boolean, default: false },
        isProduct: { type: Boolean, default: false },
        timestamp: { type: Date, default: Date.now },
    },
    { versionKey: false }
);

favoriteSchema.virtual("fav_id").get(function () {
    return this._id.toString();
});

const FavoriteModel = mongoose.model("Favorite", favoriteSchema);
export default FavoriteModel;
