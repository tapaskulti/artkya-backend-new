const Artist = require("../models/artistDetails");
const Art = require("../models/art");
const User = require("../models/user");
const cloudinary = require("cloudinary");

exports.createArtist = async (req, res) => {
  try {
    const { userId, isArtist } = req.body;
    const createnewArtist = await Artist.create({ userId: userId });

    if (createnewArtist) {
      await User.findOneAndUpdate(
        { _id: userId },
        { isArtist: isArtist, artist: createnewArtist?._id }
      );
    }
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

exports.artAndArtistHomePage = async (req, res) => {
  try {
    let randomArtist = await Artist.aggregate([{ $sample: { size: 1 } }]);

    // If no artist is found, fetch the first available artist as fallback
    if (randomArtist.length === 0) {
      randomArtist = await Artist.find().limit(1);
      if (randomArtist.length === 0) {
        return res
          .status(404)
          .json({ message: "No artist available in the database." });
      }
    }

    // Extract the artist's aboutMe and userId
    const artist = randomArtist[0];
    const { aboutMe, userId, profileImage } = artist;

    // Step 2: Run parallel tasks:
    const [user, artworks] = await Promise.all([
      // Fetch user details in parallel
      User.findById({ _id: userId }).select("firstName lastName _id"),

      // Fetch artworks in parallel
      Art.aggregate([
        { $match: { artist: userId } },
        { $sample: { size: 10 } },
        { $project: { title: 1, priceDetails: 1, thumbnail: 1 } },
      ]),
    ]);

    // Fallback to placeholder user if no user details are found
    const artistName = user
      ? `${user.firstName} ${user.lastName}`
      : "Unknown Artist";
    const userIdFallback = user ? user._id : null;

    // Fallback message for artworks
    const minimumArtworks = artworks.length >= 4 ? artworks : [];

    // Step 4: Send the response
    res.status(200).json({
      artist: {
        id: userIdFallback,
        name: artistName,
        aboutMe: aboutMe || "No description available",
        profileImage: profileImage || "default-profile.png",
      },
      artworks: minimumArtworks,
    });
  } catch (error) {
    return res.status(500).send({ success: false, message: error.message });
  }
};
