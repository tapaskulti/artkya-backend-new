const nodemailer = require('nodemailer');
const handlebars = require("handlebars");
const fs = require("fs");
const path = require("path");



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
        `
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
        `
      };
  
      // Send both emails concurrently
      await Promise.all([
        transporter.sendMail(adminMailOptions),
        transporter.sendMail(userMailOptions)
      ]);
  
      res.status(200).json({ message: "Messages sent successfully" });
  
    } catch (err) {
      console.error('Email sending error:', err);
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
        html: originalArtBuyBody
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
        transporter.sendMail(userMailOptions)
      ]);
  
      res.status(200).json({ message: "Messages sent successfully" });
  
    } catch (err) {
      console.error('Email sending error:', err);
      res.status(500).json({ error: "Failed to send email" });
    }
  };



