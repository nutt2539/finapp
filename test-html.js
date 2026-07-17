const fs = require('fs');
const html = fs.readFileSync('/Users/nuttp./.gemini/antigravity/scratch/finance-dashboard/index.html', 'utf8');
console.log("has ical.js?", html.includes('ical.js'));
