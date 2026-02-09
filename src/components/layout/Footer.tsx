import Link from 'next/link';
import Image from 'next/image';
import { appConfig } from '@/lib/config';
import React from 'react';

export default function Footer() {
  return (
    <footer style={{ 
      background: 'linear-gradient(180deg, rgba(10,10,15,0) 0%, rgba(10,10,15,1) 100%)',
      position: 'relative', 
      zIndex: 10,
      paddingTop: '4rem'
    }}>
      {/* Risk Disclaimer */}
      <div style={{ 
        background: 'rgba(0,0,0,0.3)', 
        backdropFilter: 'blur(10px)',
        borderTop: '1px solid rgba(255,255,255,0.05)',
        borderBottom: '1px solid rgba(255,255,255,0.05)',
        padding: '1.5rem 1rem'
      }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <p style={{ 
            color: 'rgba(255,255,255,0.35)', 
            fontSize: '0.7rem', 
            lineHeight: '1.7',
            textAlign: 'center',
            margin: 0
          }}>
            Trading is risky & most day traders lose money. This site & the products & services FibAlgo offers are for informational & educational purposes only. All content is to be considered hypothetical, selected after the fact, in order to demonstrate our product and should not be construed as financial advice. Decisions to buy, sell, hold or trade in securities, commodities and other investments involve risk and are best made based on the advice of qualified financial professionals. Past performance does not guarantee future results. Hypothetical or Simulated performance results have certain limitations, unlike an actual performance record, simulated results do not represent actual trading.
          </p>
        </div>
      </div>

      {/* Main Footer Content */}
      <div style={{ 
        background: '#050508',
        padding: '3rem 1rem 2rem'
      }}>
        <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
          
          {/* Logo */}
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <Link href="/" style={{ display: 'inline-block' }}>
              <Image src="/logo-white.svg" alt="FibAlgo" width={180} height={50} style={{ height: 'auto' }} />
            </Link>
          </div>

          {/* Social Icons */}
          <div style={{ 
            display: 'flex', 
            justifyContent: 'center', 
            gap: '0.75rem',
            marginBottom: '2.5rem'
          }}>
            {[
              { href: 'https://www.instagram.com/fibalgoai', icon: 'M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z', title: 'Instagram' },
              { href: appConfig.social.twitter, icon: 'M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z', title: 'X' },
              { href: appConfig.social.youtube, icon: 'M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z', title: 'YouTube' },
              { href: 'https://www.tiktok.com/@algofib', icon: 'M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z', title: 'TikTok' },
              { href: appConfig.social.telegram, icon: 'M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.562 8.161c-.18 1.897-.962 6.502-1.359 8.627-.168.9-.5 1.201-.82 1.23-.697.064-1.226-.461-1.901-.903-1.056-.692-1.653-1.123-2.678-1.799-1.185-.781-.417-1.21.258-1.911.177-.184 3.247-2.977 3.307-3.23.007-.032.015-.15-.056-.212s-.174-.041-.248-.024c-.106.024-1.793 1.139-5.062 3.345-.479.329-.913.489-1.302.481-.428-.009-1.252-.242-1.865-.44-.751-.245-1.349-.374-1.297-.789.027-.216.324-.437.893-.663 3.498-1.524 5.831-2.529 6.998-3.015 3.333-1.386 4.025-1.627 4.477-1.635.099-.002.321.023.465.141.121.1.154.234.169.33.015.098.034.32.019.496z', title: 'Telegram' },
            ].map((social, i) => (
              <a
                key={i}
                href={social.href}
                target="_blank"
                rel="noopener noreferrer"
                title={social.title}
                aria-label={`Follow FibAlgo on ${social.title}`}
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  background: 'rgba(255,255,255,0.08)',
                  border: '1px solid rgba(255,255,255,0.12)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'rgba(255,255,255,0.7)',
                  transition: 'all 0.3s ease',
                }}
              >
                <svg style={{ width: '18px', height: '18px' }} fill="currentColor" viewBox="0 0 24 24">
                  <path d={social.icon} />
                </svg>
              </a>
            ))}
          </div>

          {/* Links Grid */}
          <div style={{ 
            display: 'flex',
            justifyContent: 'center',
            gap: '6rem',
            marginBottom: '2.5rem',
            flexWrap: 'wrap'
          }}>
            {/* Product */}
            <div style={{ textAlign: 'center' }}>
              <h4 style={{ 
                color: '#FFFFFF', 
                fontSize: '0.95rem', 
                fontWeight: 600, 
                marginBottom: '1.25rem',
                letterSpacing: '0.02em'
              }}>
                Product
              </h4>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                {[
                  { label: 'AI Trading Indicators', href: '/library' },
                  { label: 'Trading Terminal', href: '/#terminal' },
                  { label: 'Pricing Plans', href: '/#pricing' },
                  { label: 'TradingView Indicators', href: '/library' },
                ].map((link, i) => (
                  <li key={i} style={{ marginBottom: '0.65rem' }}>
                    <Link 
                      href={link.href}
                      style={{ 
                        color: 'rgba(255,255,255,0.55)', 
                        textDecoration: 'none', 
                        fontSize: '0.875rem',
                        transition: 'color 0.2s ease'
                      }}
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Company */}
            <div style={{ textAlign: 'center' }}>
              <h4 style={{ 
                color: '#FFFFFF', 
                fontSize: '0.95rem', 
                fontWeight: 600, 
                marginBottom: '1.25rem',
                letterSpacing: '0.02em'
              }}>
                Company
              </h4>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                {[
                  { label: 'About Us', href: '/about' },
                  { label: 'Community', href: '/community' },
                  { label: 'Blog', href: '/blog' },
                  { label: 'FAQ', href: '/#faq' },
                  { label: 'Contact Support', href: '/dashboard' },
                ].map((link, i) => (
                  <li key={i} style={{ marginBottom: '0.65rem' }}>
                    <Link 
                      href={link.href}
                      style={{ 
                        color: 'rgba(255,255,255,0.55)', 
                        textDecoration: 'none', 
                        fontSize: '0.875rem',
                        transition: 'color 0.2s ease'
                      }}
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Legal */}
            <div style={{ textAlign: 'center' }}>
              <h4 style={{ 
                color: '#FFFFFF', 
                fontSize: '0.95rem', 
                fontWeight: 600, 
                marginBottom: '1.25rem',
                letterSpacing: '0.02em'
              }}>
                Legal
              </h4>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                {[
                  { label: 'Privacy Policy', href: '/privacy-policy' },
                  { label: 'Terms of Service', href: '/terms-of-service' },
                ].map((link, i) => (
                  <li key={i} style={{ marginBottom: '0.65rem' }}>
                    <Link 
                      href={link.href}
                      style={{ 
                        color: 'rgba(255,255,255,0.55)', 
                        textDecoration: 'none', 
                        fontSize: '0.875rem',
                        transition: 'color 0.2s ease'
                      }}
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Divider & Copyright */}
          <div style={{ 
            borderTop: '1px solid rgba(255,255,255,0.08)',
            paddingTop: '1.5rem',
            textAlign: 'center'
          }}>
            <p style={{ 
              color: 'rgba(255,255,255,0.35)', 
              fontSize: '0.8rem', 
              margin: 0 
            }}>
              © {new Date().getFullYear()} FibAlgo. All rights reserved.
            </p>
          </div>

        </div>
      </div>
    </footer>
  );
}
