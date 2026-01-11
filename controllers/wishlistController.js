const wishlistModel = require("../models/wishlist");
const ArtModel = require("../models/art");

/* ================= CREATE WISHLIST ================= */
exports.createWishlist = async (req, res) => {
  try {
    const { userId } = req.query;

    const checkWishlist = await wishlistModel.findOne({ userId });
    if (checkWishlist) {
      return res.status(400).json({
        success: false,
        message: "Wishlist for this user already exists",
      });
    }

    const wishlist = await wishlistModel.create({
      userId,
      arts: [],
      totalItems: 0,
    });

    return res.status(201).json({
      success: true,
      message: "Wishlist created successfully",
      data: wishlist,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/* ================= ADD TO WISHLIST ================= */
exports.addToWishlist = async (req, res) => {
  try {
    const { userId, artId } = req.body;

    // 1️⃣ Validation
    if (!userId || !artId) {
      return res.status(400).json({
        success: false,
        message: "userId and artId are required",
      });
    }

    // 2️⃣ Check art exists
    const art = await ArtModel.findById(artId);
    if (!art) {
      return res.status(404).json({
        success: false,
        message: "Art not found",
      });
    }

    // 3️⃣ Find or create wishlist
    let wishlist = await wishlistModel.findOne({ userId });

    if (!wishlist) {
      wishlist = await wishlistModel.create({
        userId,
        arts: [],
        totalItems: 0,
      });
    }

    // 4️⃣ Prevent duplicate art
    const exists = wishlist.arts.some(
      (id) => id.toString() === artId.toString()
    );

    if (exists) {
      return res.status(400).json({
        success: false,
        message: "Art already in wishlist",
      });
    }

    // 5️⃣ Add art & update totals
    wishlist.arts.push(artId);
    wishlist.totalItems = wishlist.arts.length;

    await wishlist.save();

    // 6️⃣ Update art wishlisted flag
    await ArtModel.findByIdAndUpdate(artId, { wishlisted: true });

    return res.status(200).json({
      success: true,
      message: "Art added to wishlist successfully",
      data: wishlist,
    });
  } catch (error) {
    console.error("Add to wishlist error:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/* ================= REMOVE FROM WISHLIST ================= */
exports.removeFromWishlist = async (req, res) => {
  try {
    const { userId, artId } = req.body;

    // 1️⃣ Find wishlist
    const wishlist = await wishlistModel.findOne({ userId });
    if (!wishlist) {
      return res.status(404).json({
        success: false,
        message: "Wishlist not found",
      });
    }

    // 2️⃣ Check art exists
    const art = await ArtModel.findById(artId);
    if (!art) {
      return res.status(404).json({
        success: false,
        message: "Art not found",
      });
    }

    // 3️⃣ Remove art
    wishlist.arts = wishlist.arts.filter(
      (id) => id.toString() !== artId.toString()
    );

    wishlist.totalItems = wishlist.arts.length;
    await wishlist.save();

    // 4️⃣ Update art wishlisted flag
    await ArtModel.findByIdAndUpdate(artId, { wishlisted: false });

    return res.status(200).json({
      success: true,
      message: "Art removed from wishlist",
      data: wishlist,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/* ================= GET WISHLIST BY USER ================= */
exports.wishlistByUserId = async (req, res) => {
  try {
    const { userId } = req.query;

    const wishlist = await wishlistModel
      .findOne({ userId })
      .populate("arts");

    return res.status(200).json({
      success: true,
      data: wishlist,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/* ================= CLEAR WISHLIST ================= */
exports.clearWishlistByUserId = async (req, res) => {
  try {
    const { userId } = req.query;

    const wishlist = await wishlistModel.findOne({ userId });
    if (!wishlist) {
      return res.status(404).json({
        success: false,
        message: "Wishlist not found",
      });
    }

    wishlist.arts = [];
    wishlist.totalItems = 0;
    await wishlist.save();

    return res.status(200).json({
      success: true,
      message: "Wishlist cleared successfully",
      data: wishlist,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
