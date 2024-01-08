const cloudinary = require("cloudinary");
const artDetailModel = require("../models/art");
const artWorkModel = require("../models/artWork");

exports.createArt = async (req, res) => {
  try {
    let uploadedImage;

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
          const creatingImage = await artWorkModel.create({
            art: {
              id: uploadedImage?.public_id,
              secure_url: uploadedImage?.secure_url,
            },
            artist: req.body.artist,
            artDetails: creatingArt?._id,
          });

          if (creatingImage) {
            await artDetailModel.findOneAndUpdate(
              { _id: creatingArt?._id },
              { $push: { arts: creatingImage?._id } }
            );
          }
        }
      });
    }
    return res.status(201).send({
      success: true,
      message: "Art Created Successfully",
    });
  } catch (error) {
    return res.status(500).send({ success: false, message: error.message });
  }
};

// exports.createArt = async (req, res) => {
//   try {
//     let uploadedImage;
//     console.log("req.files?.images------->", req.files?.images);
//     if (req.files?.images) {
//       req.files?.images?.forEach(async (singleImage) => {
//         uploadedImage = await cloudinary.v2.uploader.upload(
//           singleImage.tempFilePath,
//           { folder: "Arts_Images" }
//         );
//         console.log("uploadedImage------->", uploadedImage);
//         const art = uploadedImage?.secure_url

//         if (uploadedImage) {
//           req.body.art = art;
//           await artDetailModel.create(req.body);

//           return res.status(201).send({
//             success: true,
//             message: "Art Created Successfully",
//           });
//         }
//       });
//     }
//     return res.status(400).send({ status: false, message: "Art Not Created" });
//   } catch (error) {
//     return res.status(500).send({ success: false, message: error.message });
//   }
// };



// Get All Arts
exports.getAllArt = async (req, res) => {
  try {
    const allArts = await artWorkModel.find();
    if (allArts) {
      return res.status(200).send({ success: true, data: allArts });
    }
  } catch (error) {
    return res.status(500).send({ success: false, message: error.message });
  }
};


// Get Art By Id
exports.getArtById = async (req, res) => {
  try {
    const{artID} = req.query
    const allArts = await artWorkModel.find({_id:artID});
    if (allArts) {
      return res.status(200).send({ success: true, data: allArts });
    }
  } catch (error) {
    return res.status(500).send({ success: false, message: error.message });
  }
};



