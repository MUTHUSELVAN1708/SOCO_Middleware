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
// const registerSchema = new mongoose.Schema({
//   full_Name: {
//     type: String,
//     required: false,
//   },
//   password: {
//     type: String,
//     required: false,
//   },
//   phn_number: {
//     type: Number,
//     required: false,
//   },
//   email: {
//     type: String,
//     required: false,
//   },
//   DOB: {
//     type: String,
//     required: false,
//   },
//   location_id: {
//     type: String,
//     required: false,
//   },

//   profile_url: {
//     type: String,
//     required: false
//   },
//   agree: {
//     type: Boolean,
//     required: false
//   },
//   isSameNumberBusiness: {
//     type: Boolean,
//     required: false
//   },
//   interest: [{
//     type: String,
//     required: false
//   }],
//   addNew_Interest: [{
//     type: String,
//     required: false
//   }],
//   status: {
//     type: String,
//     required: false
//   },
//   otp: {
//     type: String,
//     required: false
//   },
//   reg_otp_id: {
//     type: String,
//     required: false
//   },
//   // username: {
//   //   type: String,
//   //   required: false
//   // },
//   bio: {
//     type: String,
//     required: false
//   },
//   posts: {
//     type: Number,
//     required: false
//   },
//   followers: {
//     type: Number,
//     required: false
//   },
  
//   isVerified: {
//     type: Boolean,
//     required: false
//   },
//   isAlreadyFriend: {
//     type: Boolean,
//     required: false
//   },
//   isPrivate: {
//     type: Boolean,
//     required: false
//   },
//   highlights: [{
//     type: String,
//     required: false
//   }],
//   friend: [friendModel],
//   timestamp: {
//     type: Date,
//     default: Date.now
//   },
// }, {
//   versionKey: false
// });


const registerSchema = new mongoose.Schema(
  {
    full_Name: { type: String, required: true },
    password: { type: String, required: true },
    phn_number: { type: Number, required: true },
    email: { type: String, required: true },
    DOB: { type: String, required: true },
    location_id: { type: String, default: null, ref: 'location' },
    // location_id: { type: mongoose.Schema.Types.ObjectId, default: null, ref: 'location' },
    profile_url: { type: String, required: false },
    agree: { type: Boolean, required: true },
    isSameNumberBusiness: { type: Boolean, required: true },
    interest: [{ type: String, required: false }],
    addNew_Interest: [{ type: String, required: false }],
    status: { type: String, required: true },
    otp: { type: String, required: false },
    reg_otp_id: { type: String, required: false },
    postCount: { type: Number, default: 0 },
    followerCount: { type: Number, default: 0 },
    followingCount: { type: Number, default: 0 },
    needPermissionForFollowing: { type: Boolean, default: false },
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
    timestamp: { type: Date, default: Date.now },
  },
  { versionKey: false }
);


registerSchema.virtual("user_id").get(function () {
  return this._id.toString();
});



const registerModel = mongoose.model("user", registerSchema);


export default  registerModel;



