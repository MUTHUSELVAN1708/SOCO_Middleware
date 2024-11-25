// import mongoose from "../db/db.js";
import mongoose from "mongoose";
const BusinessregisterSchema = new mongoose.Schema({
  Brand_Name: {
    type: String,
    required: false,
  },
  org_name: {
    type: String,
    required: false,
  },
  PAN_NO: {
    type: Number,
    required: false,
  },
  GST_NO: {
    type: String,
    required: false,
  },
  Name: {
    type: String,
    required: false,
  },
  location_id:{
    type: String,
    required: false,
  },

  brand_logo: {
    type: String,
 
    required: false
  },  
  
  aadhar_img: {
    type: String,
 
    required: false
  },                              
  
  pan_img: {
    type: String,
 
    required: false
  }, 
  cover_img: {
    type: String,
    required: false
  },
  agree: {
    type: Boolean,
    required: false
  },
  type_of_service: {
    type: String,
    required: false
  },
  category: {
    type: String,
    required: false
  },
  sub_category: {
    type: String,
    required: false
  },

  status: {
    type: String,
    enum:["active","Inactive","Pending"],
    required: false
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