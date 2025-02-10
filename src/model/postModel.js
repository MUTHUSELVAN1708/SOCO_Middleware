// import mongoose from "mongoose";

// const postSchema = new mongoose.Schema(
//   {
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
//     likesCount: { type: Number, default: 0 }, 
//     commentsCount: { type: Number, default: 0 },
//     viewsCount: { type: Number, default: 0 }, 
//     sharesCount: { type: Number, default: 0 },
//     isBusinessPost: { type: Boolean, default: false }, 
//     isUserPost: { type: Boolean, default: false }, 
//     isProductPost: { type: Boolean, default: false }, 
//     posts: [
//       {
//         imageUrl: { type: String },
//         caption: { type: String },
//         isScheduled: { type: Boolean },
//         scheduleDateTime: { type: Date },
//         likes: { type: Number, default: 0 },
//         totalComments: { type: Number, default: 0 },
//         comments: { type: [String], default: [] },
//         tags: { type: [String] },
//         description: { type: String },
//         isVideo: { type: Boolean },
//         location: { type: String },
//         lat: { type: Number }, // Latitude for individual post
//         lng: { type: Number }, // Longitude for individual post
//         mediaFile: { type: String },
//         thumbnailFile: { type: String },
//         videoDuration: { type: Number },
//         enableComments: { type: Boolean, default: true },
//         enableFavorites: { type: Boolean, default: true },
//         ageGroup: { type: String },
//         uploadProgress: { type: Number },
//         isProcessing: { type: Boolean },
//         isTrimming: { type: Boolean },
//         mentions: { type: [String] },
//         filters: { type: [Object] },
//         quality: { type: String },
//         visibility: { type: String, enum: ["public", "private", "friends"], default: "public" },
//         aspectRatio: { type: String },
//         status: { type: String, enum: ["draft", "published", "archived"], default: "draft" },
//         reactions: {
//           likes: { type: Number, default: 0 },
//           dislikes: { type: Number, default: 0 },
//           shares: { type: Number, default: 0 },
//         },
//         reportedBy: { type: [String], default: [] },
//         isPinned: { type: Boolean, default: false },
//       },
//     ],
//     timestamp: { type: Date, default: Date.now },
//   },
//   {
//     versionKey: false,
//   }
// );

// postSchema.virtual("Post_id").get(function () {
//   return this._id.toString();
// });

// const PostModel = mongoose.model("Post", postSchema);

// export default PostModel;
