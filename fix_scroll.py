import sys

with open('src/app/coach/CoachClient.tsx', 'r', encoding='utf-8') as f:
    c = f.read()

# 1. Add AnimateOnScroll if not there
animate_code = """
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
"""
if 'const AnimateOnScroll' not in c:
    c = c.replace('export default function CoachClient', animate_code + '\nexport default function CoachClient')

# 2. Add CSS
pause_css = """
          .pause-animations .anim-grow-up,
          .pause-animations .anim-fade-up,
          .pause-animations .anim-fade-in,
          .pause-animations .anim-bar { animation: none !important; opacity: 0 !important; }
          .pause-animations .anim-grow-up { transform: scaleY(0) !important; }
          .pause-animations .anim-bar { transform: scaleX(0) !important; }
"""
if '.pause-animations' not in c:
    c = c.replace('`}</style>', pause_css + '        `}</style>')

# 3. Wrap GRUPOS (Promedio)
grid_start = """<div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(260px,1fr))', gap:16 }}>
              {GRUPOS.map(g=>renderGrupoBar(g,'md','promedio'))}
            </div>"""
grid_end = """<AnimateOnScroll>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(260px,1fr))', gap:16 }}>
                {GRUPOS.map(g=>renderGrupoBar(g,'md','promedio'))}
              </div>
            </AnimateOnScroll>"""
c = c.replace(grid_start, grid_end)

# 4. Wrap GRUPOS (Totales)
grid_start2 = """<div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(260px,1fr))', gap:16 }}>
            {GRUPOS.map(g=>renderGrupoBar(g,'md','totales'))}
          </div>"""
grid_end2 = """<AnimateOnScroll>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(260px,1fr))', gap:16 }}>
              {GRUPOS.map(g=>renderGrupoBar(g,'md','totales'))}
            </div>
          </AnimateOnScroll>"""
c = c.replace(grid_start2, grid_end2)

# 5. Wrap PieChart
pie_start = "<PieChart width={180} height={180}>"
pie_end = """<AnimateOnScroll>
                  {(isVisible) => isVisible ? (
                    <PieChart width={180} height={180}>"""
if '<AnimateOnScroll>\n                  {(isVisible)' not in c:
    c = c.replace(pie_start, pie_end)
    c = c.replace("</PieChart>", "</PieChart>\n                  ) : <div style={{ width: 180, height: 180 }} />}\n                </AnimateOnScroll>")

# 6. Wrap Distribucion de Tareas container to pause inner bars
dist_start = "<div style={{ display:'flex', gap:24, flexWrap:'wrap', alignItems:'flex-start', justifyContent:'center' }}>"
dist_end = "<AnimateOnScroll>\n            <div style={{ display:'flex', gap:24, flexWrap:'wrap', alignItems:'flex-start', justifyContent:'center' }}>"
c = c.replace(dist_start, dist_end)

# Find the end of gymSorted map
gym_end = """                        <div style={{ fontSize:9, color:'var(--fog)', marginTop:4, textAlign:'right' }}>{mins} min</div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>"""
if gym_end in c:
    c = c.replace(gym_end, gym_end.replace("          </div>", "          </div>\n          </AnimateOnScroll>"))

with open('src/app/coach/CoachClient.tsx', 'w', encoding='utf-8') as f:
    f.write(c)
print("Done")
