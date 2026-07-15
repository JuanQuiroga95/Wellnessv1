const fs = require('fs');

// 1. Update CoachClient.tsx
let coachClient = fs.readFileSync('src/app/coach/CoachClient.tsx', 'utf8');
const inlineComponent = `const AnimateOnScroll = ({ children, minHeight = 0 }: { children: React.ReactNode, minHeight?: number }) => {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    
    const timeout = setTimeout(() => {
      const obs = new IntersectionObserver(([entry]) => {
        if (entry.isIntersecting) { setIsVisible(true); obs.disconnect(); }
      }, { threshold: 0.1 });
      obs.observe(el);
      
      // @ts-ignore
      el._obs = obs;
    }, 500);

    return () => {
      clearTimeout(timeout);
      // @ts-ignore
      if (el._obs) el._obs.disconnect();
    };
  }, []);
  return (
    <div ref={ref} className={isVisible ? 'start-animations' : 'pause-animations'} style={{ minHeight: minHeight>0?minHeight:'auto', width:'100%' }}>
      {isVisible ? children : null}
    </div>
  )
}`;
coachClient = coachClient.replace(inlineComponent, '');
if (!coachClient.includes('import { AnimateOnScroll }')) {
  coachClient = coachClient.replace("import { PieChart, Pie, Cell } from 'recharts'", "import { PieChart, Pie, Cell } from 'recharts'\nimport { AnimateOnScroll } from '@/components/AnimateOnScroll'");
}
fs.writeFileSync('src/app/coach/CoachClient.tsx', coachClient, 'utf8');

// Function to add AnimateOnScroll to a file
function addAnimateOnScroll(filePath, wrappers) {
  let content = fs.readFileSync(filePath, 'utf8');
  if (!content.includes('import { AnimateOnScroll }')) {
    content = content.replace("import", "import { AnimateOnScroll } from '@/components/AnimateOnScroll';\nimport");
  }
  wrappers.forEach(w => {
    content = content.replace(w.target, `<AnimateOnScroll>\n${w.target}`);
    content = content.replace(w.endTarget, `${w.endTarget}\n</AnimateOnScroll>`);
  });
  fs.writeFileSync(filePath, content, 'utf8');
}

// 2. Update ControlCargaPanel.tsx
addAnimateOnScroll('src/app/coach/ControlCargaPanel.tsx', [
  {
    target: '<div style={{ flex: 1, minWidth: 300, background: \'var(--ink2)\', borderRadius: 16, border: \'1px solid var(--ink3)\', padding: 20 }}>',
    endTarget: '{/* Top Tareas Individuales */}'
  },
  {
    target: '<div style={{ background: \'var(--ink2)\', borderRadius: 16, border: \'1px solid var(--ink3)\', padding: 20, marginTop: 24 }}>',
    endTarget: '{/* Tooltip & Leyenda para Tareas */}'
  }
]);

console.log('Script done');
