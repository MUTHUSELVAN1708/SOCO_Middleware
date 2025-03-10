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
      ref: "products",
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
    delivery_method: {
      type: String,
      required: false,
    },
    delivery_partner: {
      name: { type: String },
      tracking_number: { type: String, default: null },
    },
    estimated_delivery_date: { type: Date },

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
      ],
      default: "Pending",
    },
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
