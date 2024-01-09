const wishlistModel = require("../models/wishlist");

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

    return res.status(200).send({
      success: true,
      data: totalItems,
      message: "Art Addded Successfully",
    });
  } catch (error) {
    return res.status(500).send({ success: false, message: error.message });
  }
};

exports.removeFromWishList = async (req, res) => {
  try {
    const { artId, userId } = req.query;

    const findWishlist = await wishlistModel.findOne({ userId });

    findWishlist.arts = findWishlist.arts.filter((art) => {
      console.log(art.toString());
      art.toString() !== artId.toString();
    });

    totalItems = await findWishlist.arts.length;
    findWishlist.totalItems = totalItems;

    console.log(findWishlist);
    console.log(totalItems);

    await findWishlist.save();
    return res.status(200).send({
      success: true,
      data: totalItems,
      message: "Art Removed Successfully",
    });
  } catch (error) {
    return res.status(500).send({ success: false, message: error.message });
  }
};


// Get WishList Of A Certain User

exports.wishlistByUserId = async (req, res) => {
  try {
    const {userId } = req.query;

    const findCart = await wishlistModel.findOne({ userId })
    .populate("arts")

    return res.status(200).send({
      success: true,
      data: findCart,
    });
  } catch (error) {
    return res.status(500).send({ success: false, message: error.message });
  }
};