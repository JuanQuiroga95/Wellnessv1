const fs = require('fs');
let c = fs.readFileSync('src/app/coach/CoachClient.tsx', 'utf8');

const components = `
const AnimateOnScroll = ({ children, minHeight = 0 }: { children: any, minHeight?: number }) => {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { setIsVisible(true); obs.disconnect(); }
    }, { threshold: 0.1 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return (
    <div ref={ref} className={isVisible ? "start-animations" : "pause-animations"} style={{ width: '100%', minHeight }}>
      {children}
    </div>
  )
}

const AnimatedPieChart = (props: any) => {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { setIsVisible(true); obs.disconnect(); }
    }, { threshold: 0.1 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return (
    <div ref={ref} style={{ width: props.width, height: props.height }}>
      {isVisible && <PieChart {...props}>{props.children}</PieChart>}
    </div>
  )
}
`;

if (!c.includes('const AnimateOnScroll')) {
  c = c.replace('export default function CoachClient', components + '\nexport default function CoachClient');
}

const pauseCss = `
          .pause-animations .anim-grow-up,
          .pause-animations .anim-fade-up,
          .pause-animations .anim-fade-in,
          .pause-animations .anim-bar { animation: none !important; opacity: 0 !important; }
          .pause-animations .anim-grow-up { transform: scaleY(0) !important; }
          .pause-animations .anim-bar { transform: scaleX(0) !important; }
`;
if (!c.includes('.pause-animations .anim-grow-up')) {
  c = c.replace('\`}</style>', pauseCss + '        \`}</style>');
}

const gridStart = `<div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(260px,1fr))', gap:16 }}>
              {GRUPOS.map(g=>renderGrupoBar(g,'md','promedio'))}
            </div>`;
const gridEnd = `<AnimateOnScroll minHeight={200}>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(260px,1fr))', gap:16 }}>
                {GRUPOS.map(g=>renderGrupoBar(g,'md','promedio'))}
              </div>
            </AnimateOnScroll>`;
c = c.replace(gridStart, gridEnd);

const gridStart2 = `<div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(260px,1fr))', gap:16 }}>
            {GRUPOS.map(g=>renderGrupoBar(g,'md','totales'))}
          </div>`;
const gridEnd2 = `<AnimateOnScroll minHeight={200}>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(260px,1fr))', gap:16 }}>
              {GRUPOS.map(g=>renderGrupoBar(g,'md','totales'))}
            </div>
          </AnimateOnScroll>`;
c = c.replace(gridStart2, gridEnd2);

const distStart = `<div style={{ display:'flex', gap:24, flexWrap:'wrap', alignItems:'flex-start', justifyContent:'center' }}>`;
const distEnd = `<AnimateOnScroll minHeight={200}>
            <div style={{ display:'flex', gap:24, flexWrap:'wrap', alignItems:'flex-start', justifyContent:'center' }}>`;
c = c.replace(distStart, distEnd);

const gymEnd = `{mins} min</div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>`;
if (c.includes(gymEnd)) {
    c = c.replace(gymEnd, gymEnd + '\\n          </AnimateOnScroll>');
}

c = c.split('<PieChart ').join('<AnimatedPieChart ');
c = c.split('</PieChart>').join('</AnimatedPieChart>');

fs.writeFileSync('src/app/coach/CoachClient.tsx', c, 'utf8');
console.log('Fixed scroll animations with simplified TSX!');
