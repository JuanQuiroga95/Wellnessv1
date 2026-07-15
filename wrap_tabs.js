const fs = require('fs');

let c = fs.readFileSync('src/app/coach/CoachClient.tsx', 'utf8');

c = c.replace(
  "<main style={{ flex:1, maxWidth:1200, margin:'0 auto', padding:'24px 16px', minWidth:0 }}>",
  "<main style={{ flex:1, maxWidth:1200, margin:'0 auto', padding:'24px 16px', minWidth:0 }}>\n          <AnimateOnScroll key={tab} delay={100}>"
);

c = c.replace(
  "        {tab==='notificaciones' && <NotificacionesCoachPanel />}",
  "        {tab==='notificaciones' && <NotificacionesCoachPanel />}\n          </AnimateOnScroll>"
);

fs.writeFileSync('src/app/coach/CoachClient.tsx', c, 'utf8');

// Update AnimateOnScroll to render children immediately but keep the pause-animations class
let a = fs.readFileSync('src/components/AnimateOnScroll.tsx', 'utf8');
a = a.replace('{isVisible ? children : null}', '{children}');
fs.writeFileSync('src/components/AnimateOnScroll.tsx', a, 'utf8');

console.log('Fixed main tab wrapper');
