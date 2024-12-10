import mongoose from "mongoose";

const postSchema = new mongoose.Schema({
    user_id: { type: String, required: true },
    posts: [
        {
            imageUrl: { type: String },
            caption: { type: String },
            isScheduled: { type: Boolean },
            scheduleDateTime: { type: Date },
            likes: { type: Number, default: 0 },
            comments: { type: [String], default: [] },
            tags: { type: [String] },
            description: { type: String },
            isVideo: { type: Boolean },
            location: { type: String },
            mediaFile: { type: String },
            thumbnailFile: { type: String },
            videoDuration: { type: Number },
            enableComments: { type: Boolean, default: true },
            enableFavorites: { type: Boolean, default: true },
            ageGroup: { type: String },
            uploadProgress: { type: Number },
            isProcessing: { type: Boolean },
            isTrimming: { type: Boolean },
            mentions: { type: [String] },
            filters: { type: [Object] },
            quality: { type: String },
            visibility: { type: String },
            aspectRatio: { type: String },
            status: { type: String },
        }
    ],
    timestamp: { type: Date, default: Date.now }
}, {
    versionKey: false
});

postSchema.virtual("Post_id").get(function () {
    return this._id.toString();
});

// Rename the model to avoid conflict
const postModel = mongoose.model("post", postSchema);

export default postModel;
