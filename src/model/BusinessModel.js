import mongoose from "mongoose";

const BusinessregisterSchema = new mongoose.Schema(
  {
    Brand_Name: { type: String, required: false },
    user_id: { type: String, required: true },
    org_name: { type: String, required: false },
    PAN_NO: { type: String, required: false },
    GST_NO: { type: String, required: false },
    aadharNo: { type: String, required: false },
    Name: { type: String, required: false },
    aadhar_img: { type: String, required: false },
    pan_img: { type: String, required: false },
    cover_img: { type: String, required: false },
    brand_logo: { type: String, required: false },
    businessAgree: { type: Boolean, required: false },
    type_of_service: { type: String, required: false },
    category: { type: String, required: false },
    sub_category: { type: String, required: false },
    status: { type: String, enum: ["active", "Inactive", "Pending"], required: false },
    postCount: { type: Number, default: 0 },
    followerCount: { type: Number, default: 0 },
    followingCount: { type: Number, default: 0 },
    friendCount: { type: Number, default: 0 },
    lat: { type: String, required: false },
    lng: { type: String, required: false },
    description: { type: String, required: false },
    needPermissionForFollowing: { type: Boolean, default: false },
    friendPermission: { type: Boolean, default: false },
    isThereAnyNotification: { type: Boolean, default: false },
    isVerified: {
      type: Boolean,
      required: false
    },
    ownerName: { type: String, required: false },
    businessAddress: { type: String, required: false },
    businessCity: { type: String, required: false },
    businessState: { type: String, required: false },
    businessPinCode: { type: Number, required: false },
    businessEmail: { type: String, required: false },
    businessPhone: { type: Number, required: false },
    businessType: { type: String, required: false },
    accountIsPublic: { type: Boolean, default: false },
    natureOfBusiness: { type: String, required: false },
    businessName: { type: String, required: false },
    oneSignalIDs: { type: [String], default: [] },
    subscriptionIDs: { type: [String], default: [] },
    accessAccountsIds: { type: [String], default: [] },

    // Chat-related fields
    onlineStatus: {
      type: Boolean,
      default: false,  // Default to false, indicating the business is offline
      required: false
    },
    isTyping: {
      type: Boolean,
      default: false,  // Default to false, indicating the business is not typing
      required: false
    },
    lastOnline: {
      type: Date,
      default: null,  // Default to null, indicating the business hasn't been online yet
      required: false
    },
    currentChatRoom: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ChatRoom',  // Reference to a ChatRoom model (optional)
      required: false
    },
    unreadMessagesCount: {
      type: Number,
      default: 0,
      required: false
    },
    deviceToken: {
      type: String,
      required: false
    },
    deviceType: {
      type: String,
      enum: ['android', 'ios', 'web'],
      required: false
    },
    viewCount: {
      type: Number,
    },
    launchedIn: {
      type: Date,
      required: false,
    },
    openTime: {
      type: String,
      required: false
    },
    website: {
      type: String,
      required: false,
    },
    socialMediaLinks:[ {
      type: String,
      required: false
    }],
    closeTime: {
      type: String,
      required: false
    },

    timestamp: { type: Date, default: Date.now },
  },
  { versionKey: false }
);


BusinessregisterSchema.virtual("business_id").get(function () {
  return this._id.toString();
});

const businessregisterModel = mongoose.model("businessRegister", BusinessregisterSchema);
export default businessregisterModel;
