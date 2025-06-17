const mongoose = require("mongoose");
const ObjectId = mongoose.Schema.Types.ObjectId;

const artDetailsSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      trim: "true",
    },
    art: [Object],
    thumbnail: {
      id: {
        type: String,
      },
      secure_url: {
        type: String,
      },
    },
    category: {
      type: String,
      default: "Painting",
    },
    printOption: {
      type: String,
    },
    subject: {
      type: String,
    },
    year: {
      type: String,
    },
    orientation: {
      type: String,
    },
    medium: [{ type: String }],
    materials: [{ type: String }],
    styles: [{ type: String }],
    width: {
      type: String,
    },
    height: {
      type: String,
    },
    depth: {
      type: String,
    },
    priceDetails: {
      minPrice: { type: Number },
      price: { type: Number },
      offerPrice: { type: Number },
      currency: { type: String },
    },
    adminPrice: {
      type: String, //how much price admin will get by print art
    },
    commissionPercent: {
      type: Number, //how much is the commision Percent
    },
    commissionAmount: {
      type: Number, //how much is the commision amount
    },
    totalPrice: {
      type: Number, //commissionAmount + price
    },

    // Sales & Commission Details
    isOriginalSold: { type: Boolean, default: false },
    // Print copies tracking
    printCopies: [
      {
        dimension: { type: String},
        saleCount: { type: Number},
        totalSales: { type: Number},//amount
      },
    ],

    keywords: [{ type: String }],
    description: {
      type: String,
    },
    isFeatured: {
      type: Boolean,
    },
    isPublished: {
      type: Boolean, //published true or nor
      default: false,
    },
    isAdultContent: {
      type: Boolean,
      default: false,
    },
    wishlisted: {
      type: Boolean,
      default: false,
    },
    InQueue: {
      type: Boolean,
      default: false,
    },
    artist: {
      type: ObjectId,
      ref: "user",
    },
    original: {
      type: Boolean      
    },
    print: {
      type: Boolean,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("artDetails", artDetailsSchema);
