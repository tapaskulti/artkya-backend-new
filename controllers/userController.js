const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const User = require("../models/user");
const cloudinary = require("cloudinary");
const ArtistDetails = require("../models/artistDetails");
const { text } = require("body-parser");
const sgMail = require("@sendgrid/mail");
const crypto = require("crypto");
const { compileTemplate, sendEmail } = require("../utils/emailHelperFunction");

console.log(
  "SendGrid API Key:",
  process.env.SENDGRID_API_KEY ? "Set" : "Missing"
);
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

//creating Refresh Token
const createRefreshToken = (payload) => {
  return jwt.sign(payload, process.env.JWT_SECRET_REFRESH_TOKEN, {
    expiresIn: "10d",
  });
};
//Creating Access Token
const createAccessToken = (payload) => {
  return jwt.sign(payload, process.env.JWT_SECRET_ACCESS_TOKEN, {
    expiresIn: "10d",
  });
};

exports.registerUser = async (req, res) => {
  try {
    const { firstName, lastName, email, password } = req.body;
    let profilePictureFile;

    console.log(req.body);
    // console.log(req.files.avatar);

    if (!firstName || !lastName || !email || !password) {
      return res
        .status(400)
        .send({ status: false, message: "Please Enter the Mandatory Feilds" });
    }

    if (!firstName) {
      return res.status(400).send({
        success: false,
        message: "Please Enter Your First Name",
      });
    }
    if (!lastName) {
      return res.status(400).send({
        success: false,
        message: "Please Enter Your Last Name",
      });
    }
    if (!email) {
      return res.status(400).send({
        success: false,
        message: "Please Enter Your Email",
      });
    }
    if (!password) {
      return res.status(400).send({
        success: false,
        message: "Please Enter Your Password",
      });
    }

    if (req.files) {
      if (req.files.avatar) {
        profilePictureFile = await cloudinary.v2.uploader.upload(
          req.files.avatar.tempFilePath,
          { folder: "ARTKYA_Profile_Image" }
        );
      }
      console.log(profilePictureFile);
    }

    const profileAvatar = profilePictureFile && {
      id: profilePictureFile.public_id,
      secure_url: profilePictureFile.secure_url,
    };

    console.log("profileAvatar", profileAvatar);
    req.body.avatar = profileAvatar ? profileAvatar : "";

    const userExists = await User.findOne({ email });
    if (userExists) {
      return res
        .status(400)
        .send({ status: false, message: "User already exists" });
    }

    const hashPassword = await bcrypt.hash(password, 10);
    req.body.password = hashPassword;
    const user = await User.create(req.body);

    if (user) {
      return res.status(201).send({
        success: true,
        message: "User Created Successfully",
        data: user,
      });
    } else {
      return res.status(400).send({ message: "user not found" });
    }
  } catch (error) {
    return res.status(500).send({ success: false, message: error.message });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    let refresh_Token;
    if (!email) {
      return res.status(400).send({
        success: false,
        message: "Please Enter Your Email",
      });
    }
    if (!password) {
      return res.status(400).send({
        success: false,
        message: "Please Enter Your Password",
      });
    }
    const user = await User.findOne({ email });

    if (!user) {
      return res
        .status(400)
        .send({ success: false, message: "User Not Found" });
    }

    //to check if the password matches or not
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(400).send({
        success: false,
        message: "password didnot match,Try Again!!",
      });
    } else {
      refresh_Token = createRefreshToken({ id: user._id, userRole: user.role });
      console.log("refresh_Token========>", refresh_Token);

      await User.findOneAndUpdate(
        { email },
        {
          refresh_token: refresh_Token,
          refresh_token_expiry: Date.now() + 30 * 24 * 60 * 60 * 1000,
          isLoggedIn: true,
        }
      );
    }

    return res.status(200).send({
      success: true,
      refresh_token: refresh_Token,
      message: "Login Successful",
    });
  } catch (error) {
    return res.status(500).send({ success: false, message: error.message });
  }
};

exports.getAccessToken = async (req, res) => {
  try {
    let rf_token;
    console.log(req.query.email);

    if (req.query.email) {
      rf_token = await User.findOne({
        email: req.query.email,
        refresh_token_expiry: { $gt: Date.now() },
      });
    }

    if (!rf_token) {
      return res.send({ success: false, message: "Please login again" });
    }

    const logInUser = jwt.verify(
      rf_token.refresh_token,
      process.env.JWT_SECRET_REFRESH_TOKEN
    );

    // console.log("logInUser------------------>", logInUser);

    if (!logInUser) {
      return res
        .status(400)
        .send({ success: false, message: "Please login again" });
    }

    const access_Token = createAccessToken({
      _id: logInUser.id,
      userRole: logInUser.role,
    });
    // console.log("access_Token------------------>", access_Token);

    return res.status(200).send({ success: true, accessToken: access_Token });
  } catch (error) {
    return res.status(500).send({ success: false, message: error.message });
  }
};

//   GET LOGGED IN USER
exports.authUser = async (req, res) => {
  try {
    console.log(req.user);
    const getUser = await User.findOne({ _id: req.user._id })
      .select("-refresh_token")
      .select("-refresh_token_expiry");
    return res.status(200).send({ success: true, authUser: getUser });
  } catch (error) {
    return res.status(500).send({ success: false, message: error.message });
  }
};

// GET SINGLE USER
exports.getSingleUserDetailsWithId = async (req, res) => {
  try {
    const { userId } = req.query;
    console.log(req.query);
    const getUser = await User.findOne({ _id: userId })
      .select("-refresh_token")
      .select("-refresh_token_expiry");
    return res.status(200).send({ success: true, data: getUser });
  } catch (error) {
    return res.status(500).send({ success: false, message: error.message });
  }
};

//   GET ALL USER
exports.getAllUsers = async (req, res) => {
  try {
    const allUser = await User.find();
    return res.status(200).send({ success: true, data: allUser });
  } catch (error) {}
  return res.status(500).send({ success: false, message: error.message });
};

//logot
exports.logOut = async (req, res) => {
  try {
    const { email, contactNumber } = req.query;

    if (email) {
      await User.findOneAndUpdate(
        {
          email: email,
        },
        {
          refresh_token: undefined,
          refresh_token_expiry: undefined,
        }
      );
    }

    return res
      .status(200)
      .send({ success: true, message: "logged out successfully" });
  } catch (error) {
    return res.status(500).send({ success: false, message: error.message });
  }
};

// Convert User to Artist
exports.userToArtist = async () => {
  try {
    const { userId } = req.query;
  } catch (error) {
    return res.status(500).send({ success: false, message: error.message });
  }
};

// update Address
exports.updateUserAddress = async (req, res) => {
  try {
    // const { newAddress } = req.body;
    const updateUserAddress = await User.findOneAndUpdate(
      { _id: req.query.userId },
      { $push: { shippingAddress: req.body } }
    );

    return res.status(200).send({ success: true, data: updateUserAddress });
  } catch (error) {
    return res.status(500).send({ success: false, message: error.message });
  }
};

// Forget Password
exports.forgotPasswordmail = async (req, res, next) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res
        .status(400)
        .send({ success: false, message: "Please enter your email" });
    }

    const user = await User.findOne({ email });

    if (!user) {
      return res.send({
        success: false,
        message: "User doesn't exist",
      });
    }

    const forgotToken = crypto.randomBytes(20).toString("hex");
    const forgotPasswordExpiry = Date.now() + 20 * 60 * 1000;
    await User.findOneAndUpdate(
      {
        email,
      },
      {
        forgotPasswordToken: forgotToken,
        forgotPasswordExpiry: forgotPasswordExpiry,
      }
    );

    await user.save({ validateBeforeSave: false });

    let url;
    if (process.env.NODE_ENV === "production") {
      url = `https://artkya.com/reset/${forgotToken}`;
    } else {
      url = `http://localhost:5173/reset/${forgotToken}`;
    }

    const message = `Hello ${user.firstName},\n\nWe received a request to reset your password for your Artkya account.\n\nTo reset your password, click this link: ${url}\n\nThis link will expire in ${forgotPasswordExpiry} minutes.\n\nIf you didn't request this, please ignore this email.`;

    const sendEmailData = {
      to: email,
      from: "artkya23@gmail.com",
      subject: "Reset Your Password - Artkya",
      templateName: "forgotPassword",
      text: message,
      templateData: {
        user: {
          firstName: user.firstName,
          lastName: user.lastName,
          email: email,
        },
        resetPasswordUrl: url,
        expiryTime: forgotPasswordExpiry,
        currentYear: new Date().getFullYear(),
        supportEmail: process.env.SUPPORT_EMAIL || "artkya23@gmail.com",
        websiteUrl: process.env.FRONTEND_URL || "https://artkya.com",
      },
    };

    await sendEmail(sendEmailData);

    console.log("Forgot password email sent successfully to:", user.email);
    return res.status(200).json({
      success: true,
      message: "email sent succesfully",
    });
  } catch (error) {
    console.error("SendGrid Error:", error.response?.body || error.message);

    // Clean up tokens on error
    try {
      await User.findOneAndUpdate(
        { email: req.body.email },
        {
          $unset: {
            forgotPasswordToken: 1,
            forgotPasswordExpiry: 1,
          },
        }
      );
    } catch (cleanupError) {
      console.error("Cleanup error:", cleanupError);
    }

    return res.status(500).json({
      success: false,
      message: "Failed to send reset email. Please try again later.",
    });
  }
};

// Reset Password

exports.resetPassword = async (req, res) => {
  const { password } = req.body;

  if (!req.query.token) {
    return res
      .status(400)
      .send({ success: false, message: "Please enter your token" });
  }

  if (!password) {
    return res
      .status(400)
      .send({ success: false, message: "Please enter your password" });
  }

  try {
    const user = await User.findOne({
      forgotPasswordToken: req.query.token,
      forgotPasswordExpiry: {
        $gt: Date.now(),
      },
    });

    if (!user) {
      return res.send({
        success: false,
        message: "Token is invalid or expired",
      });
    }

    const hashPassword = await bcrypt.hash(password, 10);
    //update password in database
    console.log(req.user);
    const updateUserDetails = await User.findOneAndUpdate(
      { _id: user._id },
      {
        password: hashPassword,
        forgotPasswordExpiry: undefined,
        forgotPasswordToken: undefined,
      }
    );

    res.status(200).send({
      success: true,
      message: "password updated successfully",
      data: updateUserDetails,
    });
  } catch (error) {
    return res.status(500).send({ success: false, message: error.message });
  }
};

exports.uploadUserAvatar = async (req, res) => {
  try {
    const { userId } = req.query;

    if (!req.files || !req.files.avatar) {
      return res.status(400).send({
        success: false,
        message: "Avatar image is required.",
      });
    }

    console.log("req.files.avatar==>", req.files.avatar);
    const avatarFile = await cloudinary.v2.uploader.upload(
      req.files.avatar.tempFilePath,
      { folder: "User_Avatars" }
    );

    if (!avatarFile) {
      return res.status(500).send({
        success: false,
        message: "Failed to upload avatar image.",
      });
    }

    const avatar = {
      id: avatarFile.public_id,
      secure_url: avatarFile.secure_url,
    };

    // Update the user collection
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { avatar },
      { new: true }
    );

    if (!updatedUser) {
      return res.status(404).send({
        success: false,
        message: "User not found.",
      });
    }

    // Check if the user is an artist and update the artistDetails collection if true
    if (updatedUser.isArtist) {
      const updatedArtist = await ArtistDetails.findOneAndUpdate(
        { userId },
        { profileImage: avatar },
        { new: true }
      );

      if (!updatedArtist) {
        return res.status(404).send({
          success: false,
          message: "Artist details not found",
        });
      }
    }

    return res.status(200).send({
      success: true,
      message: "Avatar updated successfully",
      data: updatedUser,
    });
  } catch (error) {
    return res.status(500).send({
      success: false,
      message: error.message,
    });
  }
};

exports.sendOrderDetails = async (req, res, next) => {
  try {
    const {
      fullName,
      address,
      contactNumber,
      contactEmail,
      description,
      artworkTitle,
      artworkImage,
      artworkId,
    } = req.body;

    // Validate required fields
    if (!fullName || !address || !contactNumber || !contactEmail) {
      return res.status(400).json({
        success: false,
        message:
          "Please fill in all required fields (Full Name, Address, Contact Number, Email)",
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(contactEmail)) {
      return res.status(400).json({
        success: false,
        message: "Please enter a valid email address",
      });
    }

    // Validate phone number (basic validation)
    const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
    if (!phoneRegex.test(contactNumber.replace(/\s+/g, ""))) {
      return res.status(400).json({
        success: false,
        message: "Please enter a valid contact number",
      });
    }

    // Prepare order details data
    const orderDate = new Date().toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    const orderTime = new Date().toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });

    console.log("admin email data===>", {
      customer: {
        fullName: fullName,
        contactEmail: contactEmail,
        contactNumber: contactNumber,
        address: address,
        description: description || null,
      },
      artwork: {
        title: artworkTitle || "Artwork",
        image: artworkImage || null,
        id: artworkId || null,
      },
      orderDate: orderDate,
      orderTime: orderTime,
      supportEmail: process.env.SUPPORT_EMAIL || "support@artkya.com",
      currentYear: new Date().getFullYear(),
    });

    // Email data for admin/support team
    const adminEmailData = {
      to: "artkya23@gmail.com",
      from: "artkya23@gmail.com",
      subject: `New Order Inquiry - ${artworkTitle || "Artwork"} - ${fullName}`,
      templateName: "AdminOrderDetails",
      templateData: {
        customer: {
          fullName: fullName,
          contactEmail: contactEmail,
          contactNumber: contactNumber,
          address: address,
          description: description || null,
        },
        artwork: {
          title: artworkTitle || "Artwork",
          image: artworkImage || null,
          id: artworkId || null,
        },
        orderDate: orderDate,
        orderTime: orderTime,
        supportEmail: process.env.SUPPORT_EMAIL || "support@artkya.com",
        currentYear: new Date().getFullYear(),
      },
    };

    // Send email to admin/support team
    await sendEmail(adminEmailData); // or "nodemailer"

    console.log("email data===>", {
      customer: {
        firstName: fullName.split(" ")[0], // Get first name
        fullName: fullName,
        email: contactEmail,
        contactNumber: contactNumber,
        address: address,
        description: description || null,
      },
      artwork: {
        title: artworkTitle || "Artwork",
        image: artworkImage || null,
      },
      orderDate: orderDate,
      orderTime: orderTime,
      supportEmail: process.env.SUPPORT_EMAIL || "support@artkya.com",
      currentYear: new Date().getFullYear(),
      websiteUrl: process.env.FRONTEND_URL || "https://artkya.com",
    });

    // Optional: Send confirmation email to customer
    const customerEmailData = {
      to: contactEmail,
      from: "artkya23@gmail.com",
      subject: `Order Inquiry Received - ${artworkTitle || "Artwork"} - Artkya`,
      templateName: "customerOrderConfirmation", // You'll need to create this template
      templateData: {
        customer: {
          firstName: fullName.split(" ")[0], // Get first name
          fullName: fullName,
          email: contactEmail,
          contactNumber: contactNumber,
          address: address,
          description: description || null,
        },
        artwork: {
          title: artworkTitle || "Artwork",
          image: artworkImage || null,
        },
        orderDate: orderDate,
        orderTime: orderTime,
        supportEmail: process.env.SUPPORT_EMAIL,
        currentYear: new Date().getFullYear(),
        websiteUrl: process.env.FRONTEND_URL || "https://artkya.com",
      },
    };

    // Send confirmation to customer
    await sendEmail(customerEmailData);

    console.log(
      "Order details email sent successfully to admin:",
      adminEmailData.to
    );
    console.log(
      "Confirmation email sent successfully to customer:",
      contactEmail
    );

    return res.status(200).json({
      success: true,
      message: "Order details sent successfully! We will contact you soon.",
    });
  } catch (error) {
    console.error(
      "Email sending error:",
      error.response?.body || error.message
    );

    return res.status(500).json({
      success: false,
      message: "Failed to send order details. Please try again later.",
    });
  }
};
