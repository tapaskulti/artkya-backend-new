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
    const totalUsers = await User.countDocuments();
    // const totalArtists = await User.countDocuments({ role: "ARTIST" });
    const totalArtists = await ArtistDetails.countDocuments();

    return res.json({
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
      {},
      {
        $project: {
          _id: 1,
          name: { $concat: ["$firstName", " ", "$lastName"] },
          email: "$email",
          userType: "$role",
          joiningDate: "$createdAt",
          verified: "$isArtist",
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

    return res.json(userData);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// Get all artist details
exports.getAllArtists = async (req, res) => {
  try {
    const artists = await User.find({ role: "ARTIST" }).select(
      "firstName lastName email createdAt isArtist isActive"
    );
    const artistDetails = await ArtistDetails.find();

    let artistData = [];

    for (let artist of artists) {
      // Find artist details
      const details = artistDetails.find(
        (d) => d.userId.toString() === artist._id.toString()
      );
      const commission = details ? details.originalPercent : 20; // Default 20% if not set

      // Get total art sold and revenue
      const soldArts = await ArtDetails.find({
        artist: artist._id,
        isOriginalSold: true,
      });
      const totalRevenue = soldArts.reduce(
        (sum, art) => sum + art.totalPrice,
        0
      );

      artistData.push({
        name: `${artist.firstName} ${artist.lastName}`,
        email: artist.email,
        userType: "ARTIST",
        joiningDate: artist.createdAt,
        verified: artist.isArtist,
        status: artist.isActive ? "Active" : "Inactive",
        originalCommission: commission,
        totalArtSold: soldArts.length,
        totalRevenue,
      });
    }

    res.json(artistData);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Activate/Deactivate User (Handles artist status)

exports.toggleUserStatus = async (req, res) => {
  try {
    const { id } = req.query;
    const user = await User.findById(id);

    if (!user) return res.status(404).json({ message: "User not found" });

    user.isActive = !user.isActive;
    if (user.role === "ARTIST") {
      user.isArtist = user.isActive;
    }

    await user.save();
    res.json({ message: `User ${user.isActive ? "Activated" : "Deactivated"}`, user });
  } catch (error) {
    res.status(500).json({ message: error.message });
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
