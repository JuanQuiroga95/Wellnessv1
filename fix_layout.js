const fs = require('fs');
let c = fs.readFileSync('src/app/coach/CoachClient.tsx', 'utf8');

c = c.replace('<AnimatedPieChart {...props}>{props.children}</AnimatedPieChart>', '<PieChart {...props}>{props.children}</PieChart>');
c = c.replace(/growUpAnim 1s/g, 'growUpAnim 2.5s');
c = c.replace(/fadeUpAnim 1s/g, 'fadeUpAnim 2.5s');
c = c.replace(/fadeInAnim 1s/g, 'fadeInAnim 2.5s');
c = c.split("gridTemplateColumns:'repeat(auto-fill, minmax(180px, 1fr))'").join("gridTemplateRows:'repeat(10, auto)', gridAutoFlow:'column', gridAutoColumns:'minmax(180px, 1fr)'");

// Reduce animation active duration for PieChart
c = c.replace('animationDuration={1200}', 'animationDuration={2500}');

fs.writeFileSync('src/app/coach/CoachClient.tsx', c, 'utf8');

let g = fs.readFileSync('src/app/globals.css', 'utf8');
g = g.replace('animation: fillBarWidth 1.2s', 'animation: fillBarWidth 2.5s');
fs.writeFileSync('src/app/globals.css', g, 'utf8');

console.log('Fixed pie chart, slowed down animations, adjusted grid layout');
