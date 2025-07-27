
const emailConfig = {
  sendgrid: {
    apiKey: process.env.SENDGRID_API_KEY,
    fromEmail: process.env.EMAIL_USER || 'noreply@yourdomain.com'
  },
  templates: {
    path: './templates',
    extension: '.hbs'
  }
};

module.exports = emailConfig;