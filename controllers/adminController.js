const nodemailer = require("nodemailer");
const handlebars = require("handlebars");
const fs = require("fs");
const path = require("path");
const User = require("../models/user");
const ArtistDetails = require("../models/artistDetails");
const ArtDetails = require("../models/art");
const { default: mongoose } = require("mongoose");

// Get total users and total artists
exports.getTotalUsersAndArtists = async (req, res) => {
  try {
    const [totalUsers, totalArtists] = await Promise.all([
      User.countDocuments(),
      ArtistDetails.countDocuments(),
    ]);

    return res.status(200).json({
      totalUsers,
      totalArtists,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// Get all user details
exports.getAllUsers = async (req, res) => {
  try {
    const userData = await User.aggregate([
      {
        $project: {
          _id: 1,
          name: { $concat: ["$firstName", " ", "$lastName"] },
          email: "$email",
          role: "$role",
          userType: {
            $cond: {
              if: "isArtist",
              then: "ARTIST",
              else: "USER",
            },
          },
          joiningDate: "$createdAt",
          verified: {
            $cond: {
              if: "$isArtApprovalReq",
              then: "Unverified",
              else: "Verified",
            },
          },
          status: {
            $cond: {
              if: "$isActive",
              then: "Active",
              else: "Inactive",
            },
          },
        },
      },
    ]);

    return res.status(200).json(userData);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// Get all artist details
exports.getAllArtists = async (req, res) => {
  try {
    const artists = await User.aggregate([
      // Match only artists
      { $match: { isArtist: true } },

      // Lookup artist details
      {
        $lookup: {
          from: "artistdetails", // Collection name for ArtistDetails
          localField: "_id",
          foreignField: "userId",
          as: "artistDetails",
        },
      },

      // Unwind artistDetails (since it's a one-to-one relationship)
      { $unwind: { path: "$artistDetails", preserveNullAndEmptyArrays: true } },

      // Lookup sold arts
      {
        $lookup: {
          from: "artdetails", // Collection name for ArtDetails
          localField: "_id",
          foreignField: "artist",
          as: "soldArts",
          pipeline: [
            // Match only sold arts
            { $match: { isOriginalSold: true } },
          ],
        },
      },

      // Project required fields
      {
        $project: {
          name: { $concat: ["$firstName", " ", "$lastName"] },
          email: 1,
          userType: "ARTIST",
          joiningDate: "$createdAt",
          verified: "$isArtist",
          status: {
            $cond: {
              if: "$isActive",
              then: "Active",
              else: "Inactive",
            },
          },
          originalCommission: "$artistDetails.originalPercent",
          totalArtSold: { $size: "$soldArts" }, // Count of sold arts
          totalRevenue: { $sum: "$soldArts.totalPrice" }, // Sum of totalPrice from sold arts
        },
      },
    ]);

    return res.status(200).json({
      success: true,
      data: artists,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
// Activate/Deactivate User (Handles artist status)
exports.toggleUserStatus = async (req, res) => {
  try {
    const { userId } = req.query;
    const user = await User.findById(userId);

    if (!user) return res.status(404).json({ message: "User not found" });

    user.isActive = !user.isActive;
    if (user.role === "ARTIST") {
      user.isArtist = user.isActive;
    }

    await user.save();
    return res.status(200).json({
      message: `User ${user.isActive ? "Activated" : "Deactivated"}`,
      user,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Update Print Commission Percentage
exports.updateCommission = async (req, res) => {
  try {
    let { artistId, originalPercent } = req.body;
    originalPercent = parseInt(originalPercent);

    const artistDetails = await ArtistDetails.findOneAndUpdate(
      { userId: artistId },
      { originalPercent: originalPercent },
      { new: true }
    );

    if (!artistDetails) {
      return res.status(404).json({ message: "Artist not found" });
    }

    return res
      .status(200)
      .json({ message: "Commission updated", artistDetails });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// Directly verify an artist (Admin privilege)
exports.verifyArtist = async (req, res) => {
  try {
    const { artistId } = req.query;
    const artistDetails = await ArtistDetails.findOneAndUpdate(
      { userId: artistId },
      { isVerified: true },
      { new: true }
    );

    if (!artistDetails) {
      return res.status(404).json({ message: "Artist not found" });
    }

    return res
      .status(200)
      .json({ message: "Artist verified by admin", artistDetails });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// Reject artwork
exports.rejectArtwork = async (req, res) => {
  try {
    const { artId } = req.query;
    const artwork = await ArtDetails.findByIdAndUpdate(
      { _id: artId },
      { isPublished: false },
      { new: true }
    );
    if (!artwork) return res.status(404).json({ message: "Artwork not found" });

    return res.status(200).json({ message: "Artwork rejected", artwork });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

exports.approveArtwork = async (req, res) => {
  try {
    const { artId } = req.query;
    const artwork = await ArtDetails.findOne({ _id: artId }).populate("artist");

    if (!artwork || artwork.isPublished) {
      return res.status(400).json({ message: "Invalid artwork" });
    }

    const artistDetails = await ArtistDetails.findOne({
      userId: artwork.artist._id,
    });

    if (!artistDetails) {
      return res.status(404).json({ message: "Artist details not found" });
    }

    const approvedArtworks = await ArtDetails.countDocuments({
      artist: artwork.artist._id,
      isPublished: true,
    });

    // Auto-approve if artist has 3 verified artworks
    if (approvedArtworks >= 3 || artistDetails.isVerified) {
      artwork.isPublished = true;
      await artwork.save();
      return res.json({ message: "Artwork auto-approved", artwork });
    }

    // check
    const adminCommission =
      (artwork.priceDetails.price * artistDetails.originalPercent) / 100;
    artwork.isPublished = true;
    artwork.adminPrice = adminCommission;
    artwork.totalPrice = artwork.priceDetails.price + adminCommission + 20; // GST

    await artwork.save();
    return res.status(200).json({ message: "Artwork approved", artwork });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

exports.getAllPainting = async (req, res) => {
  try {
    const paintings = await ArtDetails.aggregate([
      {
        $lookup: {
          from: "users",
          localField: "artist",
          foreignField: "_id",
          as: "artistInfo",
        },
      },
      {
        $unwind: {
          path: "$artistInfo",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $project: {
          _id: -1,
          id: "$_id",
          title: 1,
          artist: {
            $cond: {
              if: { $ifNull: ["$artistInfo.firstName", false] },
              then: {
                $concat: ["$artistInfo.firstName", " ", "$artistInfo.lastName"],
              },
              else: "Unknown Artist",
            },
          },
          price: "$priceDetails.price",
          commission: "$commissionAmount",
          status: {
            $cond: {
              if: { $eq: ["$isOriginalSold", true] },
              then: "Sold",
              else: "Available",
            },
          },
          category: "$category",
          uploadDate: {
            $dateToString: {
              format: "%Y-%m-%d",
              date: "$createdAt",
            },
          },
          approved: "$isPublished",
          thumbnail: "$thumbnail.secure_url",
        },
      },
    ]);

    return res.status(200).json({ success: true, data: paintings });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

exports.updateCommissionForArtistPaintings = async (req, res) => {
  try {
    const { artistId } = req.query;

    if (!mongoose.Types.ObjectId.isValid(artistId)) {
      return res.status(400).json({ message: "Invalid artist ID" });
    }

    // Fetch the artist detail (with originalPercent)
    const artist = await ArtistDetails.findOne({ userId: artistId });

    if (!artist) {
      return res.status(404).json({ message: "Artist not found" });
    }

    const originalPercent = artist.originalPercent || 20;

    // Fetch all paintings by that artist
    const paintings = await ArtDetails.find({ artist: artistId });

    if (!paintings.length) {
      return res
        .status(404)
        .json({ message: "No paintings found for this artist" });
    }

    // Update each painting with computed commissionAmount
    const bulkOps = paintings.map((painting) => {
      const price = painting?.priceDetails?.price || 0;
      const commissionAmount = (originalPercent / 100) * price;
      const isPublished = false;

      return {
        updateOne: {
          filter: { _id: painting._id },
          update: { commissionAmount, isPublished },
        },
      };
    });

    // Run all updates in bulk
    await ArtDetails.bulkWrite(bulkOps);

    return res.status(200).json({
      message: "Commission amounts updated successfully",
      updatedCount: bulkOps.length,
    });
  } catch (error) {
    console.error("Error updating commissions:", error);
    return res.status(500).json({ message: error.message });
  }
};

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

exports.contactUs = async (req, res) => {
  const { name, email, message } = req.body;

  // Input validation
  if (!name || !email || !message) {
    return res.status(400).json({ error: "All fields are required" });
  }

  // if (!validateEmail(email)) {
  //   return res.status(400).json({ error: "Invalid email format" });
  // }

  try {
    // Email to admin/yourself
    const adminMailOptions = {
      from: process.env.EMAIL_USER,
      to: process.env.EMAIL_USER,
      subject: "New Contact Form Submission",
      html: `
          <h2>New Contact Form Submission</h2>
          <p><strong>Name:</strong> ${name}</p>
          <p><strong>Email:</strong> ${email}</p>
          <p><strong>Message:</strong> ${message}</p>
        `,
    };

    // Email to user (acknowledgment)
    const userMailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: "Thank you for contacting us",
      html: `
          <h2>Thank you for reaching out!</h2>
          <p>Dear ${name},</p>
          <p>We have received your message and will get back to you as soon as possible.</p>
          <p>Here's a copy of your message:</p>
          <p><em>${message}</em></p>
          <br>
          <p>Best regards,</p>
          <p>Your Company Name</p>
        `,
    };

    // Send both emails concurrently
    await Promise.all([
      transporter.sendMail(adminMailOptions),
      transporter.sendMail(userMailOptions),
    ]);

    res.status(200).json({ message: "Messages sent successfully" });
  } catch (err) {
    console.error("Email sending error:", err);
    res.status(500).json({ error: "Failed to send email" });
  }
};

exports.buyOriginalArtMail = async (req, res) => {
  const {
    customerName,
    customerAddress,
    contactNo,
    customerEmail,
    artid,
    artPrice,
    originalImage,
  } = req.body;

  // const originalArtBuyTemplate = fs.readFileSync(
  //   path.join(__dirname, "../template/OriginalArtBuy.hbs"),
  //   "utf8"
  // );

  // const template = handlebars.compile(originalArtBuyTemplate);

  // const originalArtBuyBody = template({
  //   original_art_id: artid,
  //   customer_name: customerName,
  //   address: customerAddress,
  //   contact_number: contactNo,
  //   email: customerEmail,
  //   art_price: artPrice,
  //   image_url: originalImage,
  // });

  try {
    // Email to admin/yourself
    const adminMailOptions = {
      from: process.env.EMAIL_USER,
      to: process.env.EMAIL_USER,
      subject: "New Contact Form Submission",
      html: originalArtBuyBody,
    };

    // Email to user (acknowledgment)
    const userMailOptions = {
      from: process.env.EMAIL_USER,
      to: customerEmail,
      subject: "Thank you for contacting us",
      // html: originalArtBuyBody
    };

    // Send both emails concurrently
    await Promise.all([
      transporter.sendMail(adminMailOptions),
      transporter.sendMail(userMailOptions),
    ]);

    res.status(200).json({ message: "Messages sent successfully" });
  } catch (err) {
    console.error("Email sending error:", err);
    res.status(500).json({ error: "Failed to send email" });
  }
};

// Get total users and total artists
exports.getTotalUsersAndArtists = async (req, res) => {
  try {
    const [totalUsers, totalArtists] = await Promise.all([
      User.countDocuments(),
      ArtistDetails.countDocuments(),
    ]);

    return res.status(200).json({
      totalUsers,
      totalArtists,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

exports.getTotalPaintings = async (req, res) => {
  const totalPaintings = await ArtDetails.countDocuments();

  return res.status(200).json({
    totalPaintings
  });
};

// Get all user details with search
exports.getAllUsers = async (req, res) => {
  try {
    const { search = ""  } = req.query

   const userData = await User.aggregate([
    {
      $match: {        
        $or: [
          { firstName: { $regex: search, $options: "i" } },
          { lastName: { $regex: search, $options: "i" } },
          { email: { $regex: search, $options: "i" } },
        ],
      },
    },
      {
        $project: {
          _id: 1,
          name: { $concat: ["$firstName", " ", "$lastName"] },
          email: 1,
          role: 1,
          userType: {
            $cond: {
              if: "$isArtist",
              then: "ARTIST",
              else: "USER",
            },
          },
          joiningDate: {
            $dateToString: {
              format: "%d %b %Y",
              date: "$createdAt",
              timezone: "Asia/Kolkata",
            },
          },
          verified: {
            $cond: {
              if: "$isArtApprovalReq",
              then: "Unverified",
              else: "Verified",
            },
          },
          status: {
            $cond: {
              if: "$isActive",
              then: "Active",
              else: "Inactive",
            },
          },
        },
      },
    ]);

    return res.status(200).json(userData);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// Get all artist details with search
exports.getAllArtists = async (req, res) => {
  try {
    const { search = "" } = req.query;

    const artists = await User.aggregate([
      // Match only artists, optionally filter by name or email
      {
        $match: {
          isArtist: true,
          $or: [
            { firstName: { $regex: search, $options: "i" } },
            { lastName: { $regex: search, $options: "i" } },
            { email: { $regex: search, $options: "i" } },
          ],
        },
      },
      {
        $lookup: {
          from: "artistdetails",
          localField: "_id",
          foreignField: "userId",
          as: "artistDetails",
        },
      },
      { $unwind: { path: "$artistDetails", preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: "artdetails",
          localField: "_id",
          foreignField: "artist",
          as: "soldArts",
          pipeline: [{ $match: { isOriginalSold: true } }],
        },
      },
      {
        $project: {
          name: { $concat: ["$firstName", " ", "$lastName"] },
          email: 1,
          userType: "ARTIST",
          joiningDate: "$createdAt",
          verified: "$isArtist",
          status: {
            $cond: {
              if: "$isActive",
              then: "Active",
              else: "Inactive",
            },
          },
          originalCommission: "$artistDetails.originalPercent",
          totalArtSold: { $size: "$soldArts" },
          totalRevenue: { $sum: "$soldArts.totalPrice" },
        },
      },
    ]);

    return res.status(200).json({ success: true, data: artists });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
// Get all Painting details with search
exports.getAllPainting = async (req, res) => {
  try {
    const paintings = await ArtDetails.aggregate([
      {
        $lookup: {
          from: "users",
          localField: "artist",
          foreignField: "_id",
          as: "artistInfo",
        },
      },
      {
        $unwind: {
          path: "$artistInfo",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $project: {
          _id: -1,
          id: "$_id",
          title: 1,
          artist: {
            $cond: {
              if: { $ifNull: ["$artistInfo.firstName", false] },
              then: {
                $concat: ["$artistInfo.firstName", " ", "$artistInfo.lastName"],
              },
              else: "Unknown Artist",
            },
          },
          price: "$priceDetails.price",
          commission: "$commissionAmount",
          status: {
            $cond: {
              if: { $eq: ["$isOriginalSold", true] },
              then: "Sold",
              else: "Available",
            },
          },
          category: "$category",
          uploadDate: {
            $dateToString: {
              format: "%Y-%m-%d",
              date: "$createdAt",
            },
          },
          approved: "$isPublished",
          thumbnail: "$thumbnail.secure_url",
        },
      },
    ]);

    return res.status(200).json({ success: true, data: paintings });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};


// Activate/Deactivate User (Handles artist status)
exports.toggleUserStatus = async (req, res) => {
  try {
    const { userId } = req.query;
    const user = await User.findById(userId);

    if (!user) return res.status(404).json({ message: "User not found" });

    user.isActive = !user.isActive;
    if (user.role === "ARTIST") {
      user.isArtist = user.isActive;
    }

    await user.save();
    return res.status(200).json({
      message: `User ${user.isActive ? "Activated" : "Deactivated"}`,
      user,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Update Print Commission Percentage
exports.updateArtistCommission = async (req, res) => {
  try {
    let { userId, originalPercent } = req.body;
    originalPercent = parseInt(originalPercent);

    const artistDetails = await ArtistDetails.findOneAndUpdate(
      { userId: userId },
      { originalPercent: originalPercent },
      { new: true }
    );

    if (!artistDetails) {
      return res.status(404).json({ message: "Artist not found" });
    }

    return res
      .status(200)
      .json({ message: "Commission updated", artistDetails });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// Directly verify an artist (Admin privilege)
exports.verifyArtist = async (req, res) => {
  try {
    const { userId } = req.query;
    const artistDetails = await ArtistDetails.findOneAndUpdate(
      { userId: userId },
      { isVerified: true,isArtApprovalReq:false },
      { new: true }
    );

    if (!artistDetails) {
      return res.status(404).json({ message: "Artist not found" });
    }

    return res
      .status(200)
      .json({ message: "Artist verified by admin", artistDetails });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};



// Reject artwork
exports.rejectArtwork = async (req, res) => {
  try {
    const { artId } = req.query;
    const artwork = await ArtDetails.findByIdAndUpdate(
      { _id: artId },
      { isPublished: false },
      { new: true }
    );
    if (!artwork) return res.status(404).json({ message: "Artwork not found" });

    return res.status(200).json({ message: "Artwork rejected", artwork });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

function calculateArtworkPricing(basePrice, commissionPercent) {
  const commissionAmount = (basePrice * commissionPercent) / 100;
  const totalPrice = basePrice + commissionAmount;
  return { commissionAmount, totalPrice };
}
exports.approveArtwork = async (req, res) => {
  try {
    const { artId } = req.query;

    const artwork = await ArtDetails.findOne({ _id: artId }).populate("artist");
    if (!artwork || artwork.isPublished) {
      return res.status(400).json({ message: "Invalid or already approved artwork" });
    }

    const artist = artwork.artist;
    const artistDetails = await ArtistDetails.findOne({ userId: artist._id });

    if (!artistDetails) {
      return res.status(404).json({ message: "Artist details not found" });
    }

    const approvedArtworks = await ArtDetails.countDocuments({
      artist: artist._id,
      isPublished: true,
    });

    // If artist has 3+ approved artworks, disable future approvals
    if (approvedArtworks >= 3 || artistDetails.isVerified) {
      artistDetails.isArtApprovalReq = false;
      await artistDetails.save();

      artwork.isPublished = true;
      const { commissionAmount, totalPrice } = calculateArtworkPricing(
        artwork.priceDetails.price,
        artistDetails.originalPercent || 20 // fallback if not set
      );

      artwork.commissionPercent = artistDetails.originalPercent;
      artwork.commissionAmount = commissionAmount;
      artwork.totalPrice = totalPrice;

      await artwork.save();
      return res.json({ message: "Artwork auto-approved", artwork });
    }

    // Approve with pricing logic
    artwork.isPublished = true;
    const { commissionAmount, totalPrice } = calculateArtworkPricing(
      artwork.priceDetails.price,
      artistDetails.originalPercent || 20
    );

    artwork.commissionPercent = artistDetails.originalPercent;
    artwork.commissionAmount = commissionAmount;
    artwork.totalPrice = totalPrice;

    await artwork.save();

    return res.status(200).json({ message: "Artwork approved", artwork });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const getAdminDashboardStats = async () => {
  try {
    const today = new Date();
    const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const startOfWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    const [
      totalOrders,
      todayOrders,
      weekOrders,
      monthOrders,
      totalRevenue,
      avgOrderValue,
      statusBreakdown,
      topArtworks
    ] = await Promise.all([
      Order.countDocuments(),
      Order.countDocuments({ createdAt: { $gte: startOfToday } }),
      Order.countDocuments({ createdAt: { $gte: startOfWeek } }),
      Order.countDocuments({ createdAt: { $gte: startOfMonth } }),
      Order.aggregate([
        { $match: { paymentStatus: 'paid' } },
        { $group: { _id: null, total: { $sum: '$totalAmount' } } }
      ]),
      Order.aggregate([
        { $match: { paymentStatus: 'paid' } },
        { $group: { _id: null, avg: { $avg: '$totalAmount' } } }
      ]),
      Order.aggregate([
        {
          $group: {
            _id: '$orderStatus',
            count: { $sum: 1 }
          }
        }
      ]),
      Order.aggregate([
        { $unwind: '$artId' },
        {
          $group: {
            _id: '$artId',
            orderCount: { $sum: 1 }
          }
        },
        { $sort: { orderCount: -1 } },
        { $limit: 5 },
        {
          $lookup: {
            from: 'artdetails',
            localField: '_id',
            foreignField: '_id',
            as: 'artwork'
          }
        }
      ])
    ]);

    return {
      overview: {
        totalOrders,
        todayOrders,
        weekOrders,
        monthOrders,
        totalRevenue: totalRevenue[0]?.total || 0,
        avgOrderValue: avgOrderValue[0]?.avg || 0
      },
      statusBreakdown: statusBreakdown.reduce((acc, item) => {
        acc[item._id] = item.count;
        return acc;
      }, {}),
      topArtworks: topArtworks.map(item => ({
        id: item._id,
        title: item.artwork[0]?.title || 'Unknown',
        orders: item.orderCount
      }))
    };
  } catch (error) {
    console.error('Error getting admin stats:', error);
    return {};
  }
};



exports.getAllOrdersAdmin = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      status, 
      paymentStatus,
      search,
      dateFrom,
      dateTo,
      minAmount,
      maxAmount,
      sortBy = 'createdAt', 
      sortOrder = 'desc' 
    } = req.query;

    // Build complex query
    const query = {};
    
    // Status filters
    if (status) query.orderStatus = status;
    if (paymentStatus) query.paymentStatus = paymentStatus;
    
    // Date range filter
    if (dateFrom || dateTo) {
      query.createdAt = {};
      if (dateFrom) query.createdAt.$gte = new Date(dateFrom);
      if (dateTo) query.createdAt.$lte = new Date(dateTo);
    }
    
    // Amount range filter
    if (minAmount || maxAmount) {
      query.totalAmount = {};
      if (minAmount) query.totalAmount.$gte = parseFloat(minAmount);
      if (maxAmount) query.totalAmount.$lte = parseFloat(maxAmount);
    }

    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // Base aggregation pipeline
    let pipeline = [
      { $match: query },
      {
        $lookup: {
          from: 'users',
          localField: 'buyerId',
          foreignField: '_id',
          as: 'buyer'
        }
      },
      {
        $lookup: {
          from: 'artdetails',
          localField: 'artId',
          foreignField: '_id',
          as: 'artworks'
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: 'artworks.artist',
          foreignField: '_id',
          as: 'artists'
        }
      }
    ];

    // Add search functionality
    if (search) {
      pipeline.push({
        $match: {
          $or: [
            { 'buyer.firstName': { $regex: search, $options: 'i' } },
            { 'buyer.lastName': { $regex: search, $options: 'i' } },
            { 'buyer.email': { $regex: search, $options: 'i' } },
            { 'artworks.title': { $regex: search, $options: 'i' } },
            { '_id': { $regex: search.replace(/[^a-fA-F0-9]/g, ''), $options: 'i' } }
          ]
        }
      });
    }

    // Add sorting and pagination
    pipeline.push(
      { $sort: sort },
      { $skip: (page - 1) * limit },
      { $limit: parseInt(limit) }
    );

    const orders = await Order.aggregate(pipeline);
    
    // Get total count for pagination
    const totalPipeline = [...pipeline.slice(0, -2)]; // Remove skip and limit
    totalPipeline.push({ $count: "total" });
    const totalResult = await Order.aggregate(totalPipeline);
    const total = totalResult[0]?.total || 0;

    // Transform data for admin view
    const transformedOrders = orders.map(order => ({
      orderId: order._id,
      orderNumber: order._id.toString().slice(-8).toUpperCase(),
      orderDate: order.createdAt,
      lastUpdated: order.updatedAt,
      status: {
        payment: order.paymentStatus,
        order: order.orderStatus,
        shipping: order.status
      },
      totals: {
        amount: order.totalAmount,
        items: order.totalItems || order.artId.length,
        currency: 'USD'
      },
      customer: {
        id: order.buyer[0]?._id,
        name: `${order.buyer[0]?.firstName} ${order.buyer[0]?.lastName}`,
        email: order.buyer[0]?.email,
        avatar: order.buyer[0]?.avatar?.secure_url,
        isVerified: order.buyer[0]?.isActive
      },
      shipping: {
        address: order.shippingAddress,
        sameAsBilling: order.sameAsShipping
      },
      artworks: order.artworks.map(art => {
        const artist = order.artists.find(a => a._id.toString() === art.artist?.toString());
        return {
          id: art._id,
          title: art.title,
          thumbnail: art.thumbnail?.secure_url || '',
          artist: {
            id: artist?._id,
            name: artist ? `${artist.firstName} ${artist.lastName}` : 'Unknown Artist'
          },
          price: {
            amount: art.priceDetails?.price || 0,
            currency: art.priceDetails?.currency || 'USD'
          },
          category: art.category
        };
      }),
      flags: {
        cancelled: order.cancelled,
        needsAttention: order.orderStatus === 'processing' && 
                       new Date() - new Date(order.createdAt) > 24 * 60 * 60 * 1000, // 24 hours
        highValue: order.totalAmount > 500
      }
    }));

    // Get dashboard statistics
    const stats = await getAdminDashboardStats();

    res.status(200).json({
      success: true,
      data: {
        orders: transformedOrders,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / limit),
          totalOrders: total,
          hasNextPage: page < Math.ceil(total / limit),
          hasPrevPage: page > 1
        },
        stats
      }
    });

  } catch (error) {
    console.error('Error fetching admin orders:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch orders',
      error: error.message
    });
  }
};