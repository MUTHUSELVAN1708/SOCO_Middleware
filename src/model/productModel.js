import mongoose from "mongoose";

const productSchema = new mongoose.Schema(
    {
      productName: {
        type: String,
        required: true,
        trim: true,
      },
      business_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Business', // Referencing the business collection
        required: true,
      },
      category: {
        type: String,
        required: true,
      },
      subCategory: {
        type: String,
        required: true,
      },
      productDescription: {
        type: String,
        trim: true,
      },
      brand: {
        type: String,
        trim: true,
      },
      price: {
        type: Number,
        required: true,
        min: 0,
      },
      originalPrice: {
        type: Number,
        required: true,
        min: 0,
      },
      discountPercentage: {
        type: Number,
        default: 0,
        min: 0,
        max: 100,
      },
      quantityAvailable: {
        type: Number,
        required: true,
        min: 0,
      },
      unitsSold: {
        type: Number,
        default: 0,
        min: 0,
      },
      SKU: {
        type: String,
        unique: true,
        required: true,
      },
      images: [
        {
          type: String,
          required: true,
        },
      ],
      videos: [
        {
          type: String,
        },
      ],
      size: [
        {
          type: String,
        },
      ],
      colors: [
        {
          type: String,
        },
      ],
      weight: {
        type: String,
      },
      dimensions: {
        length: { type: String },
        width: { type: String },
        height: { type: String },
      },
      ratings: {
        average: {
          type: Number,
          default: 0,
          min: 0,
          max: 5,
        },
        totalRatings: {
          type: Number,
          default: 0,
          min: 0,
        },
        reviewsCount: {
          type: Number,
          default: 0,
          min: 0,
        },
      },
      isActive: {
        type: Boolean,
        default: true,
      },
      isFeatured: {
        type: Boolean,
        default: false,
      },
      tags: [
        {
          type: String,
        },
      ],
    },
    { timestamps: true },{ versionKey: false });

productSchema.virtual("product_id").get(function () {
    return this._id.toString();
  });
 const productModel=mongoose.model("Product", productSchema);


 export default productModel;