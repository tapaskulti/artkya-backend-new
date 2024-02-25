const wishlistModel = require("../models/wishlist");
const ArtModel = require("../models/art");

exports.createWishlist = async (req, res) => {
  try {
    const { userId } = req.query;

    const checkWishlistAvailable = await wishlistModel.findOne({
      userId: userId,
    });

    if (checkWishlistAvailable) {
      return res.status(400).send({
        status: false,
        message: "Wishlist For This User Is Already Present",
      });
    }
    req.body.userId = userId;
    const wishlistCreated = await wishlistModel.create(req.body);

    return res.status(201).send({
      success: true,
      message: "Wishlist Created Successfully",
      data: wishlistCreated,
    });
  } catch (error) {
    return res.status(500).send({ success: false, message: error.message });
  }
};

// Add art to wishlist

exports.addToWishlist = async (req, res) => {
  try {
    const { artId, userId } = req.query;
    let updateWishList, totalItems;
    const findWishlist = await wishlistModel.findOne({ userId });
    // const updateWishList = await wishlistModel.findOneAndUpdate({userId},{
    //   $push:{arts:artId}
    // })

    if (findWishlist.arts.includes(artId)) {
      return res.status(400).send({
        success: false,
        message: "Art Already Present In Wishlist",
      });
    } else {
      updateWishList = findWishlist?.arts.push(artId);
    }

    if (updateWishList) {
      totalItems = await findWishlist.arts.length;
      findWishlist.totalItems = totalItems;
    }

    console.log(findWishlist);
    await findWishlist.save();

    const artAdded = res.status(200).send({
      success: true,
      data: totalItems,
      message: "Art Addded Successfully",
    });

    if (artAdded) {
       await ArtModel.findOneAndUpdate(
        { _id: artId },
        { wishlisted: true },
        { new: true }
      );
    }
    return;
  } catch (error) {
    return res.status(500).send({ success: false, message: error.message });
  }
};

exports.removeFromWishList = async (req, res) => {
  try {
    const { artId, userId } = req.query;
    let totalItems;
    const findWishlist = await wishlistModel.findOne({ userId });

    findWishlist.arts = findWishlist.arts.filter((art) => {
      console.log(art.toString());
      return art.toString() !== artId.toString();
    });

    totalItems = await findWishlist.arts.length;
    findWishlist.totalItems = totalItems;

    console.log(findWishlist);
    console.log(totalItems);

    await findWishlist.save();

    const artRemoved = res.status(200).send({
      success: true,
      data: totalItems,
      message: "Art Removed Successfully",
    });

    if (artRemoved) {
      return await ArtModel.findOne(
        { _id: artId },
        { wishlisted: false },
        { new: true }
      );
    }
    return;
  } catch (error) {
    return res.status(500).send({ success: false, message: error.message });
  }
};

// Get WishList Of A Certain User

exports.wishlistByUserId = async (req, res) => {
  try {
    const { userId } = req.query;

    const findWishlit = await wishlistModel.findOne({ userId }).populate({
      path: "arts",
      select: {
        thumbnail: 1,
        wishlisted: 1,
        subject: 1,
        title: 1,
        price: 1,
        width: 1,
        depth: 1,
        width: 1,
        artist: 1,
      },
      // options: {
      //   skip: 5,
      //   limit: 10,
      // },
    });

    return res.status(200).send({
      success: true,
      data: findWishlit,
    });
  } catch (error) {
    return res.status(500).send({ success: false, message: error.message });
  }
};
