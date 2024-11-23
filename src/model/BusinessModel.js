// import mongoose from "../db/db.js";
import mongoose from "mongoose";
const BusinessregisterSchema = new mongoose.Schema({
  Brand_Name: {
    type: String,
    required: true,
  },
  org_name: {
    type: String,
    required: true,
  },
  PAN_NO: {
    type: Number,
    required: true,
  },
  GST_NO: {
    type: String,
    required: true,
  },
  Name: {
    type: String,
    required: true,
  },
  location_id:{
    type: String,
    required: true,
  },

  brand_logo: {
    type: String,
 
    required: true
  },  
  
  aadhar_img: {
    type: String,
 
    required: true
  },                              
  
  pan_img: {
    type: String,
 
    required: true
  }, 
  cover_img: {
    type: String,
    required: true
  },
  agree: {
    type: Boolean,
    required: false
  },
  type_of_service: {
    type: String,
    required: true
  },
  category: {
    type: String,
    required: true
  },
  sub_category: {
    type: String,
    required: true
  },

  status: {
    type: String,
    enum:["active","Inactive","Pending"],
    required: true
  },
 
  timestamp: {
    type: Date,
    default: Date.now
  },
}, {
  versionKey: false
});
BusinessregisterSchema.virtual("business_id").get(function () {
  return this._id.toString();
});
const businessregisterModel = mongoose.model("businessRegister", BusinessregisterSchema);

export default businessregisterModel;