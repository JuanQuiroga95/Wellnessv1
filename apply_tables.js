const fs = require('fs');
let coach = fs.readFileSync('src/app/coach/CoachClient.tsx', 'utf8');
coach = coach.replace(/<table /g, '<table className="wp-table" ');
fs.writeFileSync('src/app/coach/CoachClient.tsx', coach, 'utf8');

let enf = fs.readFileSync('src/app/coach/EnfermeriaPanel.tsx', 'utf8');
enf = enf.replace(/<table /g, '<table className="wp-table" ');
fs.writeFileSync('src/app/coach/EnfermeriaPanel.tsx', enf, 'utf8');
