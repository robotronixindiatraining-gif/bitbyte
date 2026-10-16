import { ChevronDown } from 'lucide-react';
import { useId, useState } from 'react';
import { cx } from './cx.js';

/** Button + region disclosure with aria-expanded (§8); used by the FAQ and the mobile menu. */
export function Disclosure({
  summary,
  children,
  defaultOpen = false,
  headingLevel,
  className,
  buttonClassName,
}) {
  const [open, setOpen] = useState(defaultOpen);
  const id = useId();
  const button = (
    <button
      type="button"
      aria-expanded={open}
      aria-controls={`${id}-panel`}
      onClick={() => setOpen((value) => !value)}
      className={cx(
        'flex w-full items-center justify-between gap-4 py-4 text-left font-semibold text-fg',
        buttonClassName,
      )}
    >
      <span>{summary}</span>
      <ChevronDown
        aria-hidden="true"
        className={cx(
          'size-5 shrink-0 text-fg-subtle transition-transform duration-200',
          open && 'rotate-180',
        )}
      />
    </button>
  );
  const Heading = headingLevel ? `h${headingLevel}` : null;
  return (
    <div className={className}>
      {Heading ? <Heading className="text-body font-sans">{button}</Heading> : button}
      <div id={`${id}-panel`} hidden={!open}>
        {children}
      </div>
    </div>
  );
}
