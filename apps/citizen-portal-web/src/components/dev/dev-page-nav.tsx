import { useEffect, useRef, useState, type RefObject } from 'react';
import { mdiMenuClose, mdiMenuOpen } from '@mdi/js';
import { Icon } from '@mdi/react';
import { buttonVariants } from '@repo/ui/button';

export type DevNavItem = {
  id: string;
  text: string;
  level: 2 | 3;
  /** @mdi/js path constant, shown next to level-2 items only. */
  icon?: string | undefined;
};

type DevPageNavProps = {
  items: DevNavItem[];
  label?: string | undefined;
  className?: string | undefined;
};

function useActiveSection(items: DevNavItem[]) {
  const [activeId, setActiveId] = useState('');

  useEffect(() => {
    if (items.length === 0) return;

    const els = items
      .filter((item) => item.level === 2)
      .map((item) => document.getElementById(item.id))
      .filter((el): el is HTMLElement => el !== null);

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id);
          }
        }
      },
      { rootMargin: '-20px 0px -85% 0px' },
    );

    els.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [items]);

  return activeId;
}

const FADE_MS = 80;
const WIDTH_MS = 200;

/**
 * On-page table-of-contents sidebar for the /dev reference pages. Collapsible to an
 * icon-only rail; highlights the currently visible level-2 section via IntersectionObserver.
 * Ported from the old app's AppSidebar (which doesn't exist in this codebase).
 */
export function DevPageNav({ items, label = 'On this page', className }: DevPageNavProps) {
  const [widthCollapsed, setWidthCollapsed] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [contentMounted, setContentMounted] = useState(true);
  const [contentOpaque, setContentOpaque] = useState(true);
  const [iconsMounted, setIconsMounted] = useState(false);
  const [iconsOpaque, setIconsOpaque] = useState(false);

  const busy = useRef(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    const ids = timers.current;
    return () => ids.forEach(clearTimeout);
  }, []);

  function after(ms: number, fn: () => void) {
    const id = setTimeout(fn, ms);
    timers.current.push(id);
  }

  function handleToggle() {
    if (busy.current) return;
    busy.current = true;

    if (!isCollapsed) {
      setContentOpaque(false);
      after(FADE_MS, () => {
        setContentMounted(false);
        setWidthCollapsed(true);
        setIconsMounted(true);
        requestAnimationFrame(() =>
          requestAnimationFrame(() => {
            setIconsOpaque(true);
            setIsCollapsed(true);
            busy.current = false;
          }),
        );
      });
    } else {
      setIconsOpaque(false);
      after(FADE_MS, () => {
        setIconsMounted(false);
        setWidthCollapsed(false);
        after(WIDTH_MS, () => {
          setContentMounted(true);
          requestAnimationFrame(() =>
            requestAnimationFrame(() => {
              setContentOpaque(true);
              setIsCollapsed(false);
              busy.current = false;
            }),
          );
        });
      });
    }
  }

  const activeId = useActiveSection(items);

  if (items.length === 0) return null;

  return (
    <div
      className={`shrink-0 border-r overflow-x-hidden transition-[width] duration-200 ${widthCollapsed ? 'w-21' : 'w-89'}${className ? ` ${className}` : ''}`}
    >
      <nav aria-label={label} className="pt-6 ml-4">
        <div
          className={`mb-6 flex items-center ${widthCollapsed ? 'justify-center' : 'justify-between'}`}
        >
          {contentMounted && (
            <p
              className={`font-bold uppercase text-secondary-foreground transition-opacity duration-80 ${contentOpaque ? 'opacity-100' : 'opacity-0'}`}
            >
              {label}
            </p>
          )}
          <button
            type="button"
            onClick={handleToggle}
            aria-label={isCollapsed ? 'Expand navigation' : 'Collapse navigation'}
            aria-expanded={!isCollapsed}
            className={buttonVariants({ variant: 'ghost', size: 'icon' }) + ' mx-1'}
          >
            <Icon path={isCollapsed ? mdiMenuClose : mdiMenuOpen} size="20px" aria-hidden="true" />
          </button>
        </div>

        {contentMounted && (
          <ul
            className={`transition-opacity duration-80 ${contentOpaque ? 'opacity-100' : 'opacity-0'}`}
          >
            {items.map((item) => {
              const isActive = item.id === activeId;
              return (
                <li key={item.id}>
                  <a
                    href={`#${item.id}`}
                    aria-current={isActive ? 'location' : undefined}
                    className={`flex items-center gap-2 py-3 min-h-12 leading-tight no-underline transition-colors ${
                      isActive
                        ? 'text-link bg-blue-10 font-semibold border-link'
                        : 'text-secondary-foreground hover:bg-gray-30 hover:text-link hover:underline'
                    } ${item.level === 3 ? 'ml-7 pl-4 border-l border-border' : `pl-3 border-l-4 ${!isActive ? 'border-transparent' : ''}`}`}
                  >
                    {item.level === 2 && item.icon && (
                      <Icon path={item.icon} size="20px" className="shrink-0" aria-hidden="true" />
                    )}
                    {item.text}
                  </a>
                </li>
              );
            })}
          </ul>
        )}

        {iconsMounted && (
          <ul
            className={`w-13 transition-opacity duration-80 ${iconsOpaque ? 'opacity-100' : 'opacity-0'}`}
          >
            {items.map((item) => {
              const isActive = item.id === activeId;
              if (item.level !== 2 || !item.icon) return null;
              return (
                <li key={item.id}>
                  <a
                    href={`#${item.id}`}
                    aria-label={item.text}
                    aria-current={isActive ? 'location' : undefined}
                    className={`flex justify-center p-3 min-h-12 border-l-4 transition-colors ${
                      isActive
                        ? 'text-link bg-blue-10 font-semibold border-link'
                        : 'text-secondary-foreground border-transparent hover:bg-blue-10 hover:text-link hover:border-link'
                    }`}
                  >
                    <Icon path={item.icon} size="20px" aria-hidden="true" />
                  </a>
                </li>
              );
            })}
          </ul>
        )}
      </nav>
    </div>
  );
}

const HEADING_SELECTOR = 'h2[id], h3[id]';

/** Derives nav items from h2/h3[id] headings rendered inside `containerRef`. */
export function useDevPageNav(
  containerRef: RefObject<HTMLDivElement | null>,
  sectionIcons: Record<string, string> = {},
) {
  const [items, setItems] = useState<DevNavItem[]>([]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const headings = el.querySelectorAll<HTMLHeadingElement>(HEADING_SELECTOR);
    setItems(
      Array.from(headings).map((h) => ({
        id: h.id,
        text: h.textContent ?? '',
        level: Number(h.tagName[1]) as 2 | 3,
        icon: sectionIcons[h.id],
      })),
    );
  }, [containerRef, sectionIcons]);

  return items;
}
