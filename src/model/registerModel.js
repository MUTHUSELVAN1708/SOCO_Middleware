import mongoose from "mongoose";

const friendModel = new mongoose.Schema({

  username: {
    type: String,
    required: false
  },
  profileImageUrl: {
    type: String,
    required: false
  },
  isFollowing: {
    type: Boolean,
    required: false
  },
});


const registerSchema = new mongoose.Schema(
  {
    full_Name: { type: String, required: true },
    password: { type: String, required: true },
    phn_number: { type: Number, required: true },
    email: { type: String, required: true },
    gender: { type: String, required: true },
    DOB: { type: String, required: true },
    location_id: { type: String, default: null, ref: 'location' },
    // location_id: { type: mongoose.Schema.Types.ObjectId, default: null, ref: 'location' },
    profile_url: { type: String, required: false },
    agree: { type: Boolean, required: true },
    isSameNumberBusiness: { type: Boolean, required: false },
    interest: [{ type: String, required: false }],
    addNew_Interest: [{ type: String, required: false }],
    status: { type: String, required: false },
    otp: { type: String, required: false },
    reg_otp_id: { type: String, required: false },
    maritalStatus: { type: String, required: false },
    postCount: { type: Number, default: 0 },
    followerCount: { type: Number, default: 0 },
    followingCount: { type: Number, default: 0 },
    needPermissionForFollowing: { type: Boolean, default: false },
    friendPermission: { type: Boolean, default: false },
    accountIsPublic: { type: Boolean, default: false },
    schoolDetails: {
      name: { type: String, required: false },
      educationLevel: { type: String, required: false },
    },
    workDetails: {
      companyName: { type: String, required: false },
      designation: { type: String, required: false },
    },
    highlights: [{
      type: String,
      required: false
    }],
    isAlreadyFriend: {
      type: Boolean,
      required: false
    },
    isVerified: {
      type: Boolean,
      required: false
    },
    posts: {
      type: Number,
      required: false
    },
    onlineStatus: { 
      type: Boolean, 
      default: false,  // Default to false, indicating the user is offline
      required: false 
    },
    isTyping: { 
      type: Boolean, 
      default: false,  // Default to false, indicating the user is not typing
      required: false 
    },
    lastOnline: { 
      type: Date, 
      default: null,  // Default to null, indicating the user hasn't been online yet
      required: false 
    },
    currentChatRoom: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'ChatRoom',  // Reference to a ChatRoom model (optional)
      required: false 
    },
    unreadMessagesCount: {
      type: Number,
      default: 0,  // Default to 0, indicating no unread messages
      required: false
    },

    // bio Details
    bio: { type: String, default: '', required: false },
    title: { type: String, default: '', required: false },
    skills: { type: String, default: '', required: false },
    hobbies: { type: String, default: '', required: false },
    education: { type: String, default: '', required: false },
    degree: { type: String, default: '', required: false },
    field: { type: String, default: '', required: false },
    institution: { type: String, default: '', required: false },
    year: { type: Number, default: 0, required: false },
    grade: { type: Number, default: 0, required: false },
    achievements: { type: String, default: '', required: false },
    deviceToken:{type:[String], required:false},
    timestamp: { type: Date, default: Date.now },
  },
  { versionKey: false }
);

registerSchema.virtual("user_id").get(function () {
  return this._id.toString();
});



const registerModel = mongoose.model("user", registerSchema);


export default  registerModel;



