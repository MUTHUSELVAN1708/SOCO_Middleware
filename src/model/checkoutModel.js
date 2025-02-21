import mongoose from "mongoose";

const checkoutSchema = new mongoose.Schema({
    user_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "users",
        // required: true,
    },
    cart_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "carts",
        // required: true,
    },
    product_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "products",
        // required: true,
    },
    images: [{
        type: String,
        required: true
    }],
    size: {
        type: String,
        // required: true
    },
    phone_number: {
        type: Number,
        // required: true
    },
    price: {
        type: Number,
        // required: true
    },
    address: {
        street: {
            type: String,
            required: true
        },
        city: {
            type: String,
            required: true
        },
        zipcode: {
            type: Number,
            required: true
        },
        district: {
            type: String,
            required: true
        }, state: {
            type: String,
            required: true
          },
          country: {
            type: String,
            required: true
          }
    },
    
    paymentMode:{
        type: String,
        // required: true  
    },
    razorpay_order_id: {
        type: String,
        // required: true
    },
    razorpay_payment_id:{
        type: String,
        // required: true  
    },
    paymentStatus:{
        type: String,
        // required: true  
    },
    quantity: {
        type: Number,
        required: true
    },
    status: {
        type: String,
        enum: ["Pending", "Processing", "Shipped", "Out for Delivery", "Delivered", "Cancelled"],
        default: "Pending"
    },
    tracking_number: { type: String, default: null },
    courier_service: { type: String, default: "Delhivery" },
    expected_delivery_date: { type: String },
    tracking_updates: [
        {
            status: String,
            timestamp: Date
        }
    ],
    timestamp: { type: Date, default: Date.now },

}, {
    versionKey: false
})

checkoutSchema.virtual('checkout_id').get(function () {
    return this._id.toString();
});

const checkoutModel = mongoose.model("checkout", checkoutSchema);

export default checkoutModel;