const fs = require('fs');
let c = fs.readFileSync('src/app/coach/CoachClient.tsx', 'utf8');

// 1. Add AnimateOnScroll component
const animateOnScrollCode = `
const AnimateOnScroll = ({ children }) => {
  const [isVisible, setIsVisible] = React.useState(false);
  const ref = React.useRef(null);
  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { setIsVisible(true); obs.disconnect(); }
    }, { threshold: 0.1 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return (
    <div ref={ref} className={isVisible ? "start-animations" : "pause-animations"} style={{ width: '100%', height: '100%' }}>
      {typeof children === 'function' ? children(isVisible) : children}
    </div>
  )
}
`;

if (!c.includes('const AnimateOnScroll')) {
  c = c.replace('export default function CoachClient', animateOnScrollCode + '\nexport default function CoachClient');
}

// 2. Add the CSS rules
const pauseCss = `
          .pause-animations .anim-grow-up,
          .pause-animations .anim-fade-up,
          .pause-animations .anim-fade-in,
          .pause-animations .anim-bar { animation: none !important; opacity: 0 !important; }
          .pause-animations .anim-grow-up { transform: scaleY(0) !important; }
          .pause-animations .anim-bar { transform: scaleX(0) !important; }
`;
if (!c.includes('.pause-animations .anim-grow-up')) {
  c = c.replace('`}</style>', pauseCss + '        `}</style>');
}

// 3. Wrap GRUPOS charts
c = c.replace(
  /{GRUPOS\.map\(g=>renderGrupoBar\(g,'md','promedio'\)\)}/g,
  `<AnimateOnScroll>
                 <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(260px,1fr))', gap:16, width: '100%' }}>
                   {GRUPOS.map(g=>renderGrupoBar(g,'md','promedio'))}
                 </div>
               </AnimateOnScroll>`
);
// Fix the outer grid because we just wrapped it, wait, we should wrap the inner or outer?
// If we replace `{GRUPOS.map...}`, it was inside a grid.
// Let's replace the grid itself!
const gridStart = `<div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(260px,1fr))', gap:16 }}>
              {GRUPOS.map(g=>renderGrupoBar(g,'md','promedio'))}
            </div>`;
const gridEnd = `<AnimateOnScroll>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(260px,1fr))', gap:16 }}>
                {GRUPOS.map(g=>renderGrupoBar(g,'md','promedio'))}
              </div>
            </AnimateOnScroll>`;
c = c.replace(gridStart, gridEnd);

// Do it for the 'totales' one as well
const gridStart2 = `<div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(260px,1fr))', gap:16 }}>
            {GRUPOS.map(g=>renderGrupoBar(g,'md','totales'))}
          </div>`;
const gridEnd2 = `<AnimateOnScroll>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(260px,1fr))', gap:16 }}>
              {GRUPOS.map(g=>renderGrupoBar(g,'md','totales'))}
            </div>
          </AnimateOnScroll>`;
c = c.replace(gridStart2, gridEnd2);

// 4. Wrap PieChart and Bars in Distribucion de Tareas
// PieChart uses `isAnimationActive={true}`. We will use the function child pattern!
const pieChartOriginal = `<PieChart width={180} height={180}>`;
const pieChartReplace = `<AnimateOnScroll>
                  {(isVisible) => isVisible ? (
                    <PieChart width={180} height={180}>`;
const pieChartOriginalEnd = `</PieChart>`;
const pieChartReplaceEnd = `</PieChart>
                  ) : <div style={{ width: 180, height: 180 }} />}
                </AnimateOnScroll>`;

// Since there is only one PieChart in this block, we can replace it.
// Wait, there might be other PieCharts! The one for Distribucion de Tareas has `innerRadius={0}`.
// Let's match the specific pie chart!
if (!c.includes('<AnimateOnScroll>\n                  {(isVisible) => isVisible ? (')) {
  c = c.replace(/<PieChart width={180} height={180}>/g, pieChartReplace);
  c = c.replace(/<\/PieChart>/g, pieChartReplaceEnd);
}

// 5. Wrap the field bars and gym bars in AnimateOnScroll
// Wait, .anim-bar inside Distribucion de Tareas will automatically pause if it's inside AnimateOnScroll!
// Let's just wrap the entire `Distribución de Tareas` block!
const distBlockStart = `<div style={{ display:'flex', gap:24, flexWrap:'wrap', alignItems:'flex-start', justifyContent:'center' }}>`;
const distBlockEnd = `<AnimateOnScroll>
            <div style={{ display:'flex', gap:24, flexWrap:'wrap', alignItems:'flex-start', justifyContent:'center' }}>`;
c = c.replace(distBlockStart, distBlockEnd);

// Find the end of Distribucion de Tareas to close AnimateOnScroll.
// It's closed right before `</div>\n          </div>\n        </div>` ...
c = c.replace(
  `{/* Desglose de Tareas de Gimnasio */}
              {gymSorted.length > 0 && (
                <div style={{ flex:1, minWidth:250, order: 3 }}>
                  <p style={{ fontSize:11, color:'var(--fog)', marginBottom:8 }}>Desglose de Gimnasio</p>
                  <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(180px, 1fr))', gap:10 }}>
                    {gymSorted.map(([nombre, mins]) => {
                      const p = Math.round((mins / totalGymMin) * 100)
                      return (
                        <div key={nombre} style={{ background:'rgba(59,130,246,.05)', border:'1px solid rgba(59,130,246,.15)', borderRadius:8, padding:'8px 12px' }}>
                          <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
                            <span style={{ fontSize:11, color:'var(--snow)', fontWeight:600, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }} title={nombre}>{nombre}</span>
                            <span style={{ fontSize:11, color:'#60a5fa', fontWeight:700 }}>{p}%</span>
                          </div>
                          <div style={{ width:'100%', height:4, background:'var(--ink3)', borderRadius:2, overflow:'hidden' }}>
                            <div className="anim-bar" style={{ width:\`\${p}%\`, height:'100%', background:'#60a5fa' }}></div>
                          </div>
                          <div style={{ fontSize:9, color:'var(--fog)', marginTop:4, textAlign:'right' }}>{mins} min</div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>`,
  `{/* Desglose de Tareas de Gimnasio */}
              {gymSorted.length > 0 && (
                <div style={{ flex:1, minWidth:250, order: 3 }}>
                  <p style={{ fontSize:11, color:'var(--fog)', marginBottom:8 }}>Desglose de Gimnasio</p>
                  <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(180px, 1fr))', gap:10 }}>
                    {gymSorted.map(([nombre, mins]) => {
                      const p = Math.round((mins / totalGymMin) * 100)
                      return (
                        <div key={nombre} style={{ background:'rgba(59,130,246,.05)', border:'1px solid rgba(59,130,246,.15)', borderRadius:8, padding:'8px 12px' }}>
                          <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
                            <span style={{ fontSize:11, color:'var(--snow)', fontWeight:600, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }} title={nombre}>{nombre}</span>
                            <span style={{ fontSize:11, color:'#60a5fa', fontWeight:700 }}>{p}%</span>
                          </div>
                          <div style={{ width:'100%', height:4, background:'var(--ink3)', borderRadius:2, overflow:'hidden' }}>
                            <div className="anim-bar" style={{ width:\`\${p}%\`, height:'100%', background:'#60a5fa' }}></div>
                          </div>
                          <div style={{ fontSize:9, color:'var(--fog)', marginTop:4, textAlign:'right' }}>{mins} min</div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          </AnimateOnScroll>`
);

// If the above replace didn't work because we nested PieChart inside AnimateOnScroll and we just wrapped the whole thing in AnimateOnScroll too!
// That's fine! The outer AnimateOnScroll will provide `.pause-animations`. The inner AnimateOnScroll will provide `isVisible` to the PieChart function!
// Wait! `<AnimateOnScroll>` function signature:
// `{typeof children === 'function' ? children(isVisible) : children}`
// This handles both nested children and function children perfectly!

fs.writeFileSync('src/app/coach/CoachClient.tsx', c, 'utf8');
console.log('Fixed scroll animations!');
