import { useEffect, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';

export default function GiftReveal({ storageKey, children, color = '#ff9900', skip = false }) {
  const reduced = useReducedMotion();
  const [opened, setOpened] = useState(() => Boolean(localStorage.getItem(storageKey)));
  useEffect(() => {
    if (opened || skip) return;
    const timer = setTimeout(() => {
      localStorage.setItem(storageKey, 'seen'); setOpened(true);
    }, reduced ? 0 : 1700);
    return () => clearTimeout(timer);
  }, [opened, reduced, storageKey, skip]);
  if (opened || skip) return children;
  return <div role="status" aria-label="Opening your gift box" className="flex justify-center py-8">
    <motion.svg width="180" height="200" viewBox="0 0 180 200" animate={reduced ? {} : { rotate: [0,-8,8,-6,6,0], scale:[1,1.05,1.1,1] }} transition={{duration:1.2}}>
      <motion.circle cx="90" cy="110" r="65" fill={color} animate={{opacity:[0.05,0.4,0],scale:[0.6,1.4,1.6]}} transition={{duration:1.6}} />
      <rect x="35" y="90" width="110" height="85" rx="6" fill="#17131b" stroke={color} strokeWidth="3" />
      <rect x="82" y="90" width="16" height="85" fill={color} />
      <motion.g animate={reduced ? {} : {y:[0,0,-60],rotate:[0,0,-18]}} transition={{duration:1.4}}>
        <rect x="30" y="72" width="120" height="25" rx="5" fill="#251b28" stroke={color} strokeWidth="3" />
        <path d="M90 73 C30 15 40 100 90 73 C145 15 148 100 90 73" fill="none" stroke={color} strokeWidth="5" />
      </motion.g>
    </motion.svg>
  </div>;
}
