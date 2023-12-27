const cloudinary = require("cloudinary");

exports.createArt = async (req, res) => {
  try {
    let arts = [];
    let uploadedImage;

    if (req.files.images) {
      req.files?.images?.map(async (singleImage) => {
        console.log("singleImage------->", singleImage);
        uploadedImage = await cloudinary.v2.uploader.upload(
          singleImage.tempFilePath,
          { folder: "Arts_Images" }
        );
        arts.push({
          id: uploadedImage?.public_id,
          secure_url: uploadedImage?.secure_url,
        });
      });
    }

    console.log("arts------->", arts);
    req.body.arts = arts

    
  } catch (error) {
    return res.status(500).send({ success: false, message: error.message });
  }
};
