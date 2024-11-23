// import mongoose from "../db/db.js";
import mongoose from "mongoose";
const otpSchema = new mongoose.Schema({
 
    email: {
        type: String,
        required: true
      },
  reg_otp: {
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
otpSchema.virtual("reg_otp_id").get(function () {
  return this._id.toString();
});
const otpModel = mongoose.model("otp", otpSchema);

export default otpModel;