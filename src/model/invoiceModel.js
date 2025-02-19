import mongoose from "mongoose";

const invoiceSchema = new mongoose.Schema(
  {
    checkout_id: {
      type:mongoose.Schema.Types.ObjectId,
      ref: "checkouts",

    },

    invoiceNumber: { type: String},
    invoiceDate: { type: Date, default: Date.now },
    // productName: { type: String },
    product_size: { type: String },
    price: { type: Number },

    timestamp: { type: Date, default: Date.now },
  },
  { versionKey: false }
);

const invoiceModel = mongoose.model("Invoices", invoiceSchema);

export default invoiceModel;
