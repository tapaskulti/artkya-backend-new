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
