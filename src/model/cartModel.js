import mongoose from "mongoose";

const cartSchema = new mongoose.Schema({
   
    user_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "users",
        required: true,
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
    images: {
        type: String,
        required: true
    },
    category: {
        type: String,
        required: true
    },
    
    colors: {
        type: String,
        required: true
    },
    size: {
        type: String,
        required: true
    },
    
    quantity: {
        type: Number,
        required: true
    },
    price: {
        type: Number,
        required: true
    },
    unit:{
        type: String,
        required: true 
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