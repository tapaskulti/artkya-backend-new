const sgMail = require("@sendgrid/mail");
const nodemailer = require("nodemailer");
const handlebars = require("handlebars");
const fs = require("fs");
const path = require("path");

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

// Setup nodemailer transport for SendGrid
const transporter = nodemailer.createTransport({
  service: "SendGrid",
  auth: {
    user: "apikey",
    pass: process.env.SENDGRID_API_KEY,
  },
});


const compileTemplate = (templateName, data) => {
  try {
    const templatePath = path.join(
      __dirname,
      `../template/${templateName}.hbs`
    );
    const templateSource = fs.readFileSync(templatePath, "utf8");
    const template = handlebars.compile(templateSource);
    return template(data);
  } catch (error) {
    console.error(`Error compiling template ${templateName}:`, error);
    throw new Error(`Template compilation failed: ${templateName}`);
  }
};


// Method 1: Using SendGrid SDK directly
async function sendEmailWithSendGrid(options) {
  try {
    const { to, from, subject, templateName, templateData, attachments } =
      options;

    // Compile template
    const html = compileTemplate(templateName, templateData);

    const msg = {
      to: to,
      from: from || process.env.EMAIL_USER,
      subject: subject,
      html: html,
      attachments: attachments || [],
    };

    const result = await sgMail.send(msg);
    console.log("Email sent successfully via SendGrid SDK");
    return result;
  } catch (error) {
    console.error("SendGrid SDK Error:", error);
    throw error;
  }
}

async function sendEmailWithNodemailer(options) {
  try {
    const { to, from, subject, templateName, templateData, attachments } =
      options;

    // Compile template
    const html = compileTemplate(templateName, templateData);

    const mailOptions = {
      from: from || process.env.EMAIL_USER,
      to: to,
      subject: subject,
      html: html,
      attachments: attachments || [],
    };

    const result = await transporter.sendMail(mailOptions);
    console.log("Email sent successfully via Nodemailer");
    return result;
  } catch (error) {
    console.error("Nodemailer Error:", error);
    throw error;
  }
}

// Unified function to send email (you can choose which method to use)
exports.sendEmail = async (options, method = "nodemailer")=>{
  if (method === "sendgrid") {
    return await sendEmailWithSendGrid(options);
  } else {
    return await sendEmailWithNodemailer(options);
  }
}
