const fs = require('fs');

let c = fs.readFileSync('src/app/coach/CoachClient.tsx', 'utf8');

// 1. Fix the long numbers
c = c.replace(/>\{mins\} min<\/div>/g, '>{Number(Number(mins).toFixed(2))} min</div>');

// 2. Remove AnimateOnScroll definition
const animateDef = `const AnimateOnScroll = ({ children, minHeight = 0 }: { children: any, minHeight?: number }) => {
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
    <div ref={ref} className={isVisible ? 'start-animations' : 'pause-animations'} style={{ minHeight: minHeight > 0 ? minHeight : 'auto', width: '100%' }}>
      {isVisible ? children : null}
    </div>
  )
}`;
c = c.replace(animateDef, '');
if (!c.includes('import { AnimateOnScroll }')) {
  c = c.replace("import { PieChart, Pie, Cell } from 'recharts'", "import { PieChart, Pie, Cell } from 'recharts'\nimport { AnimateOnScroll } from '@/components/AnimateOnScroll'");
}
fs.writeFileSync('src/app/coach/CoachClient.tsx', c, 'utf8');

console.log('Fixed CoachClient');
