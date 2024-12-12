
import mongoose from "mongoose"

const mentionSchema = new mongoose.Schema({
    user_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User', 
        required: true
    },
    mentionType: { type: String, enum: ["comment", "like", "tag", "story"], required: true },
    mentionDetails: { type: Object, required: true }, // Flexible for storing related data like postId, comment, etc.
    status: { type: String, enum: ["active", "expired"], default: "active" },
    createdAt: { type: Date, default: Date.now },
    expiresAt: { type: Date }, // For mentions like "story" that expire after 24 hours
}, { versionKey: false, timestamps: true });


mentionSchema.pre("save", function (next) {
    if (this.mentionType === "story") {
        this.expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours from now
    }
    next();
});



mentionSchema.virtual("mention_id").get(function () {
    return this._id.toString();
})

const mentionModel = mongoose.model('Mention', mentionSchema);
export default mentionModel;