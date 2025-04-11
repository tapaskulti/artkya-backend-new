const nodemailer = require("nodemailer");
const handlebars = require("handlebars");
const fs = require("fs");
const path = require("path");
const User = require("../models/user");
const ArtistDetails = require("../models/artistDetails");
const ArtDetails = require("../models/art");

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
          role:"$role",
          userType: {
            $cond:{
              if:"isArtist",
              then:"ARTIST",
              else:"USER"
            }
          },
          joiningDate: "$createdAt",
          verified: {
            $cond: {
              if: "$isArtApprovalReq",
              then: "Unverified",
              else: "Verified",
            }
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
          originalCommission:"$artistDetails.originalPercent",
          totalArtSold: { $size: "$soldArts" }, // Count of sold arts
          totalRevenue: { $sum: "$soldArts.totalPrice" }, // Sum of totalPrice from sold arts
        },
      },
    ])

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
exports.updatePrintCommission = async (req, res) => {
  try {
    const { artistId } = req.query;
    const { printPercent } = req.body;

    const artistDetails = await ArtistDetails.findOneAndUpdate(
      { userId: artistId },
      { printPercent },
      { new: true }
    );

    if (!artistDetails) {
      return res.status(404).json({ message: "Artist not found" });
    }

    return res.status(200).json({ message: "Print commission updated", artistDetails });
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

    return res.status(200).json({ message: "Artist verified by admin", artistDetails });
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
    const { id } = req.query;
    const artwork = await ArtDetails.findById(id).populate("artist");

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


exports.getAllPainting

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
