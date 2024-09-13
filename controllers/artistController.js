const Artist = require("../models/artistDetails");
const Art = require("../models/art");
const User = require("../models/user");
const cloudinary = require("cloudinary");

exports.createArtist = async (req, res) => {
  try {
    const { userId, isArtist } = req.body;
    const createnewArtist = await Artist.create({ userId: userId });

    await User.findOneAndUpdate({ _id: userId }, { isArtist: isArtist });
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
    const getArtistDetails = await Artist.findOne({
      userId: ArtistId,
    }).populate({
      path: "userId",
      select: {
        firstName: 1,
        lastName: 1,
      },
    });

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

    console.log("body", req.body);
    console.log("ArtistId", ArtistId);

    const updateArtistDetails = await Artist.findOneAndUpdate(
      { userId: ArtistId },
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

exports.getAllArtByArtistId = async (req, res) => {
  try {
    const { ArtistId } = req.query;
    const getAllArt = await Art.find({ artist: ArtistId });

    return res.status(200).send({
      success: true,
      message: "All Art found successfully",
      data: getAllArt,
    });
  } catch (error) {
    return res.status(500).send({ success: false, message: error.message });
  }
};

exports.updateProfileImages = async (req, res) => {
  try {
    const { ArtistId } = req.query;
    let artistProfilePictureFile, artistCoverImageFile;
    let artistStudioImageFile;

    console.log("files===>", req.files);
    if (req.files) {
      if (req.files.avatar) {
        artistProfilePictureFile = await cloudinary.v2.uploader.upload(
          req.files.avatar.tempFilePath,
          { folder: "Artist_Profile_Pictures" }
        );
      }

      if (req.files.artistcoverPhoto) {
        artistCoverImageFile = await cloudinary.v2.uploader.upload(
          req.files.artistcoverPhoto.tempFilePath,
          { folder: "Artist_Cover_Pictures" }
        );
      }

      if (req.files.artistStudioImage) {
        artistStudioImageFile = await cloudinary.v2.uploader.upload(
          req.files.artistStudioImage.tempFilePath,
          { folder: "Artist_Studio_Image" }
        );
      }

      // console.log("artistProfilePictureFile===>", artistProfilePictureFile);
      // console.log("artistCoverImageFile===>", artistCoverImageFile);
      // console.log(artistStudioImageFile);
    }

    const profileImage = artistProfilePictureFile && {
      id: artistProfilePictureFile.public_id,
      secure_url: artistProfilePictureFile.secure_url,
    };

    const artistCoverImage = artistCoverImageFile && {
      id: artistCoverImageFile.public_id,
      secure_url: artistCoverImageFile.secure_url,
    };

    const artistStudioImage = artistStudioImageFile && {
      id: artistStudioImageFile.public_id,
      secure_url: artistStudioImageFile.secure_url,
    };

    const updatedImage = await Artist.findOneAndUpdate(
      { userId: ArtistId },
      {
        profileImage: profileImage && profileImage,
        coverPhoto: artistCoverImage && artistCoverImage,
        studioImage: artistStudioImage && artistStudioImage,
      },
      { new: true }
    );


    if (updatedImage) {
      return res.status(200).send({
        success: true,
        message: "Image Uploaded successfully",
        data: updatedImage,
      });
    }
  } catch (error) {
    return res.status(500).send({ success: false, message: error.message });
  }
};


exports.artAndArtistHomePage =async()=>{
  try {
    // Fetch artists with at least 4 artworks
    const artists = await Artist.aggregate([
      {
        $lookup: {
          from: "artDetails",  // artDetails collection to be joined
          localField: "_id",   // Artist id
          foreignField: "artist",  // Reference to artist in art model
          as: "artworks",  // Output field to hold matched documents from artDetails
        },
      },
      {
        $match: {
          "artworks.3": { $exists: true }, // Ensure at least 4 artworks (0 index, so check for 3)
        },
      },
    ]);

    if (artists.length === 0) {
      return res.status(404).json({ message: "No artist found with at least 4 artworks." });
    }

    // Pick a random artist
    const randomArtist = artists[Math.floor(Math.random() * artists.length)];

    // Limit the artist's artworks to 10
    const limitedArtworks = randomArtist.artworks.slice(0, 10);

    // Return the random artist along with their 10 (or fewer) artworks
    res.status(200).json({
      artist: randomArtist,
      artworks: limitedArtworks,
    });
  }  catch (error) {
    return res.status(500).send({ success: false, message: error.message });
  }
}