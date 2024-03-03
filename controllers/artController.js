const cloudinary = require("cloudinary");
const artDetailModel = require("../models/art");
const artWorkModel = require("../models/artWork");
const userModel = require("../models/user");
const { Client } = require("square");

const { paymentsApi } = new Client({
  // accessToken: process.env.SQUARE_ACCESS_TOKEN,
});

exports.createArt = async (req, res) => {
  try {
    let uploadedImage;
    let thumbnailFile;

    const creatingArt = await artDetailModel.create(req.body);

    if (req.files?.images) {
      console.log("req.files?.images------->", req.files?.images);
      req.files?.images?.forEach(async (singleImage) => {
        uploadedImage = await cloudinary.v2.uploader.upload(
          singleImage.tempFilePath,
          { folder: "Arts_Images" }
        );
        console.log("uploadedImage------->", uploadedImage);

        if (uploadedImage) {
          const updateImage = await artDetailModel.findOneAndUpdate(
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

        res.status(201).send({
          success: true,
          message: "Art Created Successfully",
        });
        
      });
    }

    if (req.files.thumbnail) {
      thumbnailFile = await cloudinary.v2.uploader.upload(
        req.files.thumbnail.tempFilePath,
        { folder: "Arts_Images" }
      );
    }else{
      return res.status(400).send({message:"Thumbnail mot found"})
    }

    console.log("thumbnail------->", req.files.thumbnail);
    console.log("thumbnailFile------->", thumbnailFile);

    const imageThumbnail = thumbnailFile && {
      id: thumbnailFile.public_id,
      secure_url: thumbnailFile.secure_url,
    };

    if (imageThumbnail) {
      await artDetailModel.findOneAndUpdate(
        { _id: creatingArt?._id },
        { thumbnail: imageThumbnail }
      );
    }

    

    // push art id in user Art
    await userModel.findOneAndUpdate(
      { _id: req.body.artist },
      { $push: { art: creatingArt?._id } }
    );
  } catch (error) {
    return res.status(500).send({ success: false, message: error.message });
  }
};

// exports.createArt = async (req, res) => {
//   try {
//     let uploadedImage;
//     let thumbnailFile;

//     const creatingArt = await artDetailModel.create(req.body);

//     if (req.files?.images) {
//       console.log("req.files?.images------->", req.files?.images);
//       req.files?.images?.forEach(async (singleImage) => {
//         uploadedImage = await cloudinary.v2.uploader.upload(
//           singleImage.tempFilePath,
//           { folder: "Arts_Images" }
//         );
//         console.log("uploadedImage------->", uploadedImage);

//         if (uploadedImage) {
//           const creatingImage = await artWorkModel.create({
//             art: {
//               id: uploadedImage?.public_id,
//               secure_url: uploadedImage?.secure_url,
//             },
//             artist: req.body.artist,
//             artDetails: creatingArt?._id,
//           });

//           if (creatingImage) {
//             await artDetailModel.findOneAndUpdate(
//               { _id: creatingArt?._id },
//               { $push: { arts: creatingImage?._id } }
//             );
//           }
//         }
//       });
//     }

//     if (req.files.thumbnail) {
//       thumbnailFile = await cloudinary.v2.uploader.upload(
//         req.files.thumbnail.tempFilePath,
//         { folder: "Arts_Images" }
//       );
//     }

//     console.log("thumbnail------->", req.files.thumbnail);
//     console.log("thumbnailFile------->", thumbnailFile);

//     const imageThumbnail = thumbnailFile && {
//       id: thumbnailFile.public_id,
//       secure_url: thumbnailFile.secure_url,
//     };

//     if (imageThumbnail) {
//       await artDetailModel.findOneAndUpdate(
//         { _id: creatingArt?._id },
//         { thumbnail: imageThumbnail }
//       );
//     }

//     res.status(201).send({
//       success: true,
//       message: "Art Created Successfully",
//     });

//     // push art id in user Art
//     await userModel.findOneAndUpdate(
//       { _id: req.body.artist },
//       { $push: { art: creatingArt._id } }
//     );
//   } catch (error) {
//     return res.status(500).send({ success: false, message: error.message });
//   }
// };

// Get All Arts
// exports.getAllArt = async (req, res) => {
//   console.log("get all art called");
//   try {
//     const allArts = await artDetailModel.find();
//     // .select({arts:-1})
//     if (allArts) {
//       return res.status(200).send({ success: true, data: allArts });
//     }
//   } catch (error) {
//     return res.status(500).send({ success: false, message: error.message });
//   }
// };

exports.getAllArt = async (req, res) => {
  try {
    let getAllArt;
    // const { date, incresingPrice, decreasingPrice } = req.query;
    const { criteria, searchCriteria, searchInput } = req.query;

    console.log(criteria, searchCriteria, searchInput);

    if (criteria === "newToOld" && searchCriteria === "none") {
      getAllArt = await artDetailModel.find().sort({
        createdAt: 1,
      });
    }

    if (criteria === "incresingPrice" && searchCriteria === "none") {
      getAllArt = await artDetailModel.find().sort({
        price: 1,
      });
    }

    if (criteria === "decreasingPrice" && searchCriteria === "none") {
      getAllArt = await artDetailModel.find().sort({
        price: -1,
      });
    }

    if (criteria === "none") {
      getAllArt = await artDetailModel.find();
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


    const artDetails = await artDetailModel.findOne({ _id: artID });
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
    console.log(error);
  }
};
