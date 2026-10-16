import { Mail, Menu, MessageCircle, Phone, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router';
import { LinkButton } from '../components/ui/Button.jsx';
import { cx } from '../components/ui/cx.js';
import { Disclosure } from '../components/ui/Disclosure.jsx';
import { isCurrentPath } from '../components/ui/links.js';
import { SmartLink } from '../components/ui/SmartLink.jsx';
import { Wordmark } from '../components/ui/Wordmark.jsx';
import { telHref, whatsappHref } from './navigation.js';

const ROW =
  'flex min-h-13 w-full items-center border-b border-border text-lg font-semibold text-fg';

/**
 * Mobile navigation (< 1024 px, §9.6): a full-screen modal <dialog>. The browser provides the
 * focus trap, Escape-to-close and an inert background; we add scroll locking and return focus
 * to the menu button when it closes.
 */
export function MobileNav({ nav, contact, general }) {
  const dialogRef = useRef(null);
  const buttonRef = useRef(null);
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();

  const show = () => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (typeof dialog.showModal === 'function') dialog.showModal();
    else dialog.setAttribute('open', '');
    document.documentElement.style.overflow = 'hidden';
    setOpen(true);
  };
  const hide = () => {
    const dialog = dialogRef.current;
    if (!dialog?.hasAttribute('open')) return;
    if (typeof dialog.close === 'function') dialog.close();
    else dialog.removeAttribute('open');
    // Browsers fire "close" asynchronously and some environments never do; the cleanup it
    // triggers is idempotent, so dispatching it here as well is safe.
    dialog.dispatchEvent(new Event('close'));
  };

  // The dialog exists only once navigation is published (often after the first render).
  const hasMenu = nav.header.length > 0 || Boolean(nav.cta);
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return undefined;
    const onClose = () => {
      document.documentElement.style.overflow = '';
      setOpen(false);
      buttonRef.current?.focus();
    };
    // A click on any link inside the menu closes it (also same-page and fragment links).
    const onClick = (event) => {
      if (event.target.closest?.('a')) hide();
    };
    dialog.addEventListener('close', onClose);
    dialog.addEventListener('click', onClick);
    return () => {
      dialog.removeEventListener('close', onClose);
      dialog.removeEventListener('click', onClick);
    };
  }, [hasMenu]);

  // Navigating closes the menu.
  useEffect(() => {
    hide();
  }, [pathname]);

  useEffect(
    () => () => {
      document.documentElement.style.overflow = '';
    },
    [],
  );

  const phone = contact?.phones?.[0];
  const email = contact?.emails?.[0];
  const whatsapp = contact?.phones?.find((p) => p.whatsapp);
  const quick = [
    phone && telHref(phone.number) && { href: telHref(phone.number), label: 'Call', icon: Phone },
    email && { href: `mailto:${email.address}`, label: 'E-mail', icon: Mail },
    whatsapp &&
      whatsappHref(whatsapp.number) && {
        href: whatsappHref(whatsapp.number),
        label: 'WhatsApp',
        icon: MessageCircle,
        newTab: true,
      },
  ].filter(Boolean);

  if (!hasMenu) return null;

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        aria-expanded={open}
        aria-controls="mobile-menu"
        aria-haspopup="dialog"
        onClick={show}
        className="inline-flex size-11 items-center justify-center rounded-md text-fg lg:hidden"
      >
        <Menu aria-hidden="true" className="size-6" />
        <span className="sr-only">Menu</span>
      </button>
      <dialog ref={dialogRef} id="mobile-menu" aria-label="Menu" className="drawer surface-light">
        <div className="flex min-h-full flex-col">
          <div className="container-site flex h-16 shrink-0 items-center justify-between border-b border-border">
            <Wordmark general={general} />
            <button
              type="button"
              onClick={hide}
              className="inline-flex size-11 items-center justify-center rounded-md text-fg"
            >
              <X aria-hidden="true" className="size-6" />
              <span className="sr-only">Close menu</span>
            </button>
          </div>
          <nav aria-label="Main" className="container-site flex-1 py-4">
            <ul role="list">
              {nav.header.map((item, index) => (
                <li key={`${item.href}-${index}`}>
                  {item.children.length > 0 ? (
                    <Disclosure summary={item.label} buttonClassName={cx(ROW, 'py-0')}>
                      <ul role="list" className="border-b border-border py-2">
                        {item.children.map((child, childIndex) => (
                          <li key={`${child.href}-${childIndex}`}>
                            <SmartLink
                              href={child.href}
                              openInNewTab={child.openInNewTab}
                              aria-current={
                                isCurrentPath(child.href, pathname) ? 'page' : undefined
                              }
                              className="flex min-h-12 items-center gap-3 pl-4 text-fg-body aria-[current=page]:font-semibold aria-[current=page]:text-link"
                            >
                              {child.label}
                            </SmartLink>
                          </li>
                        ))}
                        {item.href && (
                          <li>
                            <SmartLink
                              href={item.href}
                              className="flex min-h-12 items-center pl-4 font-semibold text-link"
                            >
                              All {item.label.toLowerCase()}
                            </SmartLink>
                          </li>
                        )}
                      </ul>
                    </Disclosure>
                  ) : (
                    <SmartLink
                      href={item.href}
                      openInNewTab={item.openInNewTab}
                      aria-current={isCurrentPath(item.href, pathname) ? 'page' : undefined}
                      className={cx(
                        ROW,
                        'aria-[current=page]:border-l-4 aria-[current=page]:border-l-primary aria-[current=page]:pl-3',
                      )}
                    >
                      {item.label}
                    </SmartLink>
                  )}
                </li>
              ))}
            </ul>
            {nav.cta && <LinkButton link={nav.cta} size="lg" block arrow className="mt-8" />}
          </nav>
          {quick.length > 0 && (
            <div className="container-site grid shrink-0 grid-cols-3 gap-2 border-t border-border py-4">
              {quick.map(({ href, label, icon: QuickIcon, newTab }) => (
                <SmartLink
                  key={label}
                  href={href}
                  openInNewTab={newTab}
                  className="flex min-h-12 flex-col items-center justify-center gap-1 rounded-md bg-neutral-50 text-small font-medium text-fg"
                >
                  <QuickIcon aria-hidden="true" className="size-5 text-link" />
                  {label}
                </SmartLink>
              ))}
            </div>
          )}
        </div>
      </dialog>
    </>
  );
}
