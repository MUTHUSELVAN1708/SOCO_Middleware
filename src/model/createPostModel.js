// import mongoose from "mongoose";

// const createPostSchema = new mongoose.Schema({
//     user_id: { type: String, required: true },
//     creatorName: { type: String, required: true },
//     creatorProfileImageUrl: { type: String },
//     pinCode: { type: String },
//     city: { type: String },
//     district: { type: String },
//     state: { type: String },
//     country: { type: String },
//     completeAddress: { type: String }, 
//     lat: { type: Number },
//     lng: { type: Number },
//     postLanguage: { type: [String], default: [] }, 
//     interestPeoples: { type: [String], default: [] },
//     postCategories: { type: [String], default: [] },
//     likesCount: { type: Number, default: 0 }, 
//     commentsCount: { type: Number, default: 0 },
//     viewsCount: { type: Number, default: 0 }, 
//     sharesCount: { type: Number, default: 0 },
//     isBusinessPost: { type: Boolean, default: false }, 
//     isUserPost: { type: Boolean, default: false }, 
//     isProductPost: { type: Boolean, default: false },
//     productId: { type: String, },
//     productPrice: {  type: Number, default: 0  },
//     imageUrl: { type: String, },
//     caption: { type: String,  },
//     isScheduled: { type: Boolean, default: false },
//     scheduleDateTime: { type: Date, default: null },
//     tags: { type: [String], },
//     description: { type: String,  },
//     isVideo: { type: Boolean, default: false },
//     location: { type: String,  },
//     mediaFile: { type: String,  },
//     thumbnailFile: { type: String,},
//     videoDuration: { type: Number, },
//     enableComments: { type: Boolean, default: true },
//     enableFavorites: { type: Boolean, default: true },
//     ageGroup: { type: String,  },
//     uploadProgress: { type: Number, default: 0 },
//     isProcessing: { type: Boolean, default: false },
//     isTrimming: { type: Boolean, default: false },
//     mentions: { type: [String],  },
//     filters: { type: [String],  },
//     quality: { type: String,  },
//     visibility: { type: String, default: 'public' },
//     aspectRatio: { type: String, default: '' },
//     status: { type: String, default: 'published' },
//     timestamp: { type: Date, default: Date.now },
// },{
//     versionKey: false
// }
//  );


// createPostSchema.virtual("Post_id").get(function () {
//     return this._id.toString();
// });

// // Define the model only once, avoid redefining it
// const createPostModel = mongoose.models.Post || mongoose.model("Post", createPostSchema);

// export default createPostModel;


import mongoose from "mongoose";

const mediaItemSchema = new mongoose.Schema({
  url: { type: String, required: true },
  type: { type: String, enum: ["image", "video"], required: true },
  thumbnailUrl: { type: String },
  productId: { type: String },
  productName: { type: String },
  price: { type: String },
  originalPrice: { type: String },
  hasDiscount: { type: Boolean },
  aspectRatio: { type: Number },
}, { _id: false });

const repostDetailsSchema = new mongoose.Schema({
  originalPostId: { type: mongoose.Schema.Types.ObjectId, ref: "Post", required: true },
  originalUserId: { type: String, required: true },
  originalUserName: { type: String },
  originalUserAvatar: { type: String },
  originalCaption: { type: String },
  originalMediaItems: { type: [mediaItemSchema], default: [] },
}, { _id: false });

const createPostSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  userName: { type: String, required: true },
  userAvatar: { type: String },
  productId: { type: String },


  likesCount: { type: Number, default: 0 },
  commentsCount: { type: Number, default: 0 },
  viewsCount: { type: Number, default: 0 },
  sharesCount: { type: Number, default: 0 },
  rePostCount: { type: Number, default: 0 },

  caption: { type: String },
  webSiteLink: { type: String },
  timestamp: { type: Date, default: Date.now },

  mediaItems: { type: [mediaItemSchema], default: [] },

  isRepost: { type: Boolean, default: false },
  isOwnPost: { type: Boolean, default: true },
  isProductPost: { type: Boolean, default: false },
  isBusinessAccount: { type: Boolean, default: false },

  repostDetails: { type: repostDetailsSchema, default: null },
}, {
  versionKey: false,
});

createPostSchema.virtual("Post_id").get(function () {
  return this._id.toString();
});

const createPostModel = mongoose.models.Post || mongoose.model("Post", createPostSchema);

export default createPostModel;


