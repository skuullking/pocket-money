import { useState, useEffect, useRef } from 'react';

export function useCountUp(target, duration = 750) {
  const prefersReduced =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const [value, setValue] = useState(prefersReduced ? target : 0);
  const rafRef = useRef(null);
  const startRef = useRef(null);

  useEffect(() => {
    if (prefersReduced) { setValue(target); return; }
    setValue(0);
    startRef.current = null;

    const animate = (ts) => {
      if (!startRef.current) startRef.current = ts;
      const progress = Math.min((ts - startRef.current) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // cubic ease-out
      setValue(target * eased);
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate);
      } else {
        setValue(target);
      }
    };

    rafRef.current = requestAnimationFrame(animate);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [target, duration, prefersReduced]);

  return value;
}
