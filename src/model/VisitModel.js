import mongoose from "mongoose";

const viewsSchema = new mongoose.Schema({
    viewer_id: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
    },
    viewer_type: {
        type: String,
        enum: ['User', 'Business'],
        required: true,
    },
    viewed_page_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Business",
        required: true,
    },
    viewedAt: [{
        type: Date,
        default: Date.now,
    }],

}, { versionKey: false });

const viewsModel = mongoose.model("viewsPage", viewsSchema);
export default viewsModel;