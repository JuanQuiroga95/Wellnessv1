import React, { useRef, useState, useEffect } from 'react';

export const AnimateOnScroll = ({ children, minHeight = 0, delay = 500 }: { children: React.ReactNode, minHeight?: number, delay?: number }) => {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    
    // Add a delay to allow the layout to stabilize (e.g. initial calendar load shift)
    const timeout = setTimeout(() => {
      const obs = new IntersectionObserver(([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          obs.disconnect();
        }
      }, { threshold: 0.1 });
      obs.observe(el);
      
      // @ts-ignore
      el._obs = obs;
    }, delay);

    return () => {
      clearTimeout(timeout);
      // @ts-ignore
      if (el._obs) el._obs.disconnect();
    };
  }, [delay]);

  return (
    <div 
      ref={ref} 
      className={isVisible ? 'start-animations' : 'pause-animations'}
      style={{ minHeight: minHeight > 0 ? minHeight : 'auto', width: '100%' }}
    >
      {children}
    </div>
  )
}
