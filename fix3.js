const fs = require('fs');
let js = fs.readFileSync('public/js/authority.js', 'utf8');

// Fix the backslashes before backticks and variables
js = js.replace(/\\/g, '');
js = js.replace(/\\\$/g, '$');

fs.writeFileSync('public/js/authority.js', js, 'utf8');
