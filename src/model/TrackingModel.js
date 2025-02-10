import mongoose from "mongoose";

const trackingSchema = new mongoose.Schema({
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    sentPosts: [{
        post_id: { type: mongoose.Schema.Types.ObjectId, required: true },
        viewedAt: { type: Date, default: Date.now },
        isWatched: { type: Boolean, default: false }
    }]
}, {
    versionKey: false,
    timestamps: true
});

const trackingModel = mongoose.models.Tracking || mongoose.model("Tracking", trackingSchema);
export default trackingModel;