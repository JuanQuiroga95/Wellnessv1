const fs = require('fs');

let c = fs.readFileSync('src/app/coach/CoachClient.tsx', 'utf8');
c = c.replace(/growUpAnim 2.5s/g, 'growUpAnim 5s');
c = c.replace(/fadeUpAnim 2.5s/g, 'fadeUpAnim 5s');
c = c.replace(/fadeInAnim 2.5s/g, 'fadeInAnim 5s');
fs.writeFileSync('src/app/coach/CoachClient.tsx', c, 'utf8');

let g = fs.readFileSync('src/app/globals.css', 'utf8');
g = g.replace('animation: fillBarWidth 2.5s', 'animation: fillBarWidth 5s');
fs.writeFileSync('src/app/globals.css', g, 'utf8');

console.log('Slowed down bar animations to 5s');
