import mongoose from "mongoose";

const reviewReplySchema = new mongoose.Schema({
  id: { type: String, required: false },
  userName: { type: String, required: false },
  userAvatar: String,
  reply: { type: String, required: false },
  datePosted: { type: Date, required: false },
  isSellerResponse: { type: Boolean, default: false },
  isEdited: { type: Boolean, default: false }
});

const reviewSchema = new mongoose.Schema({
  id: { type: String, required: false },
  userName: { type: String, required: false },
  userAvatar: String,
  rating: { type: Number, required: false },
  review: { type: String, required: false },
  datePosted: { type: Date, required: false },
  isVerifiedPurchase: { type: Boolean, required: false },
  reviewImages: [String],
  replies: [reviewReplySchema],
  helpfulCount: { type: Number, default: 0 },
  isEdited: { type: Boolean, default: false }
});

const productSchema = new mongoose.Schema({
  basicInfo: {
    productTitle: { type: String, required: false, trim: false },
    brand: { type: String, required: false },
    categories: {
      type: Map,
      of: [String]  
    },
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
    description: { type: String, required: false },
    highlights: [String]
  },
  pricing: {
    regularPrice: { type: String, required: false },
    salePrice: { type: String, required: false },
    discount: String,
    currency: { type: String, default: 'INR' },
    gstDetails: {
      gstIncluded: { type: Boolean, default: false },
      gstPercentage: { type: Number, default: 18 }
    },
    additionalTaxes: [
      {
        name: { type: String },
        percentage: { type: Number},
      },
    ],
  },
  availability: {
    inStock: { type: Boolean, default: false },
    stockQuantity: { type: Number, required: false },
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
    color: String,
    variant: String,
    quantity: Number,
    sku: { 
      type: String,
      required: true  // Make SKU required
    },
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
    isTermsVisible: { type: Boolean, default: false }
  },
  localization: {
    supportedLanguages: [String],
    defaultLanguage: { type: String, default: 'en' },
    regionalCurrency: { type: String, default: 'INR' },
    priceInRegionalCurrency: { type: Boolean, default: false }
  },
  paymentMethods: {
    onlinePayment: { type: Boolean, default: false },
    cod: { type: Boolean, default: false },
    upi: { type: Boolean, default: false },
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
    required: false
  }
}, {
  timestamps: true,
  versionKey: false
});

productSchema.index({ 'basicInfo.productTitle': 'text', 'basicInfo.tags': 'text' });
productSchema.index({ 'pricing.regularPrice': 1 });
productSchema.index({ 'availability.inStock': 1 });
productSchema.index({ 'ratings.averageRating': 1 });
productSchema.index({ 'variants.sku': 1 }, { unique: true, sparse: true });


const Product = mongoose.model('Product', productSchema);
export default Product;