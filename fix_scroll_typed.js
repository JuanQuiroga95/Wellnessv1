const fs = require('fs');
let c = fs.readFileSync('src/app/coach/CoachClient.tsx', 'utf8');

// 1. Add AnimateOnScroll component
const animateOnScrollCode = `
const AnimateOnScroll = ({ children }: { children: React.ReactNode | ((isVisible: boolean) => React.ReactNode) }) => {
  const [isVisible, setIsVisible] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);
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
      {typeof children === 'function' ? (children as any)(isVisible) : children}
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
const gridStart = `<div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(260px,1fr))', gap:16 }}>
            {GRUPOS.map(g=>renderGrupoBar(g,'md','totales'))}
          </div>`;
const gridEnd = `<AnimateOnScroll>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(260px,1fr))', gap:16 }}>
              {GRUPOS.map(g=>renderGrupoBar(g,'md','totales'))}
            </div>
          </AnimateOnScroll>`;
c = c.replace(gridStart, gridEnd);

const gridStart2 = `<div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(260px,1fr))', gap:16 }}>
              {GRUPOS.map(g=>renderGrupoBar(g,'md','promedio'))}
            </div>`;
const gridEnd2 = `<AnimateOnScroll>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(260px,1fr))', gap:16 }}>
                {GRUPOS.map(g=>renderGrupoBar(g,'md','promedio'))}
              </div>
            </AnimateOnScroll>`;
c = c.replace(gridStart2, gridEnd2);

// 4. Wrap PieChart
const pieChartOriginal = `<PieChart width={180} height={180}>`;
const pieChartReplace = `<AnimateOnScroll>
                  {(isVisible) => isVisible ? (
                    <PieChart width={180} height={180}>`;
const pieChartOriginalEnd = `</PieChart>`;
const pieChartReplaceEnd = `</PieChart>
                  ) : <div style={{ width: 180, height: 180 }} />}
                </AnimateOnScroll>`;

// Since there is only one PieChart in this block, we can replace it.
if (!c.includes('<AnimateOnScroll>\n                  {(isVisible) => isVisible ? (')) {
  c = c.replace(/<PieChart width={180} height={180}>/g, pieChartReplace);
  c = c.replace(/<\/PieChart>/g, pieChartReplaceEnd);
}

// 5. Wrap the Distribución de Tareas block
// Wait! Instead of wrapping the whole thing, the bars will just be paused by `.pause-animations` if they are wrapped in any parent AnimateOnScroll!
// Let's just wrap the entire `Distribución de Tareas` flex container!
const distBlockStart = `<div style={{ display:'flex', gap:24, flexWrap:'wrap', alignItems:'flex-start', justifyContent:'center' }}>`;
const distBlockEnd = `<AnimateOnScroll>
            <div style={{ display:'flex', gap:24, flexWrap:'wrap', alignItems:'flex-start', justifyContent:'center' }}>`;
c = c.replace(distBlockStart, distBlockEnd);

// Find the end of Distribucion de Tareas to close AnimateOnScroll.
// We can just find the exact block end.
const endOfGym = `{gymSorted.map(([nombre, mins]) => {
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
          </div>`;
c = c.replace(endOfGym, endOfGym + '\n          </AnimateOnScroll>');

fs.writeFileSync('src/app/coach/CoachClient.tsx', c, 'utf8');
console.log('Fixed scroll animations with proper TSX typing!');
