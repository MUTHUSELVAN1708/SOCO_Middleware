import mongoose from "mongoose";

const reviewReplySchema = new mongoose.Schema({
  id: { type: String, required: true },
  userName: { type: String, required: true },
  userAvatar: String,
  reply: { type: String, required: true },
  datePosted: { type: Date, required: true },
  isSellerResponse: { type: Boolean, default: false },
  isEdited: { type: Boolean, default: false }
});

const reviewSchema = new mongoose.Schema({
  id: { type: String, required: true },
  userName: { type: String, required: true },
  userAvatar: String,
  rating: { type: Number, required: true },
  review: { type: String, required: true },
  datePosted: { type: Date, required: true },
  isVerifiedPurchase: { type: Boolean, required: true },
  reviewImages: [String],
  replies: [reviewReplySchema],
  helpfulCount: { type: Number, default: 0 },
  isEdited: { type: Boolean, default: false }
});

const productSchema = new mongoose.Schema({
  basicInfo: {
    productTitle: { type: String, required: true, trim: true },
    brand: { type: String, required: true },
    categories: [{ type: String, required: true }],
    tags: [String],
    seoTitle: String,
    seoDescription: String,
    seoKeywords: [String],
    searchMetadata: {
      synonyms: [String],
      alternateSpellings: [String]
    }
  },
  images: [String],
  descriptionHighlights: {
    description: { type: String, required: true },
    highlights: [String]
  },
  pricing: {
    regularPrice: { type: Number, required: true },
    salePrice: Number,
    discount: String,
    currency: { type: String, default: 'INR' },
    gstDetails: {
      gstIncluded: { type: Boolean, default: true },
      gstPercentage: { type: Number, default: 18 }
    },
    tax: Number
  },
  availability: {
    inStock: { type: Boolean, default: true },
    stockQuantity: { type: Number, required: true },
    deliveryTime: String,
    availabilityRegions: [String],
    codAvailable: Boolean,
    returnPolicy: {
      returnApplicable: Boolean,
      returnWindow: Number,
      returnFees: Number
    }
  },
  variants: [{
    id: { type: String, required: true },
    color: String,
    variant: String,
    quantity: { type: Number, required: true },
    sku: { type: String, required: true },
    variantImages: [String]
  }],
  specifications: [{
    key: String,
    value: String
  }],
  deliveryConfig: {
    type: { type: String, enum: ['Fixed', 'Dynamic'], default: 'Fixed' },
    fixedCharge: Number,
    isFreeShipping: { type: Boolean, default: false },
    minOrderForFreeShipping: Number,
    maxDeliveryDistance: Number,
    deliveryPinCodes: [Number],
    deliveryPartner: String,
    isReturnApplicable: Boolean,
    returnWindow: Number,
    returnPolicyFees: Number
  },
  ratings: {
    averageRating: { type: Number, default: 0 },
    totalReviews: { type: Number, default: 0 },
    ratingDistribution: {
      type: Map,
      of: Number,
      default: new Map([
        ['1', 0],
        ['2', 0],
        ['3', 0],
        ['4', 0],
        ['5', 0]
      ])
    },
    reviews: [reviewSchema]
  },
  careInstructions: String,
  materials: [{
    material: String,
    percentage: String
  }],
  policySection: {
    isChecked: { type: Boolean, default: false },
    isTermsVisible: { type: Boolean, default: true }
  },
  localization: {
    supportedLanguages: [String],
    defaultLanguage: { type: String, default: 'en' },
    regionalCurrency: { type: String, default: 'INR' },
    priceInRegionalCurrency: { type: Boolean, default: true }
  },
  paymentMethods: {
    onlinePayment: { type: Boolean, default: true },
    cod: { type: Boolean, default: true },
    upi: { type: Boolean, default: true },
    wallets: [String]
  },
  crossSellProducts: [{
    productId: String,
    productTitle: String,
    price: String,
    currency: String
  }],
  festivalOffers: {
    type: Map,
    of: {
      discount: String,
      offerDescription: String
    }
  },
  status: {
    type: String,
    enum: ['draft', 'published', 'archived'],
    default: 'draft'
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true,
  versionKey: false
});

productSchema.index({ 'basicInfo.productTitle': 'text', 'basicInfo.tags': 'text' });
productSchema.index({ 'pricing.regularPrice': 1 });
productSchema.index({ 'availability.inStock': 1 });
productSchema.index({ 'ratings.averageRating': 1 });

const Product = mongoose.model('Product', productSchema);
export default Product;