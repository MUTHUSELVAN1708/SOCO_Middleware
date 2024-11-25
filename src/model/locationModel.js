// import mongoose from "../db/db.js";
import mongoose from "mongoose";
const locationSchema = new mongoose.Schema({


    address: {
        forbusiness: {
            type: Boolean,
            required: false
        },
        lat: {
            type: Number,
            required: false
        },
        lng: {
            type: Number,
            required: false
        },
        street: {
            type: String,
            required: false
        },
        city: {
            type: String,
            required: false
        },
        district: {
            type: String,
            required: false
        },
        country: {
            type: String,
            required: false
        },
        Pincode: {
            type: Number,
            required: false
        },
    },

    timestamp: {
        type: Date,
        default: Date.now
    },
}, {
    versionKey: false
});
locationSchema.virtual("location_id").get(function () {
    return this._id.toString();
});
const locationModel = mongoose.model("location", locationSchema);

export default locationModel;