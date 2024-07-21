const Artist = require("../models/artistDetails");
const User = require("../models/user");

exports.createArtist = async (req, res) => {
  try {
    const {userId,isArtist} = req.body
    const createnewArtist = await Artist.create({userId:userId});

    await User.findOneAndUpdate({_id:userId},{isArtist:isArtist})
    if (!createnewArtist) {
      return res
        .status(401)
        .send({ success: false, message: "Artist Not Created" });
    }
    return res.status(201).send({
      success: true,
      message: "Artist created successfully",
      data: createnewArtist,
    });
  } catch (error) {
    return res.status(500).send({ success: false, message: error.message });
  }
};

exports.getArtistById = async (req, res) => {
  try {
    const { ArtistId } = req.query;
    const getArtistDetails = await Artist.findOne({ _id: ArtistId });

    if (!getArtistDetails) {
      return res
        .status(401)
        .send({ success: false, message: "Artist Not Found" });
    }

    return res.status(200).send({
      success: true,
      message: "Artist Found successfully",
      data: getArtistDetails,
    });
  } catch (error) {
    return res.status(500).send({ success: false, message: error.message });
  }
};

exports.updateArtistProfile = async (req, res) => {
  try {
    const { ArtistId } = req.query;
    const updateArtistDetails = await Artist.findOneAndUpdate(
      { _id: ArtistId },
      req.body,
      { new: true }
    );

    return res.status(200).send({
      success: true,
      message: "Artist Updated successfully",
      data: updateArtistDetails,
    });

  } catch (error) {
    return res.status(500).send({ success: false, message: error.message });
  }
};
