import mongoose from "mongoose";

const deliveryAddressSchema = new mongoose.Schema({
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  fullName: { type: String, required: true },
  PhoneNumber: { type: String, required: true },
  email: { type: String },
  streetAddress: { type: String, required: true },
  apartment: { type: String },
  city: { type: String, required: true },
  state: { type: String, required: true },
  postalCode: { type: String, required: true },
  country: { type: String, required: true },
  lat: { type: Number, required: true },
  lng: { type: Number, required: true },
  deliveryInstructions: { type: String },
}, {
    timestamps: {type:Date,defult:Date.now},
    versionKey: false
  });

deliveryAddressSchema.virtual("deliveryAddress_id").get(function () {
  return this._id.toString();
});

const DeliveryAddressModel = mongoose.model("DeliveryAddress", deliveryAddressSchema);
export default DeliveryAddressModel;
