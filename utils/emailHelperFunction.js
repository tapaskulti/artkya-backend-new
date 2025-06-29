const fs = require('fs');
const path = require('path');
const handlebars = require('handlebars');


exports.compileTemplate = (templateName, data) => {
  try {
    const templatePath = path.join(__dirname, `../template/${templateName}.hbs`,);
    const templateSource = fs.readFileSync(templatePath, 'utf8');
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
    const { to, from, subject, templateName, templateData, attachments } = options;
    
    // Compile template
    const html = compileTemplate(templateName, templateData);
    
    const msg = {
      to: to,
      from: from || process.env.FROM_EMAIL,
      subject: subject,
      html: html,
      attachments: attachments || []
    };

    const result = await sgMail.send(msg);
    console.log('Email sent successfully via SendGrid SDK');
    return result;
  } catch (error) {
    console.error('SendGrid SDK Error:', error);
    throw error;
  }
}

async function sendEmailWithNodemailer(options) {
  try {
    const { to, from, subject, templateName, templateData, attachments } = options;
    
    // Compile template
    const html = compileTemplate(templateName, templateData);
    
    const mailOptions = {
      from: from || process.env.FROM_EMAIL,
      to: to,
      subject: subject,
      html: html,
      attachments: attachments || []
    };

    const result = await transporter.sendMail(mailOptions);
    console.log('Email sent successfully via Nodemailer');
    return result;
  } catch (error) {
    console.error('Nodemailer Error:', error);
    throw error;
  }
}

// Unified function to send email (you can choose which method to use)
async function sendEmail(options, method = 'sendgrid') {
  if (method === 'nodemailer') {
    return await sendEmailWithNodemailer(options);
  } else {
    return await sendEmailWithSendGrid(options);
  }
}
