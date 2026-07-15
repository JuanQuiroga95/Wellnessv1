const fs = require('fs');

let c = fs.readFileSync('src/app/coach/CoachClient.tsx', 'utf8');
c = c.replace(/growUpAnim 8s/g, 'growUpAnim 15s');
c = c.replace(/fadeUpAnim 8s/g, 'fadeUpAnim 15s');
c = c.replace(/fadeInAnim 8s/g, 'fadeInAnim 15s');
c = c.replace(/>{mins} \\n?\s*min<\/div>/g, '>{Number(Number(mins).toFixed(2))} min</div>');
fs.writeFileSync('src/app/coach/CoachClient.tsx', c, 'utf8');

let g = fs.readFileSync('src/app/globals.css', 'utf8');
g = g.replace('animation: fillBarWidth 8s', 'animation: fillBarWidth 15s');
fs.writeFileSync('src/app/globals.css', g, 'utf8');

console.log('Fixed to 15s speed and 2 decimals for mins');
