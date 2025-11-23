const cloudinary = require("cloudinary");
const artDetailModel = require("../models/art");
const draftModel = require("../models/draft");
const userModel = require("../models/user");
const { Client } = require("square");
const crypto = require("crypto");
const artistDetailsModel = require("../models/artistDetails");

const { paymentsApi } = new Client({
  // accessToken: process.env.SQUARE_ACCESS_TOKEN,
});

// Pricing helper
function calculateArtworkPricing(basePrice, commissionPercent) {
  const commissionAmount = (basePrice * commissionPercent) / 100;
  const totalPrice = basePrice + commissionAmount;
  return { commissionAmount, totalPrice };
}

exports.createArt = async (req, res) => {
  try {
    const artistId = req.body.artist;

    console.log("🎯 BACKEND - Received Form Data:");
    console.log("makeOffer:", req.body.makeOffer);
    console.log("isAvailableForSale:", req.body.isAvailableForSale);

    const artistDetails = await artistDetailsModel.findOne({
      userId: artistId,
    });

    if (!artistDetails) {
      return res.status(404).json({ message: "Artist details not found" });
    }

    // ✅ PROPERLY HANDLE THE FIELDS
    const makeOffer = req.body.makeOffer === 'true' || req.body.makeOffer === true;
    const isAvailableForSale = req.body.isAvailableForSale === 'true' || req.body.isAvailableForSale === true;
    const basePrice = req.body.price ? parseFloat(req.body.price) : 0;

    console.log("🎯 BACKEND - Processed Values:");
    console.log("makeOffer (processed):", makeOffer);
    console.log("isAvailableForSale (processed):", isAvailableForSale);

    const commissionPercent = artistDetails.originalPercent || 20;

    // Parse JSON arrays safely
    req.body.medium = JSON.parse(req.body?.medium || "[]");
    req.body.materials = JSON.parse(req.body?.materials || "[]");
    req.body.styles = JSON.parse(req.body?.styles || "[]");

    // Always store price details
    req.body.priceDetails = {
      price: basePrice,
      offerPrice: req.body.offerPrice || basePrice,
    };

    // ✅ STORE THE PROCESSED VALUES
    req.body.makeOffer = makeOffer;
    req.body.isAvailableForSale = isAvailableForSale;

    console.log("🎯 BACKEND - Final values before save:");
    console.log("makeOffer:", req.body.makeOffer);
    console.log("isAvailableForSale:", req.body.isAvailableForSale);

    // Your existing pricing logic...
    if (isAvailableForSale) {
      if (makeOffer) {
        // SCENARIO 1: Make Offer Only (no fixed price)
        req.body.commissionPercent = commissionPercent;
        req.body.commissionAmount = 0;
        req.body.totalPrice = 0;
        req.body.isPublished = true;
        req.body.isForSale = false; // Not available for direct purchase
        req.body.makeOffer = true; // Ensure it's true
        console.log("✅ Artwork created as MAKE OFFER ONLY");
      } else if (basePrice > 0) {
        // SCENARIO 2: Fixed Price (available for sale)
        const { commissionAmount, totalPrice } = calculateArtworkPricing(
          basePrice,
          commissionPercent
        );
        req.body.commissionPercent = commissionPercent;
        req.body.commissionAmount = commissionAmount;
        req.body.totalPrice = totalPrice;
        req.body.isPublished = artistDetails.isArtApprovalReq === false;
        req.body.isForSale = true; // Available for direct purchase
        req.body.makeOffer = false; // Not accepting offers
        console.log("✅ Artwork created as FIXED PRICE");
      } else {
        // SCENARIO 3: Not available
        req.body.commissionPercent = commissionPercent;
        req.body.commissionAmount = 0;
        req.body.totalPrice = 0;
        req.body.isPublished = false;
        req.body.isForSale = false;
        req.body.makeOffer = false;
        console.log("❌ Artwork created as NOT AVAILABLE");
      }
    } else {
      // SCENARIO 4: Not for sale at all (display only)
      req.body.commissionPercent = commissionPercent;
      req.body.commissionAmount = 0;
      req.body.totalPrice = 0;
      req.body.isPublished = true; // Still publish for display
      req.body.isForSale = false;
      req.body.makeOffer = false;
      console.log("📝 Artwork created as DISPLAY ONLY");
    }

    // ✅ Create artwork entry
    const creatingArt = await artDetailModel.create(req.body);

    console.log("🎯 BACKEND - Saved artwork:");
    console.log("_id:", creatingArt._id);
    console.log("makeOffer:", creatingArt.makeOffer);
    console.log("isAvailableForSale:", creatingArt.isAvailableForSale);
    console.log("isForSale:", creatingArt.isForSale);
    console.log("totalPrice:", creatingArt.totalPrice);

    // Rest of your image upload code remains the same...
    let artUploads = [];
    if (req.files?.images && Array.isArray(req.files.images)) {
      artUploads = req.files.images.map((image, index) =>
        cloudinary.v2.uploader
          .upload(image.tempFilePath, { folder: "Arts_Images" })
          .then((uploaded) => ({
            id: uploaded.public_id,
            secure_url: uploaded.secure_url,
            order: index,
          }))
      );
    }

    let thumbnailUpload = null;
    if (req.files?.thumbnail) {
      thumbnailUpload = cloudinary.v2.uploader.upload(
        req.files.thumbnail.tempFilePath,
        {
          folder: "Arts_Images",
        }
      );
    }

    const [artImages, thumbnail] = await Promise.all([
      Promise.all(artUploads),
      thumbnailUpload,
    ]);

    if (artImages.length > 0) {
      await artDetailModel.findByIdAndUpdate(creatingArt._id, {
        $push: { art: { $each: artImages } },
      });
    }

    if (thumbnail) {
      await artDetailModel.findByIdAndUpdate(creatingArt._id, {
        thumbnail: {
          id: thumbnail.public_id,
          secure_url: thumbnail.secure_url,
        },
      });
    }

    await userModel.findByIdAndUpdate(artistId, {
      $push: { art: creatingArt._id },
    });

    res.status(201).send({
      success: true,
      message: "Art Created Successfully",
      artwork: {
        _id: creatingArt._id,
        makeOffer: creatingArt.makeOffer,
        isAvailableForSale: creatingArt.isAvailableForSale,
        isForSale: creatingArt.isForSale,
        totalPrice: creatingArt.totalPrice,
        isPublished: creatingArt.isPublished
      }
    });
  } catch (error) {
    console.error("❌ Error creating art:", error);
    return res.status(500).send({ success: false, message: error.message });
  }
};

exports.createDraft = async (req, res) => {
  try {
    // Generate unique draft ID
    const randomNumber = crypto.randomBytes(4).readUInt32BE(0);
    const uniqueId = `DR-${randomNumber}`;
    req.body.draftId = uniqueId;

    // Optional price handling (drafts can skip price)
    req.body.price = req.body.price ? parseFloat(req.body.price) : 0;
    req.body.makeOffer = req.body.makeOffer === 'true';

    // Create draft entry first
    const creatingArt = await draftModel.create(req.body);

    let uploadedImages = [];
    let thumbnailFile = null;

    // Upload multiple images (if any)
    if (req.files?.images && Array.isArray(req.files.images)) {
      uploadedImages = await Promise.all(
        req.files.images.map(async (singleImage) => {
          const uploaded = await cloudinary.v2.uploader.upload(
            singleImage.tempFilePath,
            { folder: "Arts_Images" }
          );
          return {
            id: uploaded.public_id,
            secure_url: uploaded.secure_url,
          };
        })
      );

      // Save all uploaded images
      if (uploadedImages.length > 0) {
        await draftModel.findByIdAndUpdate(creatingArt._id, {
          $push: { art: { $each: uploadedImages } },
        });
      }
    }

    // Upload thumbnail (required for draft)
    if (req.files?.thumbnail) {
      thumbnailFile = await cloudinary.v2.uploader.upload(
        req.files.thumbnail.tempFilePath,
        { folder: "Arts_Images" }
      );
    } else {
      return res
        .status(400)
        .send({ success: false, message: "Thumbnail not found" });
    }

    // Save thumbnail to draft
    if (thumbnailFile) {
      await draftModel.findByIdAndUpdate(creatingArt._id, {
        thumbnail: {
          id: thumbnailFile.public_id,
          secure_url: thumbnailFile.secure_url,
        },
      });
    }

    return res.status(201).send({
      success: true,
      message: "Draft Created Successfully",
      draftId: uniqueId,
      artImages: uploadedImages.length,
    });
  } catch (error) {
    console.error("Error creating draft:", error);
    return res.status(500).send({ success: false, message: error.message });
  }
};

exports.getAllArt = async (req, res) => {
  try {
    let getAllArt;
    const { criteria, searchCriteria, searchInput } = req.query;

    console.log(criteria, searchCriteria, searchInput);

    if (criteria === "newToOld" && searchCriteria === "none") {
      getAllArt = await artDetailModel
        .find({ isPublished: true })
        .sort({
          createdAt: 1,
        })
        .populate({
          path: "artist",
          select: {
            firstName: 1,
            lastName: 1,
          },
        });
    }

    if (criteria === "incresingPrice" && searchCriteria === "none") {
      getAllArt = await artDetailModel
        .find({ isPublished: true })
        .sort({
          "priceDetails.price": 1,
        })
        .populate({
          path: "artist",
          select: {
            firstName: 1,
            lastName: 1,
          },
        });
    }

    if (criteria === "decreasingPrice" && searchCriteria === "none") {
      getAllArt = await artDetailModel
        .find({ isPublished: true })
        .sort({
          "priceDetails.price": -1,
        })
        .populate({
          path: "artist",
          select: {
            firstName: 1,
            lastName: 1,
          },
        });
    }

    if (criteria === "none") {
      getAllArt = await artDetailModel.find({ isPublished: true }).populate({
        path: "artist",
        select: {
          firstName: 1,
          lastName: 1,
        },
      });
    }

    if (searchCriteria === "Art" && searchInput !== "") {
      console.log("called");
      getAllArt = await artDetailModel.find({
        title: { $regex: searchInput, $options: "i" },
        isPublished: true
      }).populate({
        path: "artist",
        select: {
          firstName: 1,
          lastName: 1,
        },
      });
    }

    if (searchCriteria === "Artist" && searchInput !== "") {
      const users = await userModel.find({
        $or: [
          { firstName: { $regex: searchInput, $options: "i" } },
          { lastName: { $regex: searchInput, $options: "i" } }
        ]
      });
      
      const artistIds = users.map(user => user._id);
      
      getAllArt = await artDetailModel.find({
        artist: { $in: artistIds },
        isPublished: true
      }).populate({
        path: "artist",
        select: {
          firstName: 1,
          lastName: 1,
        },
      });
    }

    return res.status(200).send({ success: true, data: getAllArt });
  } catch (error) {
    return res.status(500).send({ success: false, message: error.message });
  }
};

// Get Art By Id
exports.getArtById = async (req, res) => {
  try {
    const { artID } = req.query;

    const artDetails = await artDetailModel.findOne({ _id: artID }).populate({
      path: "artist",
    });
    if (!artDetails) {
      return res.status(400).send({ success: false, message: "Art not found" });
    }
    return res.status(200).send({ success: true, data: artDetails });
  } catch (error) {
    return res.status(500).send({ success: false, message: error.message });
  }
};

// Searching By ART AND ARTIST
exports.getArtByName = async (req, res) => {
  try {
    const { artByName } = req.query;
    let findArt;
    if (artByName) {
      findArt = await artDetailModel.find({
        title: { $regex: artByName, $options: "i" },
        isPublished: true
      }).populate({
        path: "artist",
        select: {
          firstName: 1,
          lastName: 1,
        },
      });
    }

    if (!findArt) {
      return res.status(400).send({ success: false, message: "art not found" });
    }

    return res.status(200).send({ success: true, data: findArt });
  } catch (error) {
    return res.status(500).send({ success: false, message: error.message });
  }
};

exports.getArtByArtist = async (req, res) => {
  try {
    const { artist } = req.query;
    console.log(artist.split(" ").join(""));

    const queryArtist = artist.split(" ").join("");

    const [firstName, lastName] = artist.split(" ");

    const findUser = await userModel.find({
      $and: [{ firstName }, { lastName }],
    });
    console.log("findUser--->>", findUser);
  } catch (error) {
    return res.status(500).send({ success: false, message: error.message });
  }
};

// filter
exports.filterArt = async (req, res) => {
  try {
    let filteredArts;
    const { sortingCriteria } = req.query;
    const {
      style,
      subject,
      medium,
      minPrice,
      maxPrice,
      material,
      size,
      orientation,
      artistCountry,
      featuredartist,
    } = req.body;

    let query = { isPublished: true };
    console.log(
      "req.body-------=>>>",
      style,
      subject,
      medium,
      minPrice,
      maxPrice,
      material,
      size,
      orientation,
      artistCountry,
      featuredartist
    );

    if (style && style.length > 0) {
      query.styles = { $in: style };
    }

    if (subject && subject.length > 0) {
      query.subject = { $in: subject };
    }

    if (minPrice && maxPrice) {
      query["priceDetails.price"] = { $gte: minPrice, $lte: maxPrice };
    }

    if (medium && medium.length > 0) {
      query.medium = { $in: medium };
    }

    if (material && material.length > 0) {
      query.materials = { $in: material };
    }

    if (orientation && orientation.length > 0) {
      query.orientation = { $in: orientation };
    }

    filteredArts = await artDetailModel.find(query);

    if (sortingCriteria === "newToOld") {
      filteredArts = await artDetailModel.find(query).sort({
        createdAt: 1,
      });
    }

    if (sortingCriteria === "incresingPrice") {
      filteredArts = await artDetailModel.find(query).sort({
        "priceDetails.price": 1,
      });
    }

    if (sortingCriteria === "decreasingPrice") {
      filteredArts = await artDetailModel.find(query).sort({
        "priceDetails.price": -1,
      });
    }

    if (sortingCriteria === "none") {
      filteredArts = await artDetailModel.find(query);
    }

    if (filteredArts.length == 0) {
      return res.status(400).send({ success: false, message: "No art found" });
    }

    return res.status(200).send({ success: true, data: filteredArts });
  } catch (error) {
    return res.status(500).send({ success: false, message: error.message });
  }
};

exports.payment = async (req, res) => {
  try {
    console.log(req.body);

    const { result } = await paymentsApi.createPayment({
      idempotencyKey: randomUUID(),
      sourceId: req.body.sourceId,
      amountMoney: {
        currency: "USD",
        amount: req.query.amount,
      },
    });
    console.log(result);

    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).send({ success: false, message: error.message });
  }
};

// update art
exports.updateArt = async (req, res) => {
  try {
    const artDetail = await artDetailModel.findById({ _id: req.query.artId });

    if (!artDetail) {
      return res.status(400).send("Art doesn't exist");
    }

    const updatedArt = await artDetailModel.findByIdAndUpdate(
      { _id: req.query?.artId },
      req.body
    );

    return res.status(200).send({ success: true, data: updatedArt });
  } catch (error) {
    return res.status(500).send({ success: false, message: error.message });
  }
};

// delete art
exports.deleteArt = async (req, res) => {
  try {
    await artDetailModel.findByIdAndDelete({ _id: req.query.artId });
    return res.status(200).send("Art Deleted");
  } catch (err) {
    return res.status(500).send({ success: false, message: err.message });
  }
};

exports.newFilterArt = async (req, res) => {
  try {
    let filteredArts;
    const { sortingCriteria, searchCriteria, searchInput, page = 1, limit = 12 } = req.query;
    const {
      style,
      subject,
      medium,
      minPrice,
      maxPrice,
      material,
      size,
      orientation,
      artistCountry,
      featuredartist,
    } = req.body;

    let query = { isPublished: true };
    let searchquery = {};

    console.log("body==========>", req.body);

    // Handle the body-based filters
    if (style && style.length > 0) {
      query.styles = { $in: style.map((s) => new RegExp(s, "i")) };
    }

    if (subject && subject.length > 0) {
      query.subject = { $in: subject.map((s) => new RegExp(s, "i")) };
    }

    if (minPrice && maxPrice) {
      query["priceDetails.price"] = { $gte: minPrice, $lte: maxPrice };
    }

    if (medium && medium.length > 0) {
      query.medium = { $in: medium.map((m) => new RegExp(m, "i")) };
    }

    if (material && material.length > 0) {
      query.materials = { $in: material.map((m) => new RegExp(m, "i")) };
    }

    if (orientation && orientation.length > 0) {
      query.orientation = { $in: orientation.map((o) => new RegExp(o, "i")) };
    }

    if (artistCountry && artistCountry.length > 0) {
      query.artistCountry = {
        $in: artistCountry.map((c) => new RegExp(c, "i")),
      };
    }

    if (featuredartist && featuredartist.length > 0) {
      query.featuredArtist = {
        $in: featuredartist.map((f) => new RegExp(f, "i")),
      };
    }

    // Sorting logic
    const sortOption =
      sortingCriteria === "newToOld"
        ? { createdAt: -1 }
        : sortingCriteria === "priceLowHigh"
        ? { "priceDetails.price": 1 }
        : sortingCriteria === "priceHighLow"
        ? { "priceDetails.price": -1 }
        : null;

    // Handle search by Art title or Artist name
    if (searchCriteria === "Art" && searchInput) {
      searchquery.title = { $regex: searchInput, $options: "i" };
    }

    if (searchCriteria === "Artist" && searchInput) {
      searchquery.artistFullName = { $regex: searchInput, $options: "i" };
    }

    // Check if there are no filters or search applied
    const noFiltersApplied =
      !searchCriteria &&
      (!style || style.length === 0) &&
      (!subject || subject.length === 0) &&
      (!medium || medium.length === 0) &&
      (!minPrice || !maxPrice) &&
      (!material || material.length === 0) &&
      (!size || size.length === 0) &&
      (!orientation || orientation.length === 0) &&
      (!artistCountry || artistCountry.length === 0) &&
      (!featuredartist || featuredartist.length === 0);

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    let totalArts = 0;

    // If no filters are applied, return all arts using a simple find query with sorting
    if (noFiltersApplied) {
      totalArts = await artDetailModel.countDocuments({ isPublished: true });
      
      let artsQuery = artDetailModel
        .find({ isPublished: true })
        .populate({
          path: "artist",
          select: { firstName: 1, lastName: 1 },
        });

      if (sortOption) {
        artsQuery = artsQuery.sort(sortOption);
      }

      filteredArts = await artsQuery
        .skip(skip)
        .limit(limitNum);

      console.log("All arts returned (no filters)==========>", filteredArts.length);
    } else {
      // Use aggregation if there are filters or search criteria
      const pipeline = [
        {
          $match: {
            isPublished: true,
          },
        },
        {
          $lookup: {
            from: "users",
            localField: "artist",
            foreignField: "_id",
            as: "artist",
          },
        },
        {
          $unwind: {
            path: "$artist",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $lookup: {
            from: "artistdetails",
            localField: "artist._id",
            foreignField: "userId",
            as: "artistDetails",
          },
        },
        {
          $unwind: {
            path: "$artistDetails",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $addFields: {
            artistFullName: {
              $toLower: {
                $concat: [
                  { $ifNull: ["$artist.firstName", ""] },
                  " ",
                  { $ifNull: ["$artist.lastName", ""] },
                ],
              },
            },
            artistCountry: "$artistDetails.country",
          },
        },
        {
          $match: {
            ...query,
            ...searchquery,
          },
        },
      ];

      if (artistCountry && artistCountry.length > 0) {
        pipeline.push({
          $match: {
            artistCountry: {
              $in: artistCountry.map((c) => new RegExp(c, "i")),
            },
          },
        });
      }

      // Count total matching documents
      const countPipeline = [...pipeline];
      countPipeline.push({ $count: "total" });
      const countResult = await artDetailModel.aggregate(countPipeline);
      totalArts = countResult.length > 0 ? countResult[0].total : 0;

      // Only add the $sort stage if sorting criteria is provided
      if (sortOption) {
        pipeline.push({ $sort: sortOption });
      }

      // Add pagination
      pipeline.push({ $skip: skip }, { $limit: limitNum });

      filteredArts = await artDetailModel.aggregate(pipeline);

      console.log("Filtered arts with filters==========>", filteredArts.length);
    }

    // If no results are found
    if (filteredArts.length === 0) {
      return res.status(400).send({ success: false, message: "No art found" });
    }

    const totalPages = Math.ceil(totalArts / limitNum);

    return res.status(200).send({ 
      success: true, 
      data: filteredArts,
      pagination: {
        currentPage: pageNum,
        totalPages: totalPages,
        totalArts: totalArts,
        hasNext: pageNum < totalPages,
        hasPrev: pageNum > 1
      }
    });
  } catch (error) {
    return res.status(500).send({ success: false, message: error.message });
  }
};