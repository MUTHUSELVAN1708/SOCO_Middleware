import mongoose from "mongoose";

const serviceSchema = new mongoose.Schema({
    name: { type: String, required: true, unique: true },
    description: { type: String, default: "" },
    iconUrl: { type: String, default: "" },
    category: { type: String, required: true },
    userCount: { type: Number, default: 1 },
    isPopular: { type: Boolean, default: false },
    rating: { type: Number, default: 0 },
}, { timestamps: true });


const ServiceModel = mongoose.model("Service", serviceSchema);
export default ServiceModel;
