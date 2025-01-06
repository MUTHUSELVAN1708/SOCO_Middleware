import mongoose from "mongoose";

const productSchema = new mongoose.Schema({
       
          productTitle: { type: String, required: true },
          brand: { type: String, required: true },
          categories: [{ type: String }],
          tags: [{ type: String }],
          seoTitle: { type: String },
          seoDescription: { type: String },
          seoKeywords: [{ type: String }],
          searchMetadata: {
            synonyms: [{ type: String }],
            alternateSpellings: [{ type: String }]
          },
        images: [{ type: String }],
        descriptionHighlights: {
          description: { type: String },
          highlights: [{ type: String }]
        },
        pricing: {
          regularPrice: { type: Number, required: true },
          salePrice: { type: Number },
          discount: { type: String },
          currency: { type: String, required: true },
          gstDetails: {
            gstIncluded: { type: Boolean },
            gstPercentage: { type: Number }
          }
        },
        availability: {
          inStock: { type: Boolean },
          stockQuantity: { type: Number },
          deliveryTime: { type: String },
          availabilityRegions: [{ type: String }],
          codAvailable: { type: Boolean },
          returnPolicy: {
            returnApplicable: { type: Boolean },
            returnWindow: { type: Number },
            returnFees: { type: Number }
          }
        },
        variants: [
          {
            id: { type: String },
            color: { type: String },
            variant: { type: String },
            quantity: { type: Number },
            sku: {
              type: String,
              unique: true, 
              required: true,
            },
            variantImages: [{ type: String }]
          }
        ],
        specifications: [
          {
            key: { type: String },
            value: { type: String }
          }
        ],
        deliveryConfig: {
          type: { type: String },
          fixedCharge: { type: Number },
          isFreeShipping: { type: Boolean },
          minOrderForFreeShipping: { type: Number },
          maxDeliveryDistance: { type: Number },
          deliveryPinCodes: [{ type: Number }],
          deliveryPartner: { type: String },
          isReturnApplicable: { type: Boolean },
          returnWindow: { type: Number },
          returnPolicyFees: { type: Number }
        },
        ratings: {
          averageRating: { type: Number },
          totalReviews: { type: Number },
          reviewHighlights: [
            {
              rating: { type: Number },
              review: { type: String }
            }
          ]
        },
        careInstructions: { type: String },
        materials: [
          {
            material: { type: String },
            percentage: { type: String }
          }
        ],
        policySection: {
          isChecked: { type: Boolean },
          isTermsVisible: { type: Boolean }
        },
        localization: {
          supportedLanguages: [{ type: String }],
          defaultLanguage: { type: String },
          regionalCurrency: { type: String },
          priceInRegionalCurrency: { type: Boolean }
        },
        paymentMethods: {
          onlinePayment: { type: Boolean },
          cod: { type: Boolean },
          upi: { type: Boolean },
          wallets: [{ type: String }]
        },
        crossSellProducts: [
          {
            productId: { type: String },
            productTitle: { type: String },
            price: { type: Number },
            currency: { type: String }
          }
        ],
        festivalOffers: {
          diwaliOffer: {
            discount: { type: String },
            offerDescription: { type: String }
          },
          holiOffer: {
            discount: { type: String },
            offerDescription: { type: String }
          }
        }
      }, { versionKey:false,timestamps: true });
      
 

productSchema.virtual("product_id").get(function () {
    return this._id.toString();
  });
 const productModel=mongoose.model("Product", productSchema);


 export default productModel;