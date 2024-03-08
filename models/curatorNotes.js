const mongoose = require("mongoose");

const artistDetailSchema = new mongoose.Schema({
  artist: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "artistDetails",
  },
  Facebook: {
    type: String,
  },
  Twitter: {
    type: String,
  },
  Pinterest: {
    type: String,
  },
  TikTok: {
    type: String,
  },
  Instagram: {
    type: String,
  },
  Website: {
    type: String,
  },
  gender: {
    type: String,
  },
  ethnicity: [{ type: String }],
  commissionForPrivateClients: {
    type: Boolean,
  },
  commissionForHotelAndCorporate: {
    type: Boolean,
  },
  murals: {
    type: Boolean,
  },
  muralsExperience: {
    type: Boolean,
  },
  printCustomDimension: {
    type: Boolean,
  },
  printOverSizedDimension: {
    type: Boolean,
  },
  customFraming: {
    type: Boolean,
  },
  hotelProjects: {
    type: Boolean,
  },
  NegotiateRoyaltyPayment: {
    type: Boolean,
  },
  customFramingForHotelAndHospital: {
    type: Boolean,
  },
  charity: {
    type: Boolean,
  },

  SpecificCharitySupport: {
    type: Boolean,
  },
  personalCharities: [{ type: String }],
  ArtIncludeGenderOrEthinicity: {
    type: Boolean,
  },
  artisticThemes: [{ type: String }],
});

module.exports = mongoose.model("artistNotes", artistDetailSchema);
