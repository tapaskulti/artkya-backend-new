const cloudinary = require("cloudinary");
const artModel = require("../models/art");
const imageModel = require("../models/image");

exports.createArt = async (req, res) => {
  try {
    let arts = [];
    let uploadedImage;

    const creatingArt = await artModel.create(req.body);

    if (req.files.images) {
      req.files?.images?.forEach(async (singleImage) => {
        uploadedImage = await cloudinary.v2.uploader.upload(
          singleImage.tempFilePath,
          { folder: "Arts_Images" }
        );
        console.log("uploadedImage------->", uploadedImage);

        if (uploadedImage) {
          req.body.arts = arts;
          console.log("body-------->", req.body);

          const creatingImage = await imageModel.create({
            art: {
              id: uploadedImage?.public_id,
              secure_url: uploadedImage?.secure_url,
            },
            artist: req.body.artist,
          });

          if(creatingImage){
            await artModel.findOneAndUpdate(
                { _id: creatingArt?._id },
                { $push: { arts: creatingImage?._id } }
              );
          }
        }
      });
    }
    return res.status(201).send({
      success: true,
      message: "Art Created Successfully"
    });
  } catch (error) {
    return res.status(500).send({ success: false, message: error.message });
  }
};
