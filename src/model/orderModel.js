import mongoose from "mongoose";

const orderSchema = new mongoose.Schema(
  {
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "users",
      required: true,
    },
    seller_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "sellers",
      required: true,
    },
    product_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },

    // Seller Review Section
    seller_review_status: {
      type: String,
      enum: ["Pending", "Reviewed", "Rejected"],
      default: "Pending",
    },
    seller_price_offer: { type: Number }, 
    seller_notes: { type: String }, 

    // Buyer Approval Section
    buyer_approval_status: {
      type: String,
      enum: ["Pending", "Accepted", "Rejected"],
      default: "Pending",
    },
    final_price: { type: Number },

    // Payment Details
    payment_mode: { type: String },
    razorpay_order_id: { type: String },
    razorpay_payment_id: { type: String },
    payment_status: {
      type: String,
      enum: ["Pending", "Completed", "Failed"],
      default: "Pending",
    },

    // Delivery Details
    delivery_address_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "DeliveryAddress",
      required: true,
    },
    delivery_method: { type: String },
    cancel_reason: { type: String },
    cancel_category: { type: String },
    additionalCommentsForCancel: { type: String },
    delivery_partner: {
      name: { type: String },
      tracking_number: { type: String, default: null },
    },
    estimated_delivery_date: { type: Date },
    delivery_charge: { type: Number, default: 0 }, // Added delivery charge field

    // New Fields
    return_type: { type: String, default: "No Return" }, // Return type: No Return, 7 Days, etc.
    delivery_type: { type: String, default: "Standard" }, // Delivery type: Standard, Express
    special_instructions: { type: String }, // Extra instructions from seller
    needs_signature: { type: Boolean, default: false }, // Whether signature is required
    is_fragile: { type: Boolean, default: false }, // If the product is fragile

    // Order Tracking
    order_status: {
      type: String,
      enum: [
        "Pending",
        "Accepted",
        "Processing",
        "Out for Delivery",
        "Delivered",
        "Cancelled",
        "Confirmed", // Added Confirmed status
      ],
      default: "Pending",
    },
    total_price: { type: Number, default: 0 },
    seller_delivery_status: {
      type: String,
      enum: ["Not Started", "In Transit", "Delivered"],
      default: "Not Started",
    },
    tracking_info: [
      {
        status: String,
        timestamp: { type: Date, default: Date.now },
      },
    ],

    timestamp: { type: Date, default: Date.now },
  },
  { versionKey: false }
);

// Virtual ID for frontend usage
orderSchema.virtual("order_id").get(function () {
  return this._id.toString();
});

const Order = mongoose.model("Order", orderSchema);
export default Order;
