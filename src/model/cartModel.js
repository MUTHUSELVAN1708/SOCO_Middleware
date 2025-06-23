import mongoose from "mongoose";

const cartSchema = new mongoose.Schema({
   
    user_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "users",
        required: true,
    },
    post_id:{
        type: mongoose.Schema.Types.ObjectId,
        ref: "post",
        required: true
    },
    product_id : {
        type: mongoose.Schema.Types.ObjectId,
        ref: "products",
        required: true
    },
    productName: {
        type: String,
        required: true
    },
    images:[ {
        type: String,
        required: true
    }],
    category: {
        type: Object,
        required: false
    },
    
    colors: {
        type: String,
        required: false
    },
    size: {
        type: String,
        required: false
    },
    
    quantity: {
        type: Number,
        required: false
    },
    price: {
        type: Number,
        required: true
    },
    gst: {
        type: Number,
        required: false
    },
    originalPrice: {
        type: Number,
        required: true
    },
    discount: {
        type: Number,
        required: true
    },
    unit:{
        type: String,
        required: false 
    },

    timestamp: { type: Date, default: Date.now },

}, {
    versionKey: false
})

cartSchema.virtual('cart_id').get(function () {
    return this._id.toString();
});

const cartModel = mongoose.model("cart", cartSchema);

export default cartModel;