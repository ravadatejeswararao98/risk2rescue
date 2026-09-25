const fs = require('fs');
let js = fs.readFileSync('public/js/authority.js', 'utf8');
js = js.replace(/<think>\[sS\]\*\?<\/think>/g, '<think>[\\s\\S]*?<\\/think>');
fs.writeFileSync('public/js/authority.js', js, 'utf8');
