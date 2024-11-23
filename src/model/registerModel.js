// import mongoose from "../db/db.js";
import mongoose from "mongoose";
const registerSchema = new mongoose.Schema({
  full_Name: {
    type: String,
    required: true,
  },
  password: {
    type: String,
    required: true,
  },
  phn_number: {
    type: Number,
    required: true,
  },
  email: {
    type: String,
    required: true,
  },
  DOB: {
    type: String,
    required: true,
  },
  location_id:{
    type: String,
    required: true,
  },

  profile_img: {
    type: String,
    //  validate: {
    //   validator: function(v) {
    //     return /^(https?:\/\/.*\.(?:png|jpg|jpeg|gif|svg))$/i.test(v); 
    //   },
    //   message: props => `${props.value} is not a valid image URL!`
    // },
    required: false
  },
  agree: {
    type: Boolean,
    required: true
  },
  isSameNumberBusiness: {
    type: Boolean,
    required: true
  },
  interest: [{
    type: String,
    required: false
  }],
  addNew_Interest: [{
    type: String,
    required: false
  }],
status:{
  type: String,
  required: true
},
  otp: {
    type: String,
    required: false
  },
  reg_otp_id: {
    type: String,
    required: true
  },
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