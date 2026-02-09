'use client';

import Link from 'next/link';
import { BreadcrumbJsonLd } from './JsonLd';

interface BreadcrumbItem {
  name: string;
  href: string;
}

export default function Breadcrumbs({ items }: { items: BreadcrumbItem[] }) {
  const allItems = [{ name: 'Home', href: '/' }, ...items];
  const jsonLdItems = allItems.map((item) => ({
    name: item.name,
    url: `https://fibalgo.com${item.href}`,
  }));

  return (
    <>
      <BreadcrumbJsonLd items={jsonLdItems} />
      <nav
        aria-label="Breadcrumb"
        style={{
          maxWidth: '1100px',
          margin: '0 auto',
          padding: '6.5rem 1rem 0',
          position: 'relative',
          zIndex: 2,
        }}
      >
        <ol
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '0.25rem',
            listStyle: 'none',
            margin: 0,
            padding: 0,
            fontSize: '0.8rem',
          }}
        >
          {allItems.map((item, index) => {
            const isLast = index === allItems.length - 1;
            return (
              <li
                key={item.href}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.25rem',
                  color: isLast ? 'rgba(0,245,255,0.85)' : 'rgba(255,255,255,0.45)',
                }}
              >
                {index > 0 && (
                  <span aria-hidden="true" style={{ margin: '0 0.15rem', color: 'rgba(255,255,255,0.3)' }}>
                    /
                  </span>
                )}
                {isLast ? (
                  <span aria-current="page">{item.name}</span>
                ) : (
                  <Link
                    href={item.href}
                    style={{
                      color: 'rgba(255,255,255,0.45)',
                      textDecoration: 'none',
                      transition: 'color 0.2s',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = '#00F5FF')}
                    onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(255,255,255,0.45)')}
                  >
                    {item.name}
                  </Link>
                )}
              </li>
            );
          })}
        </ol>
      </nav>
    </>
  );
}
