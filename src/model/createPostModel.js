import mongoose from "mongoose";

const createPostSchema = new mongoose.Schema({
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'user', required: true },
    imageUrl: { type: String, },
    caption: { type: String,  },
    isScheduled: { type: Boolean, default: false },
    scheduleDateTime: { type: Date, default: null },
    likes: { type: Number, },
    comments: { type: Number, },
    tags: { type: [String], },
    description: { type: String,  },
    isVideo: { type: Boolean, default: false },
    location: { type: String,  },
    mediaFile: { type: String,  },
    thumbnailFile: { type: String,},
    videoDuration: { type: Number, },
    enableComments: { type: Boolean, default: true },
    enableFavorites: { type: Boolean, default: true },
    ageGroup: { type: String,  },
    uploadProgress: { type: Number, default: 0 },
    isProcessing: { type: Boolean, default: false },
    isTrimming: { type: Boolean, default: false },
    mentions: { type: [String],  },
    filters: { type: [String],  },
    quality: { type: String,  },
    visibility: { type: String, default: 'public' },
    aspectRatio: { type: String, default: '' },
    status: { type: String, default: 'published' },
    timestamp: { type: Date, default: Date.now },
},{
    versionKey: false
}
 );

createPostSchema.virtual("Post_id").get(function () {
    return this._id.toString();
});

// Define the model only once, avoid redefining it
const createPostModel = mongoose.models.Post || mongoose.model("Post", createPostSchema);

export default createPostModel;
