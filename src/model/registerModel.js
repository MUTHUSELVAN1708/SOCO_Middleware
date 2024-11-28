// import mongoose from "../db/db.js";
import mongoose from "mongoose";

const friendModel = new mongoose.Schema({
  // id: {
  //   type: String,
  //   required: true
  // },
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
const registerSchema = new mongoose.Schema({
  full_Name: {
    type: String,
    required: false,
  },
  password: {
    type: String,
    required: false,
  },
  phn_number: {
    type: Number,
    required: false,
  },
  email: {
    type: String,
    required: false,
  },
  DOB: {
    type: String,
    required: false,
  },
  location_id: {
    type: String,
    required: false,
  },

  profile_img: {
    type: String,
    required: false
  },
  agree: {
    type: Boolean,
    required: false
  },
  isSameNumberBusiness: {
    type: Boolean,
    required: false
  },
  interest: [{
    type: String,
    required: false
  }],
  addNew_Interest: [{
    type: String,
    required: false
  }],
  status: {
    type: String,
    required: false
  },
  otp: {
    type: String,
    required: false
  },
  reg_otp_id: {
    type: String,
    required: false
  },
  // username: {
  //   type: String,
  //   required: false
  // },
  bio: {
    type: String,
    required: false
  },
  posts: {
    type: Number,
    required: false
  },
  followers: {
    type: Number,
    required: false
  },
  
  isVerified: {
    type: Boolean,
    required: false
  },
  isAlreadyFriend: {
    type: Boolean,
    required: false
  },
  isPrivate: {
    type: Boolean,
    required: false
  },
  highlights: [{
    type: String,
    required: false
  }],
  friend: [friendModel],
  timestamp: {
    type: Date,
    default: Date.now
  },
}, {
  versionKey: false
});
registerSchema.virtual("user_id").get(function () {
  return this._id.toString();
});
const registerModel = mongoose.model("user", registerSchema);

export default registerModel;  