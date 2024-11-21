// import mongoose from "../db/db.js";
import mongoose from "mongoose";
const locationSchema = new mongoose.Schema({


    address: {
        forbusiness: {
            type: Boolean,
            required: true
        },
        lat: {
            type: Number,
            required: true
        },
        lng: {
            type: Number,
            required: true
        },
        street: {
            type: String,
            required: true
        },
        city: {
            type: String,
            required: true
        },
        district: {
            type: String,
            required: true
        },
        country: {
            type: String,
            required: true
        },
        Pincode: {
            type: Number,
            required: true
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