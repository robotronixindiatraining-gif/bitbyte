import { useEffect, useRef } from 'react';
import { observeReveal } from './motion.js';

/** Fades/slides its content in once when scrolled into view; visible by default (§6). */
export function Reveal({ as: Tag = 'div', index = 0, className, children, ...rest }) {
  const ref = useRef(null);
  useEffect(() => observeReveal(ref.current), []);
  return (
    <Tag
      ref={ref}
      data-reveal=""
      className={className}
      style={{ '--reveal-i': Math.min(index, 5) }}
      {...rest}
    >
      {children}
    </Tag>
  );
}
