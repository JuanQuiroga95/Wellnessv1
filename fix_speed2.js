const fs = require('fs');

let c = fs.readFileSync('src/app/coach/CoachClient.tsx', 'utf8');
c = c.replace(/columns: '180px'/g, 'columnCount: 2');
c = c.replace(/growUpAnim 5s/g, 'growUpAnim 8s');
c = c.replace(/fadeUpAnim 5s/g, 'fadeUpAnim 8s');
c = c.replace(/fadeInAnim 5s/g, 'fadeInAnim 8s');
fs.writeFileSync('src/app/coach/CoachClient.tsx', c, 'utf8');

let g = fs.readFileSync('src/app/globals.css', 'utf8');
g = g.replace('animation: fillBarWidth 5s', 'animation: fillBarWidth 8s');
fs.writeFileSync('src/app/globals.css', g, 'utf8');

console.log('Fixed to 2 columns and 8s speed');
