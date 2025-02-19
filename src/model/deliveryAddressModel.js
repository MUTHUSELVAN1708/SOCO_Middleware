import mongoose from "mongoose";

const deliveryAddressSchema = new mongoose.Schema(
  {
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    fullName: { type: String, required: true, trim: true },
    phoneNumber: { 
      type: String, 
      required: true, 
      match: /^[0-9]{10}$/,  // Regex for 10-digit phone numbers
    },
    email: { 
      type: String, 
      match: /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,4}$/, // Simple email regex
    },
    streetAddress: { type: String, required: true, trim: true },
    apartment: { type: String, trim: true },
    city: { type: String, required: true, trim: true },
    state: { type: String, required: true, trim: true },
    postalCode: { 
      type: String, 
      required: true, 
      match: /^[0-9]{5,6}$/, // Postal code regex (for 5-6 digits)
    },
    country: { type: String, required: true, trim: true },
    lat: { type: Number, required: true },
    lng: { type: Number, required: true },
    deliveryInstructions: { type: String, trim: true },
    isDefault: { type: Boolean, default: false }, // Whether this is the default address
    addressType: { 
      type: String, 
      enum: ['home', 'work', 'other'], // Possible address types
      default: 'home',
    },
    status: { 
      type: String, 
      enum: ['active', 'inactive'], 
      default: 'active', // Status for whether the address is active
    },
    isVerified: { 
      type: Boolean, 
      default: false, // Whether the address is verified by the user or admin
    },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    versionKey: false,
  }
);

deliveryAddressSchema.virtual("deliveryAddress_id").get(function () {
  return this._id.toString();
});

const DeliveryAddressModel = mongoose.model("DeliveryAddress", deliveryAddressSchema);
export default DeliveryAddressModel;
