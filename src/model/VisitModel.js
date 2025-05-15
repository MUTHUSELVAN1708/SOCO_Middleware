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
  viewCount: {
    type: Number,
    default: 0,
  },
  viewed_page_account_type: {
    type: Boolean,
    required: true,
  }
}, { versionKey: false });

const viewsModel = mongoose.model("viewsPage", viewsSchema);
export default viewsModel;
