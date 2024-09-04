const cloudinary = require("cloudinary");
const artDetailModel = require("../models/art");
const draftModel = require("../models/draft");
const userModel = require("../models/user");
const { Client } = require("square");
const crypto = require("crypto");

const { paymentsApi } = new Client({
  // accessToken: process.env.SQUARE_ACCESS_TOKEN,
});

exports.createArt = async (req, res) => {
  console.log("req.body------->", req.body);

  priceDetail = {
    price: req.body?.price,
    offerPrice: req.body?.offerPrice,
  };
  req.body.medium = JSON.parse(req.body?.medium);
  req.body.materials = JSON.parse(req.body?.materials);
  req.body.styles = JSON.parse(req.body?.styles);
  req.body.priceDetails = priceDetail;

  try {
    const creatingArt = await artDetailModel.create(req.body);

    if (req.files?.images && Array.isArray(req.files.images)) {
      for (let i = 0; i < req.files.images.length; i++) {
        const singleImage = req.files.images[i];

        const uploadedImage = await cloudinary.v2.uploader.upload(
          singleImage.tempFilePath,
          { folder: "Arts_Images" }
        );

        if (uploadedImage) {
          await artDetailModel.findOneAndUpdate(
            { _id: creatingArt._id },
            {
              $push: {
                art: {
                  id: uploadedImage.public_id,
                  secure_url: uploadedImage.secure_url,
                  order: i, // You can optionally store the order/index
                },
              },
            }
          );
        }
      }
    }

    if (req.files.thumbnail) {
      const thumbnailFile = await cloudinary.v2.uploader.upload(
        req.files.thumbnail.tempFilePath,
        { folder: "Arts_Images" }
      );

      const imageThumbnail = {
        id: thumbnailFile.public_id,
        secure_url: thumbnailFile.secure_url,
      };

      await artDetailModel.findOneAndUpdate(
        { _id: creatingArt._id },
        { thumbnail: imageThumbnail }
      );
    }

    // Push art id in user Art
    await userModel.findOneAndUpdate(
      { _id: req.body.artist },
      { $push: { art: creatingArt._id } }
    );

    res.status(201).send({
      success: true,
      message: "Art Created Successfully",
    });
  } catch (error) {
    return res.status(500).send({ success: false, message: error.message });
  }
};

exports.createDraft = async (req, res) => {
  try {
    let uploadedImage;
    let thumbnailFile;

    // Generate a random number
    const randomNumber = crypto.randomBytes(4).readUInt32BE(0);

    // Format the ID
    const uniqueId = `DR-${randomNumber}`;

    req.body.draftId = uniqueId;
    const creatingArt = await draftModel.create(req.body);

    if (req.files?.images) {
      console.log("req.files?.images------->", req.files?.images);
      req.files?.images?.forEach(async (singleImage) => {
        uploadedImage = await cloudinary.v2.uploader.upload(
          singleImage.tempFilePath,
          { folder: "Arts_Images" }
        );
        console.log("uploadedImage------->", uploadedImage);

        if (uploadedImage) {
          const updateImage = await draftModel.findOneAndUpdate(
            { _id: creatingArt?._id },
            {
              $push: {
                art: {
                  id: uploadedImage?.public_id,
                  secure_url: uploadedImage?.secure_url,
                },
              },
            }
          );
        }

        return res.status(201).send({
          success: true,
          message: "Draft Created Successfully",
        });
      });
    }

    if (req.files?.thumbnail) {
      thumbnailFile = await cloudinary.v2.uploader.upload(
        req.files.thumbnail.tempFilePath,
        { folder: "Arts_Images" }
      );
    } else {
      return res.status(400).send({ message: "Thumbnail mot found" });
    }

    console.log("thumbnail------->", req.files.thumbnail);
    console.log("thumbnailFile------->", thumbnailFile);

    const imageThumbnail = thumbnailFile && {
      id: thumbnailFile.public_id,
      secure_url: thumbnailFile.secure_url,
    };

    if (imageThumbnail) {
      await draftModel.findOneAndUpdate(
        { _id: creatingArt?._id },
        { thumbnail: imageThumbnail }
      );
    }
  } catch (error) {
    return res.status(500).send({ success: false, message: error.message });
  }
};

// updateDraft

exports.getAllArt = async (req, res) => {
  try {
    let getAllArt;
    // const { date, incresingPrice, decreasingPrice } = req.query;
    const { criteria, searchCriteria, searchInput } = req.query;

    console.log(criteria, searchCriteria, searchInput);

    if (criteria === "newToOld" && searchCriteria === "none") {
      getAllArt = await artDetailModel
        .find()
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
        .find()
        .sort({
          price: 1,
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
        .find()
        .sort({
          price: -1,
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
      getAllArt = await artDetailModel.find().populate({
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
      });
    }

    // if ((searchCriteria === "Artist" && searchInput!=="")) {
    //   getAllArt = await artDetailModel.find({
    //     // title: { $regex: artTitle, $options: "i" },
    //   });
    // }

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
      // findArt = await artDetailModel.aggregate([ { $match: { title: artByName} } ])
      findArt = await artDetailModel.find({
        title: { $regex: artByName, $options: "i" },
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
    let artByName, artByArtist;

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

    let query = {};
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

    if (subject) {
      query.subject = { $in: subject };
    }

    if (minPrice && minPrice) {
      query.price = { $gte: minPrice, $lte: maxPrice };
    }

    if (medium && style.medium > 0) {
      query.medium = { $in: medium };
    }

    if (material && style.material > 0) {
      query.materials = { $in: material };
    }

    if (orientation && style.orientation > 0) {
      query.orientation = { $in: orientation };
    }

    // console.log("query==========>",query);

    filteredArts = await artDetailModel.find(query);

    if (sortingCriteria === "newToOld") {
      filteredArts = await artDetailModel.find(query).sort({
        createdAt: 1,
      });
    }

    if (sortingCriteria === "incresingPrice") {
      filteredArts = await artDetailModel.find(query).sort({
        price: 1,
      });
    }

    if (sortingCriteria === "decreasingPrice") {
      filteredArts = await artDetailModel.find(query).sort({
        price: -1,
      });
    }

    if (sortingCriteria === "none") {
      filteredArts = await artDetailModel.find(query);
    }

    // console.log("filteredArts==========>",filteredArts);

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
    const artDetail = await ArtModel.findById({ _id: req.query.artId });

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
    await ArtModel.findByIdAndDelete({ _id: req.query.artId });
    return res.status(200).send("Art Deleted");
  } catch (err) {
    return res.status(500).send({ success: false, message: error.message });
  }
};

// exports.newFilterArt = async (req, res) => {
//   try {
//     let filteredArts;
//     const { sortingCriteria, searchCriteria, searchInput } = req.query;
//     const {
//       style,
//       subject,
//       medium,
//       minPrice,
//       maxPrice,
//       material,
//       size,
//       orientation,
//       artistCountry,
//       featuredartist
//     } = req.body;

//     let query = {};

//     console.log("body==========>",req.body)

//     // Handle the body-based filters
//     if (style && style.length > 0) {
//       query.styles = { $in: style };
//     }

//     if (subject) {
//       query.subject = { $in: subject };
//     }

//     if (minPrice && maxPrice) {
//       query["priceDetails.price"] = { $gte: minPrice, $lte: maxPrice };
//     }

//     if (medium && medium.length > 0) {
//       query.medium = { $in: medium };
//     }

//     if (material && material.length > 0) {
//       query.materials = { $in: material };
//     }

//     if (orientation && orientation.length > 0) {
//       query.orientation = { $in: orientation };
//     }

//     if (artistCountry && artistCountry.length > 0) {
//       // query.artistCountry = artistCountry;
//       query.artistCountry = { $in: artistCountry };
//     }

//     if (featuredartist && featuredartist.length > 0) {
//       // query.featuredArtist = featuredartist;
//       query.featuredArtist = { $in: featuredartist };
//     }

//      // Sorting logic (fixing price sort field)
//     const sortOption =
//       sortingCriteria === "newToOld"
//         ? { createdAt: -1 }
//         : sortingCriteria === "priceLowHigh"
//         ? { "priceDetails.price": 1 }
//         : sortingCriteria === "priceHighLow"
//         ? { "priceDetails.price": -1 }
//         : {};

//     // Handle search by Art title or Artist name
//     if (searchCriteria === "Art" && searchInput) {
//       query.title = { $regex: searchInput, $options: "i" }; // Case insensitive search in title
//     }

//     // If searchCriteria is 'Artist', perform a search based on the artist's name (firstName and lastName)
//     if (searchCriteria === "Artist" && searchInput) {
//       // Do an initial find with the other filters, then populate and filter by artist's name
//       filteredArts = await artDetailModel
//         .find(query)
//         .populate({
//           path: "artist",
//           match: {
//             $or: [
//               { firstName: { $regex: searchInput, $options: "i" } }, // Case insensitive
//               { lastName: { $regex: searchInput, $options: "i" } },  // Case insensitive
//               { $expr: { $regexMatch: { input: { $concat: ["$firstName", "$lastName"] }, regex: searchInput, options: "i" } } }, // Case insensitive match for full name
//             ],
//           },
//           select: { firstName: 1, lastName: 1 },
//         })
//         .sort(sortOption);
//     } else {
//       // Perform the query without the artist name search
//       filteredArts = await artDetailModel
//         .find(query)
//         .populate({
//           path: "artist",
//           select: { firstName: 1, lastName: 1 },
//         })
//         .sort(sortOption);
//     }

//     console.log("filteredArts==========>", filteredArts);

//     // If no filters or searches were applied, return all arts
//     if (!searchCriteria &&
//       (!style || style.length === 0) &&
//       !subject &&
//       (!medium || medium.length === 0) &&
//       (!minPrice || !maxPrice) &&
//       (!material || material.length === 0) &&
//       (!size || size.length === 0) &&
//       (!orientation || orientation.length === 0) &&
//       (!artistCountry || artistCountry.length === 0) &&
//       (!featuredartist || featuredartist.length === 0)) {
//       filteredArts = await artDetailModel
//         .find()
//         .populate({
//           path: "artist",
//           select: { firstName: 1, lastName: 1 },
//         });
//     }

//     // If no results are found
//     if (filteredArts.length === 0) {
//       return res.status(400).send({ success: false, message: "No art found" });
//     }

//     return res.status(200).send({ success: true, data: filteredArts });
//   } catch (error) {
//     return res.status(500).send({ success: false, message: error.message });
//   }
// };

exports.newFilterArt = async (req, res) => {
  try {
    let filteredArts;
    const { sortingCriteria, searchCriteria, searchInput } = req.query;
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

    let query = {};

    console.log("body==========>", req.body);

    // Handle the body-based filters
    if (style && style.length > 0) {
      query.styles = { $in: style.map((s) => new RegExp(s, "i")) }; // Case insensitive match
    }

    if (subject) {
      query.subject = { $in: subject.map((s) => new RegExp(s, "i")) }; // Case insensitive match
    }

    if (minPrice && maxPrice) {
      query["priceDetails.price"] = { $gte: minPrice, $lte: maxPrice };
    }

    if (medium && medium.length > 0) {
      query.medium = { $in: medium.map((m) => new RegExp(m, "i")) }; // Case insensitive match
    }

    if (material && material.length > 0) {
      query.materials = { $in: material.map((m) => new RegExp(m, "i")) }; // Case insensitive match
    }

    if (orientation && orientation.length > 0) {
      query.orientation = { $in: orientation.map((o) => new RegExp(o, "i")) }; // Case insensitive match
    }

    if (artistCountry && artistCountry.length > 0) {
      query.artistCountry = {
        $in: artistCountry.map((c) => new RegExp(c, "i")),
      }; // Case insensitive match
    }

    if (featuredartist && featuredartist.length > 0) {
      query.featuredArtist = {
        $in: featuredartist.map((f) => new RegExp(f, "i")),
      }; // Case insensitive match
    }

    // Sorting logic (fixing price sort field)
    const sortOption =
      sortingCriteria === "newToOld"
        ? { createdAt: -1 }
        : sortingCriteria === "priceLowHigh"
        ? { "priceDetails.price": 1 }
        : sortingCriteria === "priceHighLow"
        ? { "priceDetails.price": -1 }
        : {};

    // Handle search by Art title or Artist name
    if (searchCriteria === "Art" && searchInput) {
      query.title = { $regex: searchInput, $options: "i" }; // Case insensitive search in title
    }

    // Query for searchCriteria as 'Artist'
    if (searchCriteria === "Artist" && searchInput) {
      console.log("searchCriteria === Artist");
      filteredArts = await artDetailModel
        .find(query)
        .sort(sortOption) // Sorting should still happen here
        .populate({
          path: "artist",
          match: {
            $or: [
              { firstName: { $regex: searchInput, $options: "i" } }, // Case insensitive
              { lastName: { $regex: searchInput, $options: "i" } },  // Case insensitive
              {
                $expr: {
                  $regexMatch: {
                    input: { $concat: ["$firstName", "$lastName"] },
                    regex: searchInput,
                    options: "i",
                  },
                },
              }, // Case insensitive match for full name
            ],
          },
          select: { firstName: 1, lastName: 1 },
        })       

      console.log("Filtered arts for Artist search==========>", filteredArts);
    } else {
      // Query for all arts or when no filters/searchCriteria are present
      filteredArts = await artDetailModel
        .find(query)
        .populate({
          path: "artist",
          select: { firstName: 1, lastName: 1 },
        })
        .sort(sortOption); // Ensure sorting is applied here as well

      console.log("Filtered arts (no Artist search)==========>", filteredArts);
    }

    // If no filters or searches were applied, return all arts
    const noFiltersApplied =
      !searchCriteria &&
      (!style || style.length === 0) &&
      !subject &&
      (!medium || medium.length === 0) &&
      (!minPrice || !maxPrice) &&
      (!material || material.length === 0) &&
      (!size || size.length === 0) &&
      (!orientation || orientation.length === 0) &&
      (!artistCountry || artistCountry.length === 0) &&
      (!featuredartist || featuredartist.length === 0);

    if (noFiltersApplied) {
      filteredArts = await artDetailModel
        .find()
        .populate({
          path: "artist",
          select: { firstName: 1, lastName: 1 },
        })
        .sort(sortOption); // Sorting applied even when no filters are active

      console.log("All arts returned (no filters)==========>", filteredArts);
    }

    // If no results are found
    if (filteredArts.length === 0) {
      return res.status(400).send({ success: false, message: "No art found" });
    }

    return res.status(200).send({ success: true, data: filteredArts });
  } catch (error) {
    return res.status(500).send({ success: false, message: error.message });
  }
};
