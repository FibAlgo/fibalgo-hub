'use client';

import { useState, useEffect, useRef } from 'react';
import { Link } from '@/i18n/navigation';
import Image from 'next/image';
import Breadcrumbs from '@/components/seo/Breadcrumbs';
import { useTranslations } from 'next-intl';
import LibraryChartWindow from '@/components/library/LibraryChartWindow';
import {
  BookOpen,
  Compass,
  Monitor,
  Smartphone,
  Bell,
  Layers,
  LineChart,
  Gauge,
  Radar,
  Sparkles,
  ArrowUpRight,
  CheckCircle,
  ChevronRight,
  ChevronDown,
  Search,
  Zap,
  Target,
  TrendingUp,
  BarChart3,
  Activity,
  Brain,
  Settings,
  Clock,
  Grid3X3,
  Cpu,
  Eye,
  AlertCircle,
  Play,
  ArrowRight,
  Menu,
  X,
  Home,
  Crown,
} from 'lucide-react';

// Navigation structure - moved inside component to access t()

// Quick Start Steps - moved inside component to access t()

export default function LibraryPage() {
  const t = useTranslations('library');

  // Navigation structure (inside component for i18n)
  const navigation = [
    {
      title: t('gettingStarted'),
      icon: Compass,
      items: [
        { id: 'getting-access', label: t('nav.gettingAccess') },
        { id: 'setup-website', label: t('nav.setupWebsite') },
        { id: 'setup-mobile', label: t('nav.setupMobile') },
        { id: 'desktop-notifications', label: t('nav.desktopNotifications') },
        { id: 'mobile-notifications', label: t('nav.mobileNotifications') },
      ],
    },
    {
      title: t('indicatorsNavTitle'),
      icon: Layers,
      items: [
        { id: 'perfect-entry-zone', label: 'Perfect Entry Zone™' },
        { id: 'perfect-retracement-zone', label: 'Perfect Retracement Zone™' },
        { id: 'screener-pez', label: 'Screener (PEZ)' },
        { id: 'smart-trading', label: 'Smart Trading™' },
        { id: 'oscillator-matrix', label: 'Oscillator Matrix™' },
        { id: 'technical-analysis', label: 'Technical Analysis™' },
      ],
    },
  ];

  // Quick Start Steps (inside component for i18n)
  const quickStartSteps = [
    {
      step: 1,
      title: t('step1Title'),
      description: t('step1Desc'),
      icon: CheckCircle,
    },
    {
      step: 2,
      title: t('step2Title'),
      description: t('step2Desc'),
      icon: ArrowRight,
    },
    {
      step: 3,
      title: t('step3Title'),
      description: t('step3Desc'),
      icon: Play,
    },
  ];

  const [activeSection, setActiveSection] = useState('getting-access');
  const [expandedNav, setExpandedNav] = useState<string[]>([t('gettingStarted'), t('indicatorsNavTitle')]);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedSettings, setExpandedSettings] = useState<string[]>([]);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [isMobileLayout, setIsMobileLayout] = useState(false);
  const [mobileNavHeight, setMobileNavHeight] = useState(0);
  const isScrollingRef = useRef(false);

  // Hydration fix - wait for client mount
  useEffect(() => {
    setMounted(true);
  }, []);

  // Measure mobile navbar height (fixed header offset)
  useEffect(() => {
    if (!mounted) return;

    const measure = () => {
      const mobile = window.innerWidth <= 1024;
      setIsMobileLayout(mobile);
      if (!mobile) {
        setMobileNavHeight(0);
        return;
      }
      const nav = document.querySelector<HTMLElement>('.mobile-navbar');
      if (!nav) {
        setMobileNavHeight(0);
        return;
      }
      const h = Math.ceil(nav.getBoundingClientRect().height || nav.offsetHeight || 0);
      setMobileNavHeight(h);
    };

    measure();
    // Re-measure after first paint (fonts/layout)
    requestAnimationFrame(measure);
    const t = window.setTimeout(measure, 150);

    window.addEventListener('resize', measure);
    return () => {
      window.clearTimeout(t);
      window.removeEventListener('resize', measure);
    };
  }, [mounted]);

  // Toggle settings accordion
  const toggleSettings = (id: string) => {
    setExpandedSettings((prev) =>
      prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]
    );
  };

  // Scroll Spy - Track active section on scroll
  useEffect(() => {
    const sectionIds = navigation.flatMap(nav => nav.items.map(item => item.id));
    
    const handleScroll = () => {
      if (isScrollingRef.current) return;
      
      let currentSection = sectionIds[0];
      let minDistance = Infinity;
      
      for (const id of sectionIds) {
        const element = document.getElementById(id);
        if (element) {
          const rect = element.getBoundingClientRect();
          const distance = Math.abs(rect.top - 100); // 100px offset from top
          
          // Section is visible and closest to top
          if (rect.top <= 150 && distance < minDistance) {
            minDistance = distance;
            currentSection = id;
          }
        }
      }
      
      // Fallback: find the section that's most visible
      if (minDistance === Infinity) {
        for (const id of sectionIds) {
          const element = document.getElementById(id);
          if (element) {
            const rect = element.getBoundingClientRect();
            if (rect.top >= 0 && rect.top < window.innerHeight / 2) {
              currentSection = id;
              break;
            }
          }
        }
      }
      
      setActiveSection(currentSection);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll(); // Initial call
    
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const toggleNav = (title: string) => {
    setExpandedNav((prev) =>
      prev.includes(title) ? prev.filter((t) => t !== title) : [...prev, title]
    );
  };

  const scrollToSection = (id: string) => {
    isScrollingRef.current = true;
    setActiveSection(id);
    setMobileMenuOpen(false); // Close mobile menu
    const element = document.getElementById(id);
    if (element) {
      const offset = isMobileLayout ? Math.max(0, mobileNavHeight) + 12 : 100;
      const top = element.getBoundingClientRect().top + window.scrollY - offset;
      window.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
      // Reset scrolling flag after animation
      setTimeout(() => {
        isScrollingRef.current = false;
      }, 1000);
    }
  };

  // Get current section info for breadcrumb
  const getCurrentSectionInfo = () => {
    for (const nav of navigation) {
      const item = nav.items.find(i => i.id === activeSection);
      if (item) {
        return { category: nav.title, label: item.label };
      }
    }
    return { category: 'Getting Started', label: 'Getting Access' };
  };

  const currentSection = getCurrentSectionInfo();

  // Show SEO-rich fallback content until client hydration is complete
  // This content is what Google's crawler will index
  if (!mounted) {
    return (
      <div className="docs-container" style={{ 
        minHeight: '100vh', 
        background: '#0a0a0f',
        color: '#ffffff',
        padding: '2rem',
      }}>
        <nav aria-label="Breadcrumb" style={{ marginBottom: '2rem', fontSize: '0.875rem', color: 'rgba(255,255,255,0.6)' }}>
          <a href="/" style={{ color: 'rgba(255,255,255,0.6)', textDecoration: 'none' }}>{t('home')}</a>
          {' › '}
          <span style={{ color: '#00F5FF' }}>{t('breadcrumb')}</span>
        </nav>

        <header style={{ textAlign: 'center', marginBottom: '3rem' }}>
          <Image 
            src="/logo-white.svg" 
            alt="FibAlgo - AI Trading Indicators" 
            width={200} 
            height={56}
            priority
          />
          <h1 style={{ fontSize: '2.5rem', fontWeight: 700, margin: '1.5rem 0 1rem', background: 'linear-gradient(135deg, #00F5FF, #8B5CF6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            {t('title')}
          </h1>
          <p style={{ fontSize: '1.125rem', color: 'rgba(255,255,255,0.7)', maxWidth: '600px', margin: '0 auto', lineHeight: 1.7 }}>
            {t('subtitle')}
          </p>
        </header>

        <section style={{ maxWidth: '800px', margin: '0 auto' }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '1.5rem', color: '#00F5FF' }}>{t('gettingStarted')}</h2>
          <ul style={{ listStyle: 'none', padding: 0, display: 'grid', gap: '1rem' }}>
            <li style={{ padding: '1rem', background: 'rgba(255,255,255,0.03)', borderRadius: '0.75rem', border: '1px solid rgba(255,255,255,0.06)' }}>
              <strong>{t('nav.gettingAccess')}</strong> — {t('ssrGettingAccessDesc')}
            </li>
            <li style={{ padding: '1rem', background: 'rgba(255,255,255,0.03)', borderRadius: '0.75rem', border: '1px solid rgba(255,255,255,0.06)' }}>
              <strong>{t('nav.setupWebsite')}</strong> — {t('ssrSetupWebsiteDesc')}
            </li>
            <li style={{ padding: '1rem', background: 'rgba(255,255,255,0.03)', borderRadius: '0.75rem', border: '1px solid rgba(255,255,255,0.06)' }}>
              <strong>{t('nav.setupMobile')}</strong> — {t('ssrSetupMobileDesc')}
            </li>
            <li style={{ padding: '1rem', background: 'rgba(255,255,255,0.03)', borderRadius: '0.75rem', border: '1px solid rgba(255,255,255,0.06)' }}>
              <strong>{t('nav.desktopNotifications')}</strong> — {t('ssrDesktopNotificationsDesc')}
            </li>
            <li style={{ padding: '1rem', background: 'rgba(255,255,255,0.03)', borderRadius: '0.75rem', border: '1px solid rgba(255,255,255,0.06)' }}>
              <strong>{t('nav.mobileNotifications')}</strong> — {t('ssrMobileNotificationsDesc')}
            </li>
          </ul>

          <h2 style={{ fontSize: '1.5rem', fontWeight: 600, margin: '2.5rem 0 1.5rem', color: '#8B5CF6' }}>{t('indicatorsHeading')}</h2>
          <ul style={{ listStyle: 'none', padding: 0, display: 'grid', gap: '1rem' }}>
            <li style={{ padding: '1rem', background: 'rgba(255,255,255,0.03)', borderRadius: '0.75rem', border: '1px solid rgba(255,255,255,0.06)' }}>
              <strong>Perfect Entry Zone™</strong> — {t('ssrPezDesc')}
            </li>
            <li style={{ padding: '1rem', background: 'rgba(255,255,255,0.03)', borderRadius: '0.75rem', border: '1px solid rgba(255,255,255,0.06)' }}>
              <strong>Perfect Retracement Zone™</strong> — {t('ssrPrzDesc')}
            </li>
            <li style={{ padding: '1rem', background: 'rgba(255,255,255,0.03)', borderRadius: '0.75rem', border: '1px solid rgba(255,255,255,0.06)' }}>
              <strong>Screener (PEZ)</strong> — {t('ssrScreenerDesc')}
            </li>
            <li style={{ padding: '1rem', background: 'rgba(255,255,255,0.03)', borderRadius: '0.75rem', border: '1px solid rgba(255,255,255,0.06)' }}>
              <strong>Smart Trading™</strong> — {t('ssrSmartTradingDesc')}
            </li>
            <li style={{ padding: '1rem', background: 'rgba(255,255,255,0.03)', borderRadius: '0.75rem', border: '1px solid rgba(255,255,255,0.06)' }}>
              <strong>Oscillator Matrix™</strong> — {t('ssrOscillatorDesc')}
            </li>
            <li style={{ padding: '1rem', background: 'rgba(255,255,255,0.03)', borderRadius: '0.75rem', border: '1px solid rgba(255,255,255,0.06)' }}>
              <strong>Technical Analysis™</strong> — {t('ssrTaDesc')}
            </li>
          </ul>

          <div style={{ textAlign: 'center', marginTop: '3rem', padding: '2rem', background: 'rgba(0,245,255,0.05)', borderRadius: '1rem', border: '1px solid rgba(0,245,255,0.1)' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.75rem' }}>{t('ctaTitle')}</h3>
            <p style={{ color: 'rgba(255,255,255,0.7)', marginBottom: '1.5rem' }}>{t('ctaSubtitle')}</p>
            <a href="/#pricing" style={{ display: 'inline-block', padding: '0.75rem 2rem', background: 'linear-gradient(135deg, #00F5FF, #8B5CF6)', color: '#000', fontWeight: 700, borderRadius: '0.5rem', textDecoration: 'none' }}>
              {t('ctaButton')}
            </a>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="docs-container">
      <Breadcrumbs items={[{ name: t('breadcrumb'), href: '/library' }]} />
      {/* Mobile Sticky Navbar */}
      <nav className="mobile-navbar">
        <div className="mobile-navbar-row1">
          <Link href="/" className="mobile-logo">
            <Image 
              src="/logo-white.svg" 
              alt="FibAlgo" 
              width={120} 
              height={34}
              priority
            />
          </Link>
        </div>
        <div className="mobile-navbar-row2">
          <button 
            className="mobile-hamburger"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle navigation menu"
          >
            <Menu size={18} />
          </button>
          <div className="mobile-breadcrumb">
            <span className="breadcrumb-category">{currentSection.category}</span>
            <ChevronRight size={14} />
            <span className="breadcrumb-page">{currentSection.label}</span>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <header className="docs-hero">
        <div className="hero-content">
          <Link href="/" className="hero-logo">
            <Image src="/logo-white.svg" alt="FibAlgo" width={320} height={90} priority />
          </Link>
          <div className="hero-badge">
            <BookOpen size={14} />
            {t('badge')}
          </div>
          <p>
            {t('heroDesc')}
          </p>
        </div>

        {/* Quick Start Card */}
        <div className="quick-start-card">
          <div className="card-header">
            <Zap size={20} />
            <h3>{t('quickStartTitle')}</h3>
          </div>
          <div className="quick-steps">
            {quickStartSteps.map((step) => (
              <div key={step.step} className="quick-step">
                <div className="step-number">{step.step}</div>
                <div className="step-content">
                  <h4>{t(`step${step.step}Title` as 'step1Title' | 'step2Title' | 'step3Title')}</h4>
                  <p>{t(`step${step.step}Desc` as 'step1Desc' | 'step2Desc' | 'step3Desc')}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </header>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div 
          className="mobile-overlay"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Main Layout */}
      <div
        className="docs-layout"
        style={
          isMobileLayout && mobileNavHeight
            ? { paddingTop: mobileNavHeight + 12 }
            : undefined
        }
      >
        {/* Sidebar */}
        <aside className={`docs-sidebar ${mobileMenuOpen ? 'mobile-open' : ''}`}>
          <div className="sidebar-header-mobile">
            <Link href="/" className="sidebar-logo-mobile">
              <Image src="/logo-white.svg" alt="FibAlgo" width={120} height={34} />
            </Link>
            <button onClick={() => setMobileMenuOpen(false)}>
              <X size={24} />
            </button>
          </div>
          <div className="sidebar-search">
            <Search size={16} />
            <input
              type="text"
              placeholder={t('searchPlaceholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <Link href="/" className="sidebar-home-link" style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '0.5rem', marginLeft: '1rem', paddingLeft: '0.75rem', marginBottom: '0.5rem' }}>
            <Home size={16} style={{ flexShrink: 0 }} />
            <span style={{ display: 'inline' }}>{t('home')}</span>
          </Link>

          <Link href="/#pricing" className="sidebar-home-link" style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '0.5rem', marginLeft: '1rem', paddingLeft: '0.75rem', marginBottom: '1rem' }}>
            <Crown size={16} style={{ flexShrink: 0 }} />
            <span style={{ display: 'inline' }}>{t('plans')}</span>
          </Link>

          <nav className="sidebar-nav">
            {navigation.map((section) => (
              <div key={section.title} className="nav-section">
                <button
                  className="nav-section-header"
                  onClick={() => toggleNav(section.title)}
                >
                  <section.icon size={16} />
                  <span>{section.title}</span>
                  {expandedNav.includes(section.title) ? (
                    <ChevronDown size={14} />
                  ) : (
                    <ChevronRight size={14} />
                  )}
                </button>
                {expandedNav.includes(section.title) && (
                  <div className="nav-items">
                    {section.items
                      .filter((item) =>
                        item.label.toLowerCase().includes(searchQuery.toLowerCase())
                      )
                      .map((item) => (
                        <button
                          key={item.id}
                          className={`nav-item ${activeSection === item.id ? 'active' : ''}`}
                          onClick={() => scrollToSection(item.id)}
                        >
                          {item.label}
                        </button>
                      ))}
                  </div>
                )}
              </div>
            ))}
          </nav>
        </aside>

        {/* Main Content */}
        <main className="docs-content">
          {/* Getting Access */}
          <section id="getting-access" className="doc-section">
            <div className="section-header">
              <div className="section-icon">
                <Compass size={24} />
              </div>
              <div>
                <h2>{t('gettingAccess.title')}</h2>
                <p>{t('gettingAccess.subtitle')}</p>
              </div>
            </div>

            <div className="steps-grid">
              <div className="step-card featured">
                <div className="step-badge">{t('stepBadge', { number: 1 })}</div>
                <h3>{t('step1Title')}</h3>
                <p>
                  {t('gettingAccess.step1Desc')}
                </p>
                <Link href="/#pricing" className="step-link">
                  {t('viewPricingPlans')}
                </Link>
              </div>

              <div className="step-card">
                <div className="step-badge">{t('stepBadge', { number: 2 })}</div>
                <h3>{t('step2Title')}</h3>
                <p>
                  {t('gettingAccess.step2Desc')}
                </p>
              </div>

              <div className="step-card">
                <div className="step-badge">{t('stepBadge', { number: 3 })}</div>
                <h3>{t('step3Title')}</h3>
                <p>
                  {t('gettingAccess.step3Desc')}
                </p>
              </div>
            </div>
          </section>

          {/* Setup Indicators Website */}
          <section id="setup-website" className="doc-section">
            <div className="section-header">
              <div className="section-icon">
                <Monitor size={24} />
              </div>
              <div>
                <h2>{t('setupWebsite.title')}</h2>
                <p>{t('setupWebsite.subtitle')}</p>
              </div>
            </div>

            <div className="instruction-steps">
              <div className="instruction-step">
                <div className="instruction-number">1</div>
                <div className="instruction-content">
                  <h4>{t('setupWebsite.step1Title')}</h4>
                  <p>{t('setupWebsite.step1Desc')}</p>
                </div>
              </div>

              <div className="instruction-step">
                <div className="instruction-number">2</div>
                <div className="instruction-content">
                  <h4>{t('setupWebsite.step2Title')}</h4>
                  <p>{t('setupWebsite.step2Desc')}</p>
                </div>
              </div>

              <div className="instruction-step">
                <div className="instruction-number">3</div>
                <div className="instruction-content">
                  <h4>{t('setupWebsite.step3Title')}</h4>
                  <p>{t('setupWebsite.step3Desc')}</p>
                </div>
              </div>

              <div className="instruction-step">
                <div className="instruction-number">4</div>
                <div className="instruction-content">
                  <h4>{t('setupWebsite.step4Title')}</h4>
                  <p>
                    {t('setupWebsite.step4Desc')}
                  </p>
                  <div className="note-box warning">
                    <AlertCircle size={14} />
                    <span>{t('setupWebsite.step4Warning')}</span>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Mobile Setup */}
          <section id="setup-mobile" className="doc-section">
            <div className="section-header">
              <div className="section-icon">
                <Smartphone size={24} />
              </div>
              <div>
                <h2>{t('setupMobile.title')}</h2>
                <p>{t('setupMobile.subtitle')}</p>
              </div>
            </div>

            <div className="instruction-steps">
              <div className="instruction-step">
                <div className="instruction-number">1</div>
                <div className="instruction-content">
                  <h4>{t('setupMobile.step1Title')}</h4>
                  <p>{t('setupMobile.step1Desc')}</p>
                </div>
              </div>

              <div className="instruction-step">
                <div className="instruction-number">2</div>
                <div className="instruction-content">
                  <h4>{t('setupMobile.step2Title')}</h4>
                  <p>{t('setupMobile.step2Desc')}</p>
                </div>
              </div>

              <div className="instruction-step">
                <div className="instruction-number">3</div>
                <div className="instruction-content">
                  <h4>{t('setupMobile.step3Title')}</h4>
                  <p>{t('setupMobile.step3Desc')}</p>
                </div>
              </div>

              <div className="instruction-step">
                <div className="instruction-number">4</div>
                <div className="instruction-content">
                  <h4>{t('setupMobile.step4Title')}</h4>
                  <p>{t('setupMobile.step4Desc')}</p>
                </div>
              </div>

              <div className="instruction-step">
                <div className="instruction-number">5</div>
                <div className="instruction-content">
                  <h4>{t('setupMobile.step5Title')}</h4>
                  <p>
                    {t('setupMobile.step5Desc')}
                  </p>
                  <div className="note-box warning">
                    <AlertCircle size={14} />
                    <span>{t('setupMobile.step5Warning')}</span>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Desktop Notifications */}
          <section id="desktop-notifications" className="doc-section">
            <div className="section-header">
              <div className="section-icon">
                <Bell size={24} />
              </div>
              <div>
                <h2>{t('desktopNotifications.title')}</h2>
                <p>{t('desktopNotifications.subtitle')}</p>
              </div>
            </div>

            <div className="instruction-steps">
              <div className="instruction-step">
                <div className="instruction-number">1</div>
                <div className="instruction-content">
                  <h4>{t('desktopNotifications.step1Title')}</h4>
                  <p>{t('desktopNotifications.step1Desc')}</p>
                </div>
              </div>

              <div className="instruction-step">
                <div className="instruction-number">2</div>
                <div className="instruction-content">
                  <h4>{t('desktopNotifications.step2Title')}</h4>
                  <p>{t('desktopNotifications.step2Desc')}</p>
                </div>
              </div>

              <div className="instruction-step">
                <div className="instruction-number">3</div>
                <div className="instruction-content">
                  <h4>{t('desktopNotifications.step3Title')}</h4>
                  <p>
                    {t('desktopNotifications.step3Desc')}
                  </p>
                </div>
              </div>

              <div className="instruction-step">
                <div className="instruction-number">4</div>
                <div className="instruction-content">
                  <h4>{t('desktopNotifications.step4Title')}</h4>
                  <p>{t('desktopNotifications.step4Desc')}</p>
                </div>
              </div>

              <div className="instruction-step">
                <div className="instruction-number">5</div>
                <div className="instruction-content">
                  <h4>{t('desktopNotifications.step5Title')}</h4>
                  <p>{t('desktopNotifications.step5Desc')}</p>
                </div>
              </div>

              <div className="instruction-step">
                <div className="instruction-number">6</div>
                <div className="instruction-content">
                  <h4>{t('desktopNotifications.step6Title')}</h4>
                  <p>{t('desktopNotifications.step6Desc')}</p>
                </div>
              </div>

              <div className="instruction-step">
                <div className="instruction-number">7</div>
                <div className="instruction-content">
                  <h4>{t('desktopNotifications.step7Title')}</h4>
                  <p>{t('desktopNotifications.step7Desc')}</p>
                </div>
              </div>

              <div className="instruction-step">
                <div className="instruction-number">8</div>
                <div className="instruction-content">
                  <h4>{t('desktopNotifications.step8Title')}</h4>
                  <p>{t('desktopNotifications.step8Desc')}</p>
                </div>
              </div>
            </div>
          </section>

          {/* Mobile Notifications */}
          <section id="mobile-notifications" className="doc-section">
            <div className="section-header">
              <div className="section-icon">
                <Smartphone size={24} />
              </div>
              <div>
                <h2>{t('mobileNotifications.title')}</h2>
                <p>{t('mobileNotifications.subtitle')}</p>
              </div>
            </div>

            <div className="instruction-steps">
              <div className="instruction-step">
                <div className="instruction-number">1</div>
                <div className="instruction-content">
                  <h4>{t('mobileNotifications.step1Title')}</h4>
                  <p>{t('mobileNotifications.step1Desc')}</p>
                </div>
              </div>

              <div className="instruction-step">
                <div className="instruction-number">2</div>
                <div className="instruction-content">
                  <h4>{t('mobileNotifications.step2Title')}</h4>
                  <p>{t('mobileNotifications.step2Desc')}</p>
                </div>
              </div>

              <div className="instruction-step">
                <div className="instruction-number">3</div>
                <div className="instruction-content">
                  <h4>{t('mobileNotifications.step3Title')}</h4>
                  <p>
                    {t('mobileNotifications.step3Desc')}
                  </p>
                </div>
              </div>

              <div className="instruction-step">
                <div className="instruction-number">4</div>
                <div className="instruction-content">
                  <h4>{t('mobileNotifications.step4Title')}</h4>
                  <p>{t('mobileNotifications.step4Desc')}</p>
                </div>
              </div>

              <div className="instruction-step">
                <div className="instruction-number">5</div>
                <div className="instruction-content">
                  <h4>{t('mobileNotifications.step5Title')}</h4>
                  <p>{t('mobileNotifications.step5Desc')}</p>
                </div>
              </div>

              <div className="instruction-step">
                <div className="instruction-number">6</div>
                <div className="instruction-content">
                  <h4>{t('mobileNotifications.step6Title')}</h4>
                  <p>{t('mobileNotifications.step6Desc')}</p>
                </div>
              </div>

              <div className="instruction-step">
                <div className="instruction-number">7</div>
                <div className="instruction-content">
                  <h4>{t('mobileNotifications.step7Title')}</h4>
                  <p>{t('mobileNotifications.step7Desc')}</p>
                </div>
              </div>

              <div className="instruction-step">
                <div className="instruction-number">8</div>
                <div className="instruction-content">
                  <h4>{t('mobileNotifications.step8Title')}</h4>
                  <p>{t('mobileNotifications.step8Desc')}</p>
                </div>
              </div>
            </div>
          </section>

          {/* Indicators Section Divider */}
          <div className="section-divider">
            <Layers size={20} />
            <span>{t('sectionDividerIndicators')}</span>
          </div>

          {/* Perfect Entry Zone */}
          <section id="perfect-entry-zone" className="doc-section indicator-section">
            <div className="section-header">
              <div className="section-icon gradient-cyan">
                <Radar size={24} />
              </div>
              <div>
                <h2>FibAlgo® - Perfect Entry Zone™</h2>
                <p>{t('pez.subtitle')}</p>
              </div>
            </div>

            <div className="indicator-overview">
              <p>
                {t('pez.overview')}
              </p>
            </div>

            <LibraryChartWindow indicatorKey="pez" indicatorLabel="Perfect Entry Zone™" />

            <div className="feature-grid">
              <div className="feature-card">
                <div className="feature-icon">
                  <Brain size={20} />
                </div>
                <h4>{t('pez.featureAdaptiveTitle')}</h4>
                <p>
                  {t('pez.featureAdaptiveDesc')}
                </p>
              </div>

              <div className="feature-card">
                <div className="feature-icon">
                  <TrendingUp size={20} />
                </div>
                <h4>{t('pez.featureDynamicSRTitle')}</h4>
                <p>
                  {t('pez.featureDynamicSRDesc')}
                </p>
              </div>

              <div className="feature-card">
                <div className="feature-icon">
                  <Clock size={20} />
                </div>
                <h4>{t('pez.featureTimeZonesTitle')}</h4>
                <p>
                  {t('pez.featureTimeZonesDesc')}
                </p>
              </div>

              <div className="feature-card">
                <div className="feature-icon">
                  <Gauge size={20} />
                </div>
                <h4>{t('pez.featurePressureTitle')}</h4>
                <p>
                  {t('pez.featurePressureDesc')}
                </p>
              </div>
            </div>

            <div className="concept-section">
              <h3>{t('pez.coreConcepts')}</h3>

              <div className="concept-card">
                <h4>{t('pez.conceptAdaptiveTitle')}</h4>
                <p>
                  {t('pez.conceptAdaptiveDesc')}
                </p>
              </div>

              <div className="concept-card">
                <h4>{t('pez.conceptFlipTitle')}</h4>
                <div className="concept-details">
                  <div className="detail-item">
                    <span className="badge green">Uptrend</span>
                    <p>
                      {t('pez.conceptFlipUptrend')}
                    </p>
                  </div>
                  <div className="detail-item">
                    <span className="badge red">Downtrend</span>
                    <p>
                      {t('pez.conceptFlipDowntrend')}
                    </p>
                  </div>
                </div>
              </div>

              <div className="concept-card">
                <h4>{t('pez.conceptConfidenceTitle')}</h4>
                <p>
                  {t('pez.conceptConfidenceDesc')}
                </p>
              </div>
            </div>

            <div className="trading-strategy">
              <h3>{t('pez.howToUse')}</h3>
              <div className="strategy-grid">
                <div className="strategy-card buy">
                  <h4>
                    <TrendingUp size={18} />
                    {t('pez.buySignalsTitle')}
                  </h4>
                  <p>
                    {t('pez.buySignalsDesc')}
                  </p>
                </div>
                <div className="strategy-card sell">
                  <h4>
                    <TrendingUp size={18} className="rotate-180" />
                    {t('pez.sellSignalsTitle')}
                  </h4>
                  <p>
                    {t('pez.sellSignalsDesc')}
                  </p>
                </div>
              </div>
            </div>

            {/* Complete Settings Reference */}
            <div className="settings-section full-width">
              <h3>
                <Settings size={18} />
                {t('pez.settingsTitle')}
              </h3>

              {/* Main Settings */}
              <div className="settings-category">
                <button className="category-header" onClick={() => toggleSettings('pez-main')}>
                  <h4 className="category-title">{t('pez.mainSettings')}</h4>
                  <ChevronDown size={18} className={`category-chevron ${expandedSettings.includes('pez-main') ? 'open' : ''}`} />
                </button>
                {expandedSettings.includes('pez-main') && (
                <div className="category-content">
                <div className="params-table">
                  <div className="param-row header">
                    <span>{t('table.parameter')}</span>
                    <span>{t('table.range')}</span>
                    <span>{t('table.default')}</span>
                    <span>{t('table.description')}</span>
                  </div>
                  <div className="param-row">
                    <span className="param-name">{t('pez.fibPeriodName')}</span>
                    <span className="param-range">21 - 200</span>
                    <span className="param-default">144</span>
                    <span className="param-desc">{t('pez.fibPeriodDesc')}</span>
                  </div>
                  <div className="param-row">
                    <span className="param-name">{t('pez.fibAnalysisSetName')}</span>
                    <span className="param-range">SET1-SET4</span>
                    <span className="param-default">SET2: Advanced Harmonic</span>
                    <span className="param-desc">{t('pez.fibAnalysisSetDesc')}</span>
                  </div>
                </div>
                </div>
                )}
              </div>

              {/* Adaptive S/R System */}
              <div className="settings-category">
                <button className="category-header" onClick={() => toggleSettings('pez-adaptive-sr')}>
                  <h4 className="category-title">{t('pez.adaptiveSRSystem')}</h4>
                  <ChevronDown size={18} className={`category-chevron ${expandedSettings.includes('pez-adaptive-sr') ? 'open' : ''}`} />
                </button>
                {expandedSettings.includes('pez-adaptive-sr') && (
                <div className="category-content">
                <div className="params-table">
                  <div className="param-row header">
                    <span>{t('table.parameter')}</span>
                    <span>{t('table.range')}</span>
                    <span>{t('table.default')}</span>
                    <span>{t('table.description')}</span>
                  </div>
                  <div className="param-row">
                    <span className="param-name">{t('pez.enableAdaptiveSRName')}</span>
                    <span className="param-range">On/Off</span>
                    <span className="param-default">On</span>
                    <span className="param-desc">{t('pez.enableAdaptiveSRDesc')}</span>
                  </div>
                  <div className="param-row">
                    <span className="param-name">{t('pez.manualSRLookbackName')}</span>
                    <span className="param-range">1 - 144</span>
                    <span className="param-default">55</span>
                    <span className="param-desc">{t('pez.manualSRLookbackDesc')}</span>
                  </div>
                  <div className="param-row">
                    <span className="param-name">{t('pez.minSRLookbackName')}</span>
                    <span className="param-range">10 - 34</span>
                    <span className="param-default">13</span>
                    <span className="param-desc">{t('pez.minSRLookbackDesc')}</span>
                  </div>
                  <div className="param-row">
                    <span className="param-name">{t('pez.maxSRLookbackName')}</span>
                    <span className="param-range">34 - 200</span>
                    <span className="param-default">144</span>
                    <span className="param-desc">{t('pez.maxSRLookbackDesc')}</span>
                  </div>
                </div>
                </div>
                )}
              </div>

              {/* Adaptive Time System */}
              <div className="settings-category">
                <button className="category-header" onClick={() => toggleSettings('pez-adaptive-time')}>
                  <h4 className="category-title">{t('pez.adaptiveTimeSystem')}</h4>
                  <ChevronDown size={18} className={`category-chevron ${expandedSettings.includes('pez-adaptive-time') ? 'open' : ''}`} />
                </button>
                {expandedSettings.includes('pez-adaptive-time') && (
                <div className="category-content">
                <div className="params-table">
                  <div className="param-row header">
                    <span>{t('table.parameter')}</span>
                    <span>{t('table.range')}</span>
                    <span>{t('table.default')}</span>
                    <span>{t('table.description')}</span>
                  </div>
                  <div className="param-row">
                    <span className="param-name">{t('pez.showTimeZoneName')}</span>
                    <span className="param-range">On/Off</span>
                    <span className="param-default">On</span>
                    <span className="param-desc">{t('pez.showTimeZoneDesc')}</span>
                  </div>
                  <div className="param-row">
                    <span className="param-name">{t('pez.enableTimeAdaptiveName')}</span>
                    <span className="param-range">On/Off</span>
                    <span className="param-default">On</span>
                    <span className="param-desc">{t('pez.enableTimeAdaptiveDesc')}</span>
                  </div>
                  <div className="param-row">
                    <span className="param-name">{t('pez.manualTimeLookbackName')}</span>
                    <span className="param-range">1 - 144</span>
                    <span className="param-default">55</span>
                    <span className="param-desc">{t('pez.manualTimeLookbackDesc')}</span>
                  </div>
                  <div className="param-row">
                    <span className="param-name">{t('pez.minMaxTimeLookbackName')}</span>
                    <span className="param-range">13 - 144</span>
                    <span className="param-default">13 / 144</span>
                    <span className="param-desc">{t('pez.minMaxTimeLookbackDesc')}</span>
                  </div>
                </div>
                </div>
                )}
              </div>

              {/* Visibility Settings */}
              <div className="settings-category">
                <button className="category-header" onClick={() => toggleSettings('pez-visibility')}>
                  <h4 className="category-title">{t('pez.visibilitySettings')}</h4>
                  <ChevronDown size={18} className={`category-chevron ${expandedSettings.includes('pez-visibility') ? 'open' : ''}`} />
                </button>
                {expandedSettings.includes('pez-visibility') && (
                <div className="category-content">
                <div className="params-table">
                  <div className="param-row header">
                    <span>{t('table.parameter')}</span>
                    <span>{t('table.options')}</span>
                    <span>{t('table.default')}</span>
                    <span>{t('table.description')}</span>
                  </div>
                  <div className="param-row">
                    <span className="param-name">{t('pez.showPivotLinesName')}</span>
                    <span className="param-range">On/Off</span>
                    <span className="param-default">Off</span>
                    <span className="param-desc">{t('pez.showPivotLinesDesc')}</span>
                  </div>
                  <div className="param-row">
                    <span className="param-name">{t('pez.trendLineName')}</span>
                    <span className="param-range">On/Off + Color</span>
                    <span className="param-default">On (White)</span>
                    <span className="param-desc">{t('pez.trendLineDesc')}</span>
                  </div>
                  <div className="param-row">
                    <span className="param-name">{t('pez.levelsLineName')}</span>
                    <span className="param-range">On/Off</span>
                    <span className="param-default">On</span>
                    <span className="param-desc">{t('pez.levelsLineDesc')}</span>
                  </div>
                  <div className="param-row">
                    <span className="param-name">{t('pez.labelsPositionName')}</span>
                    <span className="param-range">Left / Right</span>
                    <span className="param-default">Left</span>
                    <span className="param-desc">{t('pez.labelsPositionDesc')}</span>
                  </div>
                  <div className="param-row">
                    <span className="param-name">{t('pez.boxLabelsPositionName')}</span>
                    <span className="param-range">Left / Mid / Right</span>
                    <span className="param-default">Mid</span>
                    <span className="param-desc">{t('pez.boxLabelsPositionDesc')}</span>
                  </div>
                  <div className="param-row">
                    <span className="param-name">{t('pez.fontSizesName')}</span>
                    <span className="param-range">8-18 / Tiny-Large</span>
                    <span className="param-default">12 / Normal</span>
                    <span className="param-desc">{t('pez.fontSizesDesc')}</span>
                  </div>
                </div>
                </div>
                )}
              </div>

              {/* How to Calculate */}
              <div className="settings-category">
                <button className="category-header" onClick={() => toggleSettings('pez-debug')}>
                  <h4 className="category-title">{t('pez.howToCalculate')}</h4>
                  <ChevronDown size={18} className={`category-chevron ${expandedSettings.includes('pez-debug') ? 'open' : ''}`} />
                </button>
                {expandedSettings.includes('pez-debug') && (
                <div className="category-content">
                <div className="params-table">
                  <div className="param-row header">
                    <span>{t('table.parameter')}</span>
                    <span>{t('table.type')}</span>
                    <span>{t('table.default')}</span>
                    <span>{t('table.description')}</span>
                  </div>
                  <div className="param-row">
                    <span className="param-name">{t('pez.showPivotFibValuesName')}</span>
                    <span className="param-range">On/Off</span>
                    <span className="param-default">Off</span>
                    <span className="param-desc">{t('pez.showPivotFibValuesDesc')}</span>
                  </div>
                  <div className="param-row">
                    <span className="param-name">{t('pez.showPivotTimeFibName')}</span>
                    <span className="param-range">On/Off</span>
                    <span className="param-default">Off</span>
                    <span className="param-desc">{t('pez.showPivotTimeFibDesc')}</span>
                  </div>
                  <div className="param-row">
                    <span className="param-name">{t('pez.showFibTimeZonesName')}</span>
                    <span className="param-range">On/Off</span>
                    <span className="param-default">Off</span>
                    <span className="param-desc">{t('pez.showFibTimeZonesDesc')}</span>
                  </div>
                </div>
                </div>
                )}
              </div>
            </div>

            {/* Zone States Explanation */}
            <div className="technical-section">
              <h3>{t('pez.zoneStatesTitle')}</h3>
              <p>{t('pez.zoneStatesDesc')}</p>
              <div className="state-grid">
                <div className="state-item">
                  <span className="state-code">State 0</span>
                  <span className="state-name">{t('pez.state0Name')}</span>
                  <span className="state-desc">{t('pez.state0Desc')}</span>
                </div>
                <div className="state-item">
                  <span className="state-code">State 1</span>
                  <span className="state-name">{t('pez.state1Name')}</span>
                  <span className="state-desc">{t('pez.state1Desc')}</span>
                </div>
                <div className="state-item">
                  <span className="state-code">State 2</span>
                  <span className="state-name">{t('pez.state2Name')}</span>
                  <span className="state-desc">{t('pez.state2Desc')}</span>
                </div>
              </div>
            </div>
          </section>

          {/* Perfect Retracement Zone */}
          <section id="perfect-retracement-zone" className="doc-section indicator-section">
            <div className="section-header">
              <div className="section-icon gradient-purple">
                <LineChart size={24} />
              </div>
              <div>
                <h2>FibAlgo® - Perfect Retracement Zone™</h2>
                <p>{t('prz.subtitle')}</p>
              </div>
            </div>

            <div className="indicator-overview">
              <p>
                {t('prz.overview')}
              </p>
            </div>

            <LibraryChartWindow indicatorKey="prz" indicatorLabel="Perfect Retracement Zone™" />

            <div className="feature-grid">
              <div className="feature-card">
                <div className="feature-icon">
                  <Activity size={20} />
                </div>
                <h4>{t('prz.featureDualPivotTitle')}</h4>
                <p>
                  {t('prz.featureDualPivotDesc')}
                </p>
              </div>

              <div className="feature-card">
                <div className="feature-icon">
                  <Brain size={20} />
                </div>
                <h4>{t('prz.featureAdaptiveFibTitle')}</h4>
                <p>
                  {t('prz.featureAdaptiveFibDesc')}
                </p>
              </div>

              <div className="feature-card">
                <div className="feature-icon">
                  <BarChart3 size={20} />
                </div>
                <h4>{t('prz.featureDeepStatsTitle')}</h4>
                <p>
                  {t('prz.featureDeepStatsDesc')}
                </p>
              </div>

              <div className="feature-card">
                <div className="feature-icon">
                  <Gauge size={20} />
                </div>
                <h4>{t('prz.featurePressureTitle')}</h4>
                <p>
                  {t('prz.featurePressureDesc')}
                </p>
              </div>
            </div>

            <div className="concept-section">
              <h3>{t('prz.coreEngineTitle')}</h3>

              <div className="dual-pivot-grid">
                <div className="pivot-card">
                  <h4>{t('prz.majorTrendPivotsTitle')}</h4>
                  <p>
                    {t('prz.majorTrendPivotsDesc')}
                  </p>
                </div>
                <div className="pivot-card">
                  <h4>{t('prz.retracementPivotsTitle')}</h4>
                  <p>
                    {t('prz.retracementPivotsDesc')}
                  </p>
                </div>
              </div>
            </div>

            <div className="zones-section">
              <h3>{t('prz.adaptiveFibZonesTitle')}</h3>
              <div className="zones-grid">
                <div className="zone-card noise">
                  <h4>{t('prz.noiseZonesTitle')}</h4>
                  <p>{t('prz.noiseZonesDesc')}</p>
                </div>
                <div className="zone-card confidence">
                  <h4>{t('prz.confidenceZonesTitle')}</h4>
                  <p>{t('prz.confidenceZonesDesc')}</p>
                </div>
              </div>
            </div>

            <div className="visuals-section">
              <h3>{t('prz.understandingVisualsTitle')}</h3>
              <div className="visual-items">
                <div className="visual-item">
                  <span className="visual-label">{t('prz.pivotLabelsLabel')}</span>
                  <p>{t('prz.pivotLabelsDesc')}</p>
                </div>
                <div className="visual-item">
                  <span className="visual-label">{t('prz.starSystemLabel')}</span>
                  <p>{t('prz.starSystemDesc')}</p>
                </div>
                <div className="visual-item">
                  <span className="visual-label">{t('prz.fibBoxesLabel')}</span>
                  <p>{t('prz.fibBoxesDesc')}</p>
                </div>
              </div>
            </div>

            <div className="trading-strategy">
              <h3>{t('prz.tradingStrategyTitle')}</h3>
              <div className="strategy-grid">
                <div className="strategy-card buy">
                  <h4>
                    <TrendingUp size={18} />
                    {t('prz.longEntriesTitle')}
                  </h4>
                  <ol>
                    <li>{t('prz.longStep1')}</li>
                    <li>{t('prz.longStep2')}</li>
                    <li>{t('prz.longStep3')}</li>
                  </ol>
                </div>
                <div className="strategy-card sell">
                  <h4>
                    <TrendingUp size={18} className="rotate-180" />
                    {t('prz.shortEntriesTitle')}
                  </h4>
                  <ol>
                    <li>{t('prz.shortStep1')}</li>
                    <li>{t('prz.shortStep2')}</li>
                    <li>{t('prz.shortStep3')}</li>
                  </ol>
                </div>
              </div>
            </div>

            {/* Complete Settings Reference */}
            <div className="settings-section full-width">
              <h3>
                <Settings size={18} />
                {t('prz.settingsTitle')}
              </h3>

              {/* Trend Settings */}
              <div className="settings-category">
                <button className="category-header" onClick={() => toggleSettings('prz-trend')}>
                  <h4 className="category-title">{t('prz.trendSettings')}</h4>
                  <ChevronDown size={18} className={`category-chevron ${expandedSettings.includes('prz-trend') ? 'open' : ''}`} />
                </button>
                {expandedSettings.includes('prz-trend') && (
                <div className="category-content">
                <div className="params-table">
                  <div className="param-row header">
                    <span>{t('table.parameter')}</span>
                    <span>{t('table.range')}</span>
                    <span>{t('table.default')}</span>
                    <span>{t('table.description')}</span>
                  </div>
                  <div className="param-row">
                    <span className="param-name">{t('prz.majorTrendPeriodName')}</span>
                    <span className="param-range">2 - 1404</span>
                    <span className="param-default">144</span>
                    <span className="param-desc">{t('prz.majorTrendPeriodDesc')}</span>
                  </div>
                  <div className="param-row">
                    <span className="param-name">{t('prz.retracementPeriodName')}</span>
                    <span className="param-range">2 - 144</span>
                    <span className="param-default">21</span>
                    <span className="param-desc">{t('prz.retracementPeriodDesc')}</span>
                  </div>
                </div>
                </div>
                )}
              </div>

              {/* Adaptive Zone Configuration */}
              <div className="settings-category">
                <button className="category-header" onClick={() => toggleSettings('prz-adaptive')}>
                  <h4 className="category-title">{t('prz.adaptiveZoneConfig')}</h4>
                  <ChevronDown size={18} className={`category-chevron ${expandedSettings.includes('prz-adaptive') ? 'open' : ''}`} />
                </button>
                {expandedSettings.includes('prz-adaptive') && (
                <div className="category-content">
                <div className="params-table">
                  <div className="param-row header">
                    <span>{t('table.parameter')}</span>
                    <span>{t('table.range')}</span>
                    <span>{t('table.default')}</span>
                    <span>{t('table.description')}</span>
                  </div>
                  <div className="param-row">
                    <span className="param-name">{t('prz.enableAdaptiveFibName')}</span>
                    <span className="param-range">On/Off</span>
                    <span className="param-default">Off</span>
                    <span className="param-desc">{t('prz.enableAdaptiveFibDesc')}</span>
                  </div>
                  <div className="param-row">
                    <span className="param-name">{t('prz.noiseZone1Name')}</span>
                    <span className="param-range">5% - 25%</span>
                    <span className="param-default">10%</span>
                    <span className="param-desc">{t('prz.noiseZone1Desc')}</span>
                  </div>
                  <div className="param-row">
                    <span className="param-name">{t('prz.noiseZone2Name')}</span>
                    <span className="param-range">5% - 25%</span>
                    <span className="param-default">10%</span>
                    <span className="param-desc">{t('prz.noiseZone2Desc')}</span>
                  </div>
                  <div className="param-row">
                    <span className="param-name">{t('prz.confidenceZone123Name')}</span>
                    <span className="param-range">15% - 40%</span>
                    <span className="param-default">26.67% each</span>
                    <span className="param-desc">{t('prz.confidenceZone123Desc')}</span>
                  </div>
                </div>
                </div>
                )}
              </div>

              {/* Fibonacci Retracement Levels */}
              <div className="settings-category">
                <button className="category-header" onClick={() => toggleSettings('prz-fib')}>
                  <h4 className="category-title">{t('prz.fibRetracementLevels')}</h4>
                  <ChevronDown size={18} className={`category-chevron ${expandedSettings.includes('prz-fib') ? 'open' : ''}`} />
                </button>
                {expandedSettings.includes('prz-fib') && (
                <div className="category-content">
                <div className="params-table">
                  <div className="param-row header">
                    <span>{t('table.level')}</span>
                    <span>{t('table.ratio')}</span>
                    <span>{t('table.defaultColor')}</span>
                    <span>{t('table.description')}</span>
                  </div>
                  <div className="param-row">
                    <span className="param-name">Level 1</span>
                    <span className="param-range">0.0</span>
                    <span className="param-default">Gray</span>
                    <span className="param-desc">{t('prz.level1Desc')}</span>
                  </div>
                  <div className="param-row">
                    <span className="param-name">Level 2</span>
                    <span className="param-range">0.236</span>
                    <span className="param-default">Red</span>
                    <span className="param-desc">{t('prz.level2Desc')}</span>
                  </div>
                  <div className="param-row">
                    <span className="param-name">Level 3</span>
                    <span className="param-range">0.382</span>
                    <span className="param-default">Orange</span>
                    <span className="param-desc">{t('prz.level3Desc')}</span>
                  </div>
                  <div className="param-row">
                    <span className="param-name">Level 4</span>
                    <span className="param-range">0.5</span>
                    <span className="param-default">Green</span>
                    <span className="param-desc">{t('prz.level4Desc')}</span>
                  </div>
                  <div className="param-row">
                    <span className="param-name">Level 5</span>
                    <span className="param-range">0.618</span>
                    <span className="param-default">Teal</span>
                    <span className="param-desc">{t('prz.level5Desc')}</span>
                  </div>
                  <div className="param-row">
                    <span className="param-name">Level 6</span>
                    <span className="param-range">0.786</span>
                    <span className="param-default">Aqua</span>
                    <span className="param-desc">{t('prz.level6Desc')}</span>
                  </div>
                  <div className="param-row">
                    <span className="param-name">Level 7</span>
                    <span className="param-range">1.0</span>
                    <span className="param-default">Gray</span>
                    <span className="param-desc">{t('prz.level7Desc')}</span>
                  </div>
                  <div className="param-row optional">
                    <span className="param-name">Level 8 (Optional)</span>
                    <span className="param-range">0.75</span>
                    <span className="param-default">Blue (Off)</span>
                    <span className="param-desc">{t('prz.level8Desc')}</span>
                  </div>
                  <div className="param-row optional">
                    <span className="param-name">Level 9 (Optional)</span>
                    <span className="param-range">0.886</span>
                    <span className="param-default">Purple (Off)</span>
                    <span className="param-desc">{t('prz.level9Desc')}</span>
                  </div>
                  <div className="param-row optional">
                    <span className="param-name">Level 10 (Optional)</span>
                    <span className="param-range">0.95</span>
                    <span className="param-default">Maroon (Off)</span>
                    <span className="param-desc">{t('prz.level10Desc')}</span>
                  </div>
                </div>
                </div>
                )}
              </div>

              {/* Market Pressure Settings */}
              <div className="settings-category">
                <button className="category-header" onClick={() => toggleSettings('prz-pressure')}>
                  <h4 className="category-title">{t('prz.marketPressureGauge')}</h4>
                  <ChevronDown size={18} className={`category-chevron ${expandedSettings.includes('prz-pressure') ? 'open' : ''}`} />
                </button>
                {expandedSettings.includes('prz-pressure') && (
                <div className="category-content">
                <div className="params-table">
                  <div className="param-row header">
                    <span>{t('table.parameter')}</span>
                    <span>{t('table.range')}</span>
                    <span>{t('table.default')}</span>
                    <span>{t('table.description')}</span>
                  </div>
                  <div className="param-row">
                    <span className="param-name">{t('prz.showPressureGaugeName')}</span>
                    <span className="param-range">On/Off</span>
                    <span className="param-default">On</span>
                    <span className="param-desc">{t('prz.showPressureGaugeDesc')}</span>
                  </div>
                  <div className="param-row">
                    <span className="param-name">{t('prz.gaugeDistanceName')}</span>
                    <span className="param-range">1 - 100</span>
                    <span className="param-default">5</span>
                    <span className="param-desc">{t('prz.gaugeDistanceDesc')}</span>
                  </div>
                  <div className="param-row">
                    <span className="param-name">{t('prz.bullishColorName')}</span>
                    <span className="param-range">Color</span>
                    <span className="param-default">#00ffbb</span>
                    <span className="param-desc">{t('prz.bullishColorDesc')}</span>
                  </div>
                  <div className="param-row">
                    <span className="param-name">{t('prz.bearishColorName')}</span>
                    <span className="param-range">Color</span>
                    <span className="param-default">#ff1100</span>
                    <span className="param-desc">{t('prz.bearishColorDesc')}</span>
                  </div>
                </div>
                </div>
                )}
              </div>

              {/* Display Settings */}
              <div className="settings-category">
                <button className="category-header" onClick={() => toggleSettings('prz-display')}>
                  <h4 className="category-title">{t('prz.displaySettings')}</h4>
                  <ChevronDown size={18} className={`category-chevron ${expandedSettings.includes('prz-display') ? 'open' : ''}`} />
                </button>
                {expandedSettings.includes('prz-display') && (
                <div className="category-content">
                <div className="params-table">
                  <div className="param-row header">
                    <span>{t('table.parameter')}</span>
                    <span>{t('table.options')}</span>
                    <span>{t('table.default')}</span>
                    <span>{t('table.description')}</span>
                  </div>
                  <div className="param-row">
                    <span className="param-name">{t('prz.showPivotLabelsName')}</span>
                    <span className="param-range">On/Off</span>
                    <span className="param-default">On</span>
                    <span className="param-desc">{t('prz.showPivotLabelsDesc')}</span>
                  </div>
                  <div className="param-row">
                    <span className="param-name">{t('prz.majorTrendPivotName')}</span>
                    <span className="param-range">On/Off + Colors</span>
                    <span className="param-default">On (White)</span>
                    <span className="param-desc">{t('prz.majorTrendPivotDesc')}</span>
                  </div>
                  <div className="param-row">
                    <span className="param-name">{t('prz.retracementPivotName')}</span>
                    <span className="param-range">On/Off + Colors</span>
                    <span className="param-default">On (Red)</span>
                    <span className="param-desc">{t('prz.retracementPivotDesc')}</span>
                  </div>
                  <div className="param-row">
                    <span className="param-name">{t('prz.showDynamicFibName')}</span>
                    <span className="param-range">On/Off</span>
                    <span className="param-default">On</span>
                    <span className="param-desc">{t('prz.showDynamicFibDesc')}</span>
                  </div>
                  <div className="param-row">
                    <span className="param-name">{t('prz.showFibBoxesName')}</span>
                    <span className="param-range">On/Off</span>
                    <span className="param-default">On</span>
                    <span className="param-desc">{t('prz.showFibBoxesDesc')}</span>
                  </div>
                </div>
                </div>
                )}
              </div>
            </div>

            {/* Statistical Tracking */}
            <div className="technical-section">
              <h3>{t('prz.adaptiveBrainTitle')}</h3>
              <p>{t('prz.adaptiveBrainDesc')}</p>
              <div className="stats-grid">
                <div className="stats-item">
                  <span className="stats-label">fib_counts</span>
                  <span className="stats-desc">{t('prz.fibCountsDesc')}</span>
                </div>
                <div className="stats-item">
                  <span className="stats-label">star_counts</span>
                  <span className="stats-desc">{t('prz.starCountsDesc')}</span>
                </div>
                <div className="stats-item">
                  <span className="stats-label">total_fibs</span>
                  <span className="stats-desc">{t('prz.totalFibsDesc')}</span>
                </div>
                <div className="stats-item">
                  <span className="stats-label">total_stars</span>
                  <span className="stats-desc">{t('prz.totalStarsDesc')}</span>
                </div>
              </div>
            </div>
          </section>

          {/* Screener PEZ */}
          <section id="screener-pez" className="doc-section indicator-section">
            <div className="section-header">
              <div className="section-icon gradient-orange">
                <Grid3X3 size={24} />
              </div>
              <div>
                <h2>FibAlgo® - Screener (PEZ)</h2>
                <p>{t('screener.subtitle')}</p>
              </div>
            </div>

            <div className="indicator-overview">
              <p>
                {t('screener.overview')}
              </p>
            </div>

            <LibraryChartWindow indicatorKey="screener" indicatorLabel="Screener (PEZ)" />

            <div className="columns-section">
              <h3>{t('screener.columnsExplained')}</h3>
              <div className="columns-grid">
                <div className="column-card">
                  <h4>{t('screener.volatilityTitle')}</h4>
                  <p>{t('screener.volatilityDesc')}</p>
                </div>
                <div className="column-card">
                  <h4>Trend</h4>
                  <p>{t('screener.trendDesc')}</p>
                </div>
                <div className="column-card">
                  <h4>{t('screener.fibRangeTitle')}</h4>
                  <p>{t('screener.fibRangeDesc')}</p>
                </div>
                <div className="column-card">
                  <h4>{t('screener.trendStrengthTitle')}</h4>
                  <p>{t('screener.trendStrengthDesc')}</p>
                </div>
                <div className="column-card highlight">
                  <h4>{t('screener.buyZoneSellZoneTitle')}</h4>
                  <p>{t('screener.buyZoneSellZoneDesc')}</p>
                </div>
              </div>
            </div>

            <div className="workflow-section">
              <h3>{t('screener.howToUseTitle')}</h3>
              <div className="workflow-steps">
                <div className="workflow-step">
                  <div className="workflow-number">1</div>
                  <div>
                    <h4>{t('screener.step1Title')}</h4>
                    <p>{t('screener.step1Desc')}</p>
                  </div>
                </div>
                <div className="workflow-step">
                  <div className="workflow-number">2</div>
                  <div>
                    <h4>{t('screener.step2Title')}</h4>
                    <p>{t('screener.step2Desc')}</p>
                  </div>
                </div>
                <div className="workflow-step">
                  <div className="workflow-number">3</div>
                  <div>
                    <h4>{t('screener.step3Title')}</h4>
                    <p>{t('screener.step3Desc')}</p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Smart Trading */}
          <section id="smart-trading" className="doc-section indicator-section">
            <div className="section-header">
              <div className="section-icon gradient-green">
                <Sparkles size={24} />
              </div>
              <div>
                <h2>FibAlgo® - Smart Trading™</h2>
                <p>{t('smartTrading.subtitle')}</p>
              </div>
            </div>

            <div className="indicator-overview">
              <p>
                {t('smartTrading.overview')}
              </p>
            </div>

            <LibraryChartWindow indicatorKey="smartTrading" indicatorLabel="Smart Trading™" />

            <div className="feature-grid">
              <div className="feature-card">
                <div className="feature-icon">
                  <Target size={20} />
                </div>
                <h4>{t('smartTrading.featureVolatilityTitle')}</h4>
                <p>
                  {t('smartTrading.featureVolatilityDesc')}
                </p>
              </div>

              <div className="feature-card">
                <div className="feature-icon">
                  <Zap size={20} />
                </div>
                <h4>{t('smartTrading.featureBreakoutTitle')}</h4>
                <p>
                  {t('smartTrading.featureBreakoutDesc')}
                </p>
              </div>

              <div className="feature-card">
                <div className="feature-icon">
                  <ArrowRight size={20} />
                </div>
                <h4>{t('smartTrading.featureReversalTitle')}</h4>
                <p>
                  {t('smartTrading.featureReversalDesc')}
                </p>
              </div>

              <div className="feature-card">
                <div className="feature-icon">
                  <TrendingUp size={20} />
                </div>
                <h4>{t('smartTrading.featureTPTitle')}</h4>
                <p>
                  {t('smartTrading.featureTPDesc')}
                </p>
              </div>
            </div>

            <div className="breakout-section">
              <h3>{t('smartTrading.breakoutStrengthTitle')}</h3>
              <div className="breakout-grid">
                <div className="breakout-card strong">
                  <h4>{t('smartTrading.strongBreakTitle')}</h4>
                  <p>{t('smartTrading.strongBreakDesc')}</p>
                </div>
                <div className="breakout-card normal">
                  <h4>{t('smartTrading.breakTitle')}</h4>
                  <p>{t('smartTrading.breakDesc')}</p>
                </div>
                <div className="breakout-card weak">
                  <h4>{t('smartTrading.lowBreakTitle')}</h4>
                  <p>{t('smartTrading.lowBreakDesc')}</p>
                </div>
              </div>
            </div>

            <div className="trading-strategy">
              <h3>{t('smartTrading.tradingStrategyTitle')}</h3>
              <div className="strategy-grid">
                <div className="strategy-card buy">
                  <h4>
                    <TrendingUp size={18} />
                    {t('smartTrading.buySignalsTitle')}
                  </h4>
                  <ol>
                    <li>{t('smartTrading.buyStep1')}</li>
                    <li>{t('smartTrading.buyStep2')}</li>
                    <li>{t('smartTrading.buyStep3')}</li>
                  </ol>
                </div>
                <div className="strategy-card sell">
                  <h4>
                    <TrendingUp size={18} className="rotate-180" />
                    {t('smartTrading.sellSignalsTitle')}
                  </h4>
                  <ol>
                    <li>{t('smartTrading.sellStep1')}</li>
                    <li>{t('smartTrading.sellStep2')}</li>
                    <li>{t('smartTrading.sellStep3')}</li>
                  </ol>
                </div>
              </div>
            </div>

            <div className="settings-section full-width">
              <h3>
                <Settings size={18} />
                {t('smartTrading.settingsTitle')}
              </h3>

              {/* Main Chart Settings */}
              <div className="settings-category">
                <button className="category-header" onClick={() => toggleSettings('st-main')}>
                  <h4 className="category-title">{t('smartTrading.mainChartSettings')}</h4>
                  <ChevronDown size={18} className={`category-chevron ${expandedSettings.includes('st-main') ? 'open' : ''}`} />
                </button>
                {expandedSettings.includes('st-main') && (
                <div className="category-content">
                <div className="params-table">
                  <div className="param-row header">
                    <span>{t('table.parameter')}</span>
                    <span>{t('table.range')}</span>
                    <span>{t('table.default')}</span>
                    <span>{t('table.description')}</span>
                  </div>
                  <div className="param-row highlight">
                    <span className="param-name">{t('smartTrading.fakeTrendBreakName')}</span>
                    <span className="param-range">0.1 - 2.0</span>
                    <span className="param-default">1.0</span>
                    <span className="param-desc">{t('smartTrading.fakeTrendBreakDesc')}</span>
                  </div>
                  <div className="param-row highlight">
                    <span className="param-name">{t('smartTrading.volatilitySensitivityName')}</span>
                    <span className="param-range">1.0 - 5.0</span>
                    <span className="param-default">3.0</span>
                    <span className="param-desc">{t('smartTrading.volatilitySensitivityDesc')}</span>
                  </div>
                </div>
                </div>
                )}
              </div>

              {/* ATR Thresholds */}
              <div className="settings-category">
                <button className="category-header" onClick={() => toggleSettings('st-atr')}>
                  <h4 className="category-title">{t('smartTrading.breakoutStrengthClassification')}</h4>
                  <ChevronDown size={18} className={`category-chevron ${expandedSettings.includes('st-atr') ? 'open' : ''}`} />
                </button>
                {expandedSettings.includes('st-atr') && (
                <div className="category-content">
                <div className="params-table">
                  <div className="param-row header">
                    <span>{t('table.classification')}</span>
                    <span>{t('table.condition')}</span>
                    <span>{t('table.multiplier')}</span>
                    <span>{t('table.meaning')}</span>
                  </div>
                  <div className="param-row">
                    <span className="param-name strong-text">Strong Break</span>
                    <span className="param-range">ATR &gt; Threshold</span>
                    <span className="param-default">1.4×</span>
                    <span className="param-desc">{t('smartTrading.strongBreakCondition')}</span>
                  </div>
                  <div className="param-row">
                    <span className="param-name">Break</span>
                    <span className="param-range">Normal ATR</span>
                    <span className="param-default">1.0×</span>
                    <span className="param-desc">{t('smartTrading.breakCondition')}</span>
                  </div>
                  <div className="param-row">
                    <span className="param-name weak-text">Low Break</span>
                    <span className="param-range">ATR &lt; Threshold</span>
                    <span className="param-default">0.7×</span>
                    <span className="param-desc">{t('smartTrading.lowBreakCondition')}</span>
                  </div>
                </div>
                </div>
                )}
              </div>

              {/* HTF Trend Settings */}
              <div className="settings-category">
                <button className="category-header" onClick={() => toggleSettings('st-htf')}>
                  <h4 className="category-title">{t('smartTrading.htfTrendSettings')}</h4>
                  <ChevronDown size={18} className={`category-chevron ${expandedSettings.includes('st-htf') ? 'open' : ''}`} />
                </button>
                {expandedSettings.includes('st-htf') && (
                <div className="category-content">
                <div className="params-table">
                  <div className="param-row header">
                    <span>{t('table.parameter')}</span>
                    <span>{t('table.options')}</span>
                    <span>{t('table.default')}</span>
                    <span>{t('table.description')}</span>
                  </div>
                  <div className="param-row">
                    <span className="param-name">{t('smartTrading.useHTFTrendName')}</span>
                    <span className="param-range">On/Off</span>
                    <span className="param-default">Off</span>
                    <span className="param-desc">{t('smartTrading.useHTFTrendDesc')}</span>
                  </div>
                  <div className="param-row">
                    <span className="param-name">{t('smartTrading.htfResolutionName')}</span>
                    <span className="param-range">Timeframe</span>
                    <span className="param-default">60 (1H)</span>
                    <span className="param-desc">{t('smartTrading.htfResolutionDesc')}</span>
                  </div>
                  <div className="param-row">
                    <span className="param-name">{t('smartTrading.htfVolatilityName')}</span>
                    <span className="param-range">1.0 - 5.0</span>
                    <span className="param-default">3.0</span>
                    <span className="param-desc">{t('smartTrading.htfVolatilityDesc')}</span>
                  </div>
                  <div className="param-row">
                    <span className="param-name">{t('smartTrading.showHTFTrendLabelName')}</span>
                    <span className="param-range">On/Off</span>
                    <span className="param-default">Off</span>
                    <span className="param-desc">{t('smartTrading.showHTFTrendLabelDesc')}</span>
                  </div>
                </div>
                </div>
                )}
              </div>

              {/* Line Settings */}
              <div className="settings-category">
                <button className="category-header" onClick={() => toggleSettings('st-lines')}>
                  <h4 className="category-title">{t('smartTrading.lineSettings')}</h4>
                  <ChevronDown size={18} className={`category-chevron ${expandedSettings.includes('st-lines') ? 'open' : ''}`} />
                </button>
                {expandedSettings.includes('st-lines') && (
                <div className="category-content">
                <div className="params-table">
                  <div className="param-row header">
                    <span>{t('table.parameter')}</span>
                    <span>{t('table.options')}</span>
                    <span>{t('table.default')}</span>
                    <span>{t('table.description')}</span>
                  </div>
                  <div className="param-row">
                    <span className="param-name">{t('smartTrading.showLinesName')}</span>
                    <span className="param-range">On/Off</span>
                    <span className="param-default">On</span>
                    <span className="param-desc">{t('smartTrading.showLinesDesc')}</span>
                  </div>
                  <div className="param-row">
                    <span className="param-name">{t('smartTrading.extendLinesName')}</span>
                    <span className="param-range">On/Off</span>
                    <span className="param-default">Off</span>
                    <span className="param-desc">{t('smartTrading.extendLinesDesc')}</span>
                  </div>
                  <div className="param-row">
                    <span className="param-name">{t('smartTrading.resistanceLineColorName')}</span>
                    <span className="param-range">Color</span>
                    <span className="param-default">Maroon (20% transparent)</span>
                    <span className="param-desc">{t('smartTrading.resistanceLineColorDesc')}</span>
                  </div>
                  <div className="param-row">
                    <span className="param-name">{t('smartTrading.supportLineColorName')}</span>
                    <span className="param-range">Color</span>
                    <span className="param-default">Teal (20% transparent)</span>
                    <span className="param-desc">{t('smartTrading.supportLineColorDesc')}</span>
                  </div>
                </div>
                </div>
                )}
              </div>

              {/* Zone & Box Settings */}
              <div className="settings-category">
                <button className="category-header" onClick={() => toggleSettings('st-zones')}>
                  <h4 className="category-title">{t('smartTrading.zoneAndBoxSettings')}</h4>
                  <ChevronDown size={18} className={`category-chevron ${expandedSettings.includes('st-zones') ? 'open' : ''}`} />
                </button>
                {expandedSettings.includes('st-zones') && (
                <div className="category-content">
                <div className="params-table">
                  <div className="param-row header">
                    <span>{t('table.parameter')}</span>
                    <span>{t('table.options')}</span>
                    <span>{t('table.default')}</span>
                    <span>{t('table.description')}</span>
                  </div>
                  <div className="param-row">
                    <span className="param-name">{t('smartTrading.showReversalZoneName')}</span>
                    <span className="param-range">On/Off</span>
                    <span className="param-default">Off</span>
                    <span className="param-desc">{t('smartTrading.showReversalZoneDesc')}</span>
                  </div>
                  <div className="param-row">
                    <span className="param-name">{t('smartTrading.showTPZoneName')}</span>
                    <span className="param-range">On/Off</span>
                    <span className="param-default">Off</span>
                    <span className="param-desc">{t('smartTrading.showTPZoneDesc')}</span>
                  </div>
                  <div className="param-row">
                    <span className="param-name">{t('smartTrading.reversalSellZoneColorName')}</span>
                    <span className="param-range">Color</span>
                    <span className="param-default">Maroon (60%)</span>
                    <span className="param-desc">{t('smartTrading.reversalSellZoneColorDesc')}</span>
                  </div>
                  <div className="param-row">
                    <span className="param-name">{t('smartTrading.reversalBuyZoneColorName')}</span>
                    <span className="param-range">Color</span>
                    <span className="param-default">Teal (60%)</span>
                    <span className="param-desc">{t('smartTrading.reversalBuyZoneColorDesc')}</span>
                  </div>
                  <div className="param-row">
                    <span className="param-name">{t('smartTrading.tpZoneColorName')}</span>
                    <span className="param-range">Color</span>
                    <span className="param-default">Gray (90%)</span>
                    <span className="param-desc">{t('smartTrading.tpZoneColorDesc')}</span>
                  </div>
                </div>
                </div>
                )}
              </div>

              {/* Box Text Customization */}
              <div className="settings-category">
                <button className="category-header" onClick={() => toggleSettings('st-text')}>
                  <h4 className="category-title">{t('smartTrading.boxTextCustomization')}</h4>
                  <ChevronDown size={18} className={`category-chevron ${expandedSettings.includes('st-text') ? 'open' : ''}`} />
                </button>
                {expandedSettings.includes('st-text') && (
                <div className="category-content">
                <div className="params-table">
                  <div className="param-row header">
                    <span>{t('table.parameter')}</span>
                    <span>{t('table.type')}</span>
                    <span>{t('table.default')}</span>
                    <span>{t('table.description')}</span>
                  </div>
                  <div className="param-row">
                    <span className="param-name">{t('smartTrading.showBoxTextName')}</span>
                    <span className="param-range">On/Off</span>
                    <span className="param-default">On</span>
                    <span className="param-desc">{t('smartTrading.showBoxTextDesc')}</span>
                  </div>
                  <div className="param-row">
                    <span className="param-name">{t('smartTrading.boxTextSizeName')}</span>
                    <span className="param-range">Tiny-Huge</span>
                    <span className="param-default">Normal</span>
                    <span className="param-desc">{t('smartTrading.boxTextSizeDesc')}</span>
                  </div>
                  <div className="param-row">
                    <span className="param-name">{t('smartTrading.reversalTextsName')}</span>
                    <span className="param-range">String</span>
                    <span className="param-default">&ldquo;Retracement&rdquo; / &ldquo;Retracement Trend Zone&rdquo;</span>
                    <span className="param-desc">{t('smartTrading.reversalTextsDesc')}</span>
                  </div>
                  <div className="param-row">
                    <span className="param-name">{t('smartTrading.tpTextsName')}</span>
                    <span className="param-range">String</span>
                    <span className="param-default">&ldquo;TP&rdquo; / &ldquo;Buy/Sell Take Profit Zone&rdquo;</span>
                    <span className="param-desc">{t('smartTrading.tpTextsDesc')}</span>
                  </div>
                </div>
                </div>
                )}
              </div>

              {/* Alert System */}
              <div className="settings-category">
                <button className="category-header" onClick={() => toggleSettings('st-alerts')}>
                  <h4 className="category-title">{t('smartTrading.smartAlertSystem')}</h4>
                  <ChevronDown size={18} className={`category-chevron ${expandedSettings.includes('st-alerts') ? 'open' : ''}`} />
                </button>
                {expandedSettings.includes('st-alerts') && (
                <div className="category-content">
                <div className="params-table">
                  <div className="param-row header">
                    <span>{t('table.alertType')}</span>
                    <span>{t('table.default')}</span>
                    <span>{t('table.triggerCondition')}</span>
                  </div>
                  <div className="param-row">
                    <span className="param-name">{t('smartTrading.enableAlertSystemName')}</span>
                    <span className="param-default">On</span>
                    <span className="param-desc">{t('smartTrading.enableAlertSystemDesc')}</span>
                  </div>
                  <div className="param-row">
                    <span className="param-name">{t('smartTrading.reversalBoxStartedName')}</span>
                    <span className="param-default">Off</span>
                    <span className="param-desc">{t('smartTrading.reversalBoxStartedDesc')}</span>
                  </div>
                  <div className="param-row">
                    <span className="param-name">{t('smartTrading.upDownBreakoutName')}</span>
                    <span className="param-default">Off</span>
                    <span className="param-desc">{t('smartTrading.upDownBreakoutDesc')}</span>
                  </div>
                  <div className="param-row">
                    <span className="param-name">{t('smartTrading.strongBreakoutName')}</span>
                    <span className="param-default">Off</span>
                    <span className="param-desc">{t('smartTrading.strongBreakoutDesc')}</span>
                  </div>
                </div>
                </div>
                )}
              </div>
            </div>
          </section>

          {/* Oscillator Matrix */}
          <section id="oscillator-matrix" className="doc-section indicator-section">
            <div className="section-header">
              <div className="section-icon gradient-pink">
                <Activity size={24} />
              </div>
              <div>
                <h2>FibAlgo® - Oscillator Matrix™</h2>
                <p>{t('oscillatorMatrix.subtitle')}</p>
              </div>
            </div>

            <div className="indicator-overview">
              <p>
                {t('oscillatorMatrix.overview')}
              </p>
            </div>

            <LibraryChartWindow indicatorKey="oscillator" indicatorLabel="Oscillator Matrix™" />

            <div className="feature-grid">
              <div className="feature-card">
                <div className="feature-icon">
                  <Brain size={20} />
                </div>
                <h4>{t('oscillatorMatrix.featureStatBrainTitle')}</h4>
                <p>
                  {t('oscillatorMatrix.featureStatBrainDesc')}
                </p>
              </div>

              <div className="feature-card">
                <div className="feature-icon">
                  <Layers size={20} />
                </div>
                <h4>{t('oscillatorMatrix.featureCoreOscTitle')}</h4>
                <p>
                  {t('oscillatorMatrix.featureCoreOscDesc')}
                </p>
              </div>

              <div className="feature-card">
                <div className="feature-icon">
                  <BarChart3 size={20} />
                </div>
                <h4>{t('oscillatorMatrix.featureAnalysisTableTitle')}</h4>
                <p>
                  {t('oscillatorMatrix.featureAnalysisTableDesc')}
                </p>
              </div>

              <div className="feature-card">
                <div className="feature-icon">
                  <Clock size={20} />
                </div>
                <h4>{t('oscillatorMatrix.featureDataDecayTitle')}</h4>
                <p>
                  {t('oscillatorMatrix.featureDataDecayDesc')}
                </p>
              </div>
            </div>

            <div className="bands-section">
              <h3>{t('oscillatorMatrix.dynamicBandsTitle')}</h3>
              <div className="bands-grid">
                <div className="band-card maroon">
                  <h4>{t('oscillatorMatrix.maroonBandTitle')}</h4>
                  <p>{t('oscillatorMatrix.maroonBandDesc')}</p>
                </div>
                <div className="band-card teal">
                  <h4>{t('oscillatorMatrix.tealBandTitle')}</h4>
                  <p>{t('oscillatorMatrix.tealBandDesc')}</p>
                </div>
              </div>
            </div>

            <div className="trading-strategy">
              <h3>{t('oscillatorMatrix.tradingStrategyTitle')}</h3>
              <div className="strategy-grid">
                <div className="strategy-card sell">
                  <h4>{t('oscillatorMatrix.sellSignalsTitle')}</h4>
                  <ol>
                    <li>{t('oscillatorMatrix.sellStep1')}</li>
                    <li>{t('oscillatorMatrix.sellStep2')}</li>
                    <li>{t('oscillatorMatrix.sellStep3')}</li>
                  </ol>
                </div>
                <div className="strategy-card buy">
                  <h4>{t('oscillatorMatrix.buySignalsTitle')}</h4>
                  <ol>
                    <li>{t('oscillatorMatrix.buyStep1')}</li>
                    <li>{t('oscillatorMatrix.buyStep2')}</li>
                    <li>{t('oscillatorMatrix.buyStep3')}</li>
                  </ol>
                </div>
              </div>
            </div>

            {/* Complete Settings Reference */}
            <div className="settings-section full-width">
              <h3>
                <Settings size={18} />
                {t('oscillatorMatrix.settingsTitle')}
              </h3>

              {/* Choose Main Oscillator */}
              <div className="settings-category">
                <button className="category-header" onClick={() => toggleSettings('om-oscillator')}>
                  <h4 className="category-title">{t('oscillatorMatrix.settingsOscillatorTitle')}</h4>
                  <ChevronDown size={18} className={`category-chevron ${expandedSettings.includes('om-oscillator') ? 'open' : ''}`} />
                </button>
                {expandedSettings.includes('om-oscillator') && (
                <div className="category-content">
                <div className="oscillator-grid">
                  <div className="oscillator-card">
                    <h5>{t('oscillatorMatrix.oscRSITitle')}</h5>
                    <p>{t('oscillatorMatrix.oscRSIDesc')}</p>
                    <span className="osc-default">Default Length: 14</span>
                  </div>
                  <div className="oscillator-card">
                    <h5>{t('oscillatorMatrix.oscMFITitle')}</h5>
                    <p>{t('oscillatorMatrix.oscMFIDesc')}</p>
                    <span className="osc-default">Default Length: 14</span>
                  </div>
                  <div className="oscillator-card">
                    <h5>Momentum</h5>
                    <p>{t('oscillatorMatrix.oscMomentumDesc')}</p>
                    <span className="osc-default">Default Length: 14</span>
                  </div>
                  <div className="oscillator-card">
                    <h5>Stochastic</h5>
                    <p>{t('oscillatorMatrix.oscStochasticDesc')}</p>
                    <span className="osc-default">Length: 14, %K Smooth: 1, %D Smooth: 3</span>
                  </div>
                  <div className="oscillator-card">
                    <h5>Stochastic RSI</h5>
                    <p>{t('oscillatorMatrix.oscStochRSIDesc')}</p>
                    <span className="osc-default">RSI: 14, Stoch: 14, %K: 3, %D: 3</span>
                  </div>
                  <div className="oscillator-card">
                    <h5>Chaikin Money Flow</h5>
                    <p>{t('oscillatorMatrix.oscCMFDesc')}</p>
                    <span className="osc-default">Default Length: 14</span>
                  </div>
                </div>
                </div>
                )}
              </div>

              {/* Algorithm Settings */}
              <div className="settings-category">
                <button className="category-header" onClick={() => toggleSettings('om-algorithm')}>
                  <h4 className="category-title">{t('oscillatorMatrix.settingsAlgorithmTitle')}</h4>
                  <ChevronDown size={18} className={`category-chevron ${expandedSettings.includes('om-algorithm') ? 'open' : ''}`} />
                </button>
                {expandedSettings.includes('om-algorithm') && (
                <div className="category-content">
                <div className="params-table">
                  <div className="param-row header">
                    <span>{t('table.parameter')}</span>
                    <span>{t('table.range')}</span>
                    <span>{t('table.default')}</span>
                    <span>{t('table.description')}</span>
                  </div>
                  <div className="param-row">
                    <span className="param-name">{t('oscillatorMatrix.algoPHPLName')}</span>
                    <span className="param-range">2 - 200</span>
                    <span className="param-default">21</span>
                    <span className="param-desc">{t('oscillatorMatrix.algoPHPLDesc')}</span>
                  </div>
                  <div className="param-row">
                    <span className="param-name">{t('oscillatorMatrix.algoLookbackName')}</span>
                    <span className="param-range">10 - 500</span>
                    <span className="param-default">100</span>
                    <span className="param-desc">{t('oscillatorMatrix.algoLookbackDesc')}</span>
                  </div>
                  <div className="param-row">
                    <span className="param-name">{t('oscillatorMatrix.algoPerfName')}</span>
                    <span className="param-range">On/Off</span>
                    <span className="param-default">On</span>
                    <span className="param-desc">{t('oscillatorMatrix.algoPerfDesc')}</span>
                  </div>
                  <div className="param-row">
                    <span className="param-name">{t('oscillatorMatrix.algoBarsName')}</span>
                    <span className="param-range">5 - 100</span>
                    <span className="param-default">20</span>
                    <span className="param-desc">{t('oscillatorMatrix.algoBarsDesc')}</span>
                  </div>
                  <div className="param-row">
                    <span className="param-name">{t('oscillatorMatrix.algoDecayName')}</span>
                    <span className="param-range">On/Off</span>
                    <span className="param-default">On</span>
                    <span className="param-desc">{t('oscillatorMatrix.algoDecayDesc')}</span>
                  </div>
                  <div className="param-row">
                    <span className="param-name">{t('oscillatorMatrix.algoDecayRateName')}</span>
                    <span className="param-range">0.1 - 1.0</span>
                    <span className="param-default">0.95</span>
                    <span className="param-desc">{t('oscillatorMatrix.algoDecayRateDesc')}</span>
                  </div>
                </div>
                </div>
                )}
              </div>

              {/* RSI Specific Settings */}
              <div className="settings-category">
                <button className="category-header" onClick={() => toggleSettings('om-rsi')}>
                  <h4 className="category-title">{t('oscillatorMatrix.settingsRSITitle')}</h4>
                  <ChevronDown size={18} className={`category-chevron ${expandedSettings.includes('om-rsi') ? 'open' : ''}`} />
                </button>
                {expandedSettings.includes('om-rsi') && (
                <div className="category-content">
                <div className="params-table">
                  <div className="param-row header">
                    <span>{t('table.parameter')}</span>
                    <span>{t('table.options')}</span>
                    <span>{t('table.default')}</span>
                    <span>{t('table.description')}</span>
                  </div>
                  <div className="param-row">
                    <span className="param-name">{t('oscillatorMatrix.rsiLengthName')}</span>
                    <span className="param-range">1+</span>
                    <span className="param-default">14</span>
                    <span className="param-desc">{t('oscillatorMatrix.rsiLengthDesc')}</span>
                  </div>
                  <div className="param-row">
                    <span className="param-name">{t('oscillatorMatrix.rsiSmoothingName')}</span>
                    <span className="param-range">On/Off</span>
                    <span className="param-default">Off</span>
                    <span className="param-desc">{t('oscillatorMatrix.rsiSmoothingDesc')}</span>
                  </div>
                  <div className="param-row">
                    <span className="param-name">{t('oscillatorMatrix.rsiSmoothTypeName')}</span>
                    <span className="param-range">6 Types</span>
                    <span className="param-default">SMA</span>
                    <span className="param-desc">SMA, SMA + BB, EMA, SMMA (RMA), WMA, VWMA</span>
                  </div>
                  <div className="param-row">
                    <span className="param-name">{t('oscillatorMatrix.rsiSmoothLengthName')}</span>
                    <span className="param-range">1+</span>
                    <span className="param-default">14</span>
                    <span className="param-desc">{t('oscillatorMatrix.rsiSmoothLengthDesc')}</span>
                  </div>
                  <div className="param-row">
                    <span className="param-name">{t('oscillatorMatrix.rsiBBStdDevName')}</span>
                    <span className="param-range">0.1+</span>
                    <span className="param-default">2.0</span>
                    <span className="param-desc">{t('oscillatorMatrix.rsiBBStdDevDesc')}</span>
                  </div>
                </div>
                </div>
                )}
              </div>

              {/* Stochastic Settings */}
              <div className="settings-category">
                <button className="category-header" onClick={() => toggleSettings('om-stochastic')}>
                  <h4 className="category-title">{t('oscillatorMatrix.settingsStochasticTitle')}</h4>
                  <ChevronDown size={18} className={`category-chevron ${expandedSettings.includes('om-stochastic') ? 'open' : ''}`} />
                </button>
                {expandedSettings.includes('om-stochastic') && (
                <div className="category-content">
                <div className="params-table">
                  <div className="param-row header">
                    <span>{t('table.parameter')}</span>
                    <span>{t('table.range')}</span>
                    <span>{t('table.default')}</span>
                    <span>{t('table.description')}</span>
                  </div>
                  <div className="param-row">
                    <span className="param-name">{t('oscillatorMatrix.stochLengthName')}</span>
                    <span className="param-range">1+</span>
                    <span className="param-default">14</span>
                    <span className="param-desc">{t('oscillatorMatrix.stochLengthDesc')}</span>
                  </div>
                  <div className="param-row">
                    <span className="param-name">{t('oscillatorMatrix.stochKSmoothName')}</span>
                    <span className="param-range">1+</span>
                    <span className="param-default">1</span>
                    <span className="param-desc">{t('oscillatorMatrix.stochKSmoothDesc')}</span>
                  </div>
                  <div className="param-row">
                    <span className="param-name">{t('oscillatorMatrix.stochShowDName')}</span>
                    <span className="param-range">On/Off</span>
                    <span className="param-default">Off</span>
                    <span className="param-desc">{t('oscillatorMatrix.stochShowDDesc')}</span>
                  </div>
                  <div className="param-row">
                    <span className="param-name">{t('oscillatorMatrix.stochDSmoothName')}</span>
                    <span className="param-range">1+</span>
                    <span className="param-default">3</span>
                    <span className="param-desc">{t('oscillatorMatrix.stochDSmoothDesc')}</span>
                  </div>
                </div>
                </div>
                )}
              </div>

              {/* Table Settings */}
              <div className="settings-category">
                <button className="category-header" onClick={() => toggleSettings('om-table')}>
                  <h4 className="category-title">{t('oscillatorMatrix.settingsTableTitle')}</h4>
                  <ChevronDown size={18} className={`category-chevron ${expandedSettings.includes('om-table') ? 'open' : ''}`} />
                </button>
                {expandedSettings.includes('om-table') && (
                <div className="category-content">
                <div className="params-table">
                  <div className="param-row header">
                    <span>{t('table.parameter')}</span>
                    <span>{t('table.options')}</span>
                    <span>{t('table.default')}</span>
                    <span>{t('table.description')}</span>
                  </div>
                  <div className="param-row">
                    <span className="param-name">{t('oscillatorMatrix.tableShowName')}</span>
                    <span className="param-range">On/Off</span>
                    <span className="param-default">Off</span>
                    <span className="param-desc">{t('oscillatorMatrix.tableShowDesc')}</span>
                  </div>
                  <div className="param-row">
                    <span className="param-name">{t('oscillatorMatrix.tableSizeName')}</span>
                    <span className="param-range">Tiny/Small/Normal/Large</span>
                    <span className="param-default">Small</span>
                    <span className="param-desc">{t('oscillatorMatrix.tableSizeDesc')}</span>
                  </div>
                </div>
                </div>
                )}
              </div>
            </div>

            {/* Technical: How the Statistical Brain Works */}
            <div className="technical-section">
              <h3>{t('oscillatorMatrix.technicalTitle')}</h3>
              <div className="algorithm-flow">
                <div className="algo-step">
                  <span className="algo-num">1</span>
                  <div>
                    <h5>{t('oscillatorMatrix.algoStep1Title')}</h5>
                    <p>{t('oscillatorMatrix.algoStep1Desc')}</p>
                  </div>
                </div>
                <div className="algo-step">
                  <span className="algo-num">2</span>
                  <div>
                    <h5>{t('oscillatorMatrix.algoStep2Title')}</h5>
                    <p>{t('oscillatorMatrix.algoStep2Desc')}</p>
                  </div>
                </div>
                <div className="algo-step">
                  <span className="algo-num">3</span>
                  <div>
                    <h5>{t('oscillatorMatrix.algoStep3Title')}</h5>
                    <p>{t('oscillatorMatrix.algoStep3Desc')}</p>
                  </div>
                </div>
                <div className="algo-step">
                  <span className="algo-num">4</span>
                  <div>
                    <h5>{t('oscillatorMatrix.algoStep4Title')}</h5>
                    <p>{t('oscillatorMatrix.algoStep4Desc')}</p>
                  </div>
                </div>
                <div className="algo-step">
                  <span className="algo-num">5</span>
                  <div>
                    <h5>{t('oscillatorMatrix.algoStep5Title')}</h5>
                    <p>{t('oscillatorMatrix.algoStep5Desc')}</p>
                  </div>
                </div>
                <div className="algo-step">
                  <span className="algo-num">6</span>
                  <div>
                    <h5>{t('oscillatorMatrix.algoStep6Title')}</h5>
                    <p>{t('oscillatorMatrix.algoStep6Desc')}</p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Technical Analysis */}
          <section id="technical-analysis" className="doc-section indicator-section">
            <div className="section-header">
              <div className="section-icon gradient-blue">
                <Cpu size={24} />
              </div>
              <div>
                <h2>FibAlgo® - Technical Analysis™</h2>
                <p>{t('technicalAnalysis.subtitle')}</p>
              </div>
            </div>

            <div className="indicator-overview">
              <p>
                {t('technicalAnalysis.overview')}
              </p>
            </div>

            <LibraryChartWindow indicatorKey="technicalAnalysis" indicatorLabel="Technical Analysis™" />

            <div className="modules-grid">
              <div className="module-card">
                <div className="module-icon">
                  <Brain size={24} />
                </div>
                <h4>{t('technicalAnalysis.moduleAIDashTitle')}</h4>
                <p>
                  {t('technicalAnalysis.moduleAIDashDesc')}
                </p>
              </div>

              <div className="module-card">
                <div className="module-icon">
                  <Target size={24} />
                </div>
                <h4>{t('technicalAnalysis.moduleSMCTitle')}</h4>
                <p>
                  {t('technicalAnalysis.moduleSMCDesc')}
                </p>
              </div>

              <div className="module-card">
                <div className="module-icon">
                  <Sparkles size={24} />
                </div>
                <h4>{t('technicalAnalysis.modulePredictiveTitle')}</h4>
                <p>
                  {t('technicalAnalysis.modulePredictiveDesc')}
                </p>
              </div>

              <div className="module-card">
                <div className="module-icon">
                  <LineChart size={24} />
                </div>
                <h4>{t('technicalAnalysis.moduleFibTitle')}</h4>
                <p>
                  {t('technicalAnalysis.moduleFibDesc')}
                </p>
              </div>

              <div className="module-card">
                <div className="module-icon">
                  <Activity size={24} />
                </div>
                <h4>{t('technicalAnalysis.moduleRSITitle')}</h4>
                <p>
                  {t('technicalAnalysis.moduleRSIDesc')}
                </p>
              </div>

              <div className="module-card">
                <div className="module-icon">
                  <Settings size={24} />
                </div>
                <h4>{t('technicalAnalysis.moduleConfigTitle')}</h4>
                <p>
                  {t('technicalAnalysis.moduleConfigDesc')}
                </p>
              </div>
            </div>

            <div className="smc-features">
              <h3>{t('technicalAnalysis.smcFeaturesTitle')}</h3>
              <div className="smc-grid">
                <div className="smc-item">
                  <span className="smc-tag">BOS</span>
                  <span>{t('technicalAnalysis.smcBOS')}</span>
                </div>
                <div className="smc-item">
                  <span className="smc-tag">CHOCH</span>
                  <span>{t('technicalAnalysis.smcCHOCH')}</span>
                </div>
                <div className="smc-item">
                  <span className="smc-tag">OB</span>
                  <span>{t('technicalAnalysis.smcOB')}</span>
                </div>
                <div className="smc-item">
                  <span className="smc-tag">FVG</span>
                  <span>{t('technicalAnalysis.smcFVG')}</span>
                </div>
                <div className="smc-item">
                  <span className="smc-tag">Killzones</span>
                  <span>{t('technicalAnalysis.smcKillzones')}</span>
                </div>
                <div className="smc-item">
                  <span className="smc-tag">Daily Bias</span>
                  <span>{t('technicalAnalysis.smcDailyBias')}</span>
                </div>
              </div>
            </div>

            {/* Complete Settings Reference */}
            <div className="settings-section full-width">
              <h3>
                <Settings size={18} />
                {t('technicalAnalysis.settingsTitle')}
              </h3>

              {/* Master Feature Switches */}
              <div className="settings-category">
                <button className="category-header" onClick={() => toggleSettings('ta-features')}>
                  <h4 className="category-title">{t('technicalAnalysis.settingsFeaturesTitle')}</h4>
                  <ChevronDown size={18} className={`category-chevron ${expandedSettings.includes('ta-features') ? 'open' : ''}`} />
                </button>
                {expandedSettings.includes('ta-features') && (
                <div className="category-content">
                <div className="params-table">
                  <div className="param-row header">
                    <span>{t('table.parameter')}</span>
                    <span>{t('table.default')}</span>
                    <span>{t('table.description')}</span>
                  </div>
                  <div className="param-row">
                    <span className="param-name">ICT Killzone</span>
                    <span className="param-default">Off</span>
                    <span className="param-desc">{t('technicalAnalysis.featKillzoneDesc')}</span>
                  </div>
                  <div className="param-row">
                    <span className="param-name">ICT Daily Bias</span>
                    <span className="param-default">Off</span>
                    <span className="param-desc">{t('technicalAnalysis.featDailyBiasDesc')}</span>
                  </div>
                  <div className="param-row">
                    <span className="param-name">Fibonacci Levels</span>
                    <span className="param-default">Off</span>
                    <span className="param-desc">{t('technicalAnalysis.featFibLevelsDesc')}</span>
                  </div>
                  <div className="param-row">
                    <span className="param-name">Time Zones</span>
                    <span className="param-default">Off</span>
                    <span className="param-desc">{t('technicalAnalysis.featTimeZonesDesc')}</span>
                  </div>
                  <div className="param-row">
                    <span className="param-name">Smart Money Concepts</span>
                    <span className="param-default">Off</span>
                    <span className="param-desc">{t('technicalAnalysis.featSMCDesc')}</span>
                  </div>
                  <div className="param-row">
                    <span className="param-name">Price Forecast</span>
                    <span className="param-default">Off</span>
                    <span className="param-desc">{t('technicalAnalysis.featForecastDesc')}</span>
                  </div>
                  <div className="param-row">
                    <span className="param-name">Technical Analysis</span>
                    <span className="param-default">Off</span>
                    <span className="param-desc">{t('technicalAnalysis.featTADesc')}</span>
                  </div>
                  <div className="param-row">
                    <span className="param-name">High and Low</span>
                    <span className="param-default">On</span>
                    <span className="param-desc">{t('technicalAnalysis.featHighLowDesc')}</span>
                  </div>
                  <div className="param-row">
                    <span className="param-name">AI-Threshold</span>
                    <span className="param-default">On</span>
                    <span className="param-desc">{t('technicalAnalysis.featAIThresholdDesc')}</span>
                  </div>
                  <div className="param-row">
                    <span className="param-name">Support/Resistance</span>
                    <span className="param-default">Off</span>
                    <span className="param-desc">{t('technicalAnalysis.featSRDesc')}</span>
                  </div>
                  <div className="param-row">
                    <span className="param-name">Trend Finder</span>
                    <span className="param-default">On</span>
                    <span className="param-desc">{t('technicalAnalysis.featTrendFinderDesc')}</span>
                  </div>
                  <div className="param-row">
                    <span className="param-name">RSI</span>
                    <span className="param-default">Off</span>
                    <span className="param-desc">{t('technicalAnalysis.featRSIDesc')}</span>
                  </div>
                </div>
                </div>
                )}
              </div>

              {/* Fibonacci Settings */}
              <div className="settings-category">
                <button className="category-header" onClick={() => toggleSettings('ta-fib')}>
                  <h4 className="category-title">{t('technicalAnalysis.settingsFibTitle')}</h4>
                  <ChevronDown size={18} className={`category-chevron ${expandedSettings.includes('ta-fib') ? 'open' : ''}`} />
                </button>
                {expandedSettings.includes('ta-fib') && (
                <div className="category-content">
                <div className="params-table">
                  <div className="param-row header">
                    <span>{t('technicalAnalysis.fibToolType')}</span>
                    <span>{t('technicalAnalysis.fibLevels')}</span>
                    <span>{t('table.description')}</span>
                  </div>
                  <div className="param-row">
                    <span className="param-name">{t('technicalAnalysis.fibPivotPoints')}</span>
                    <span className="param-range">Auto</span>
                    <span className="param-desc">{t('technicalAnalysis.fibPivotPointsDesc')}</span>
                  </div>
                  <div className="param-row">
                    <span className="param-name">{t('technicalAnalysis.fibRetracements')}</span>
                    <span className="param-range">0, 0.236, 0.382, 0.5, 0.618, 0.786, 1.0</span>
                    <span className="param-desc">{t('technicalAnalysis.fibRetracementsDesc')}</span>
                  </div>
                  <div className="param-row">
                    <span className="param-name">{t('technicalAnalysis.fibExtensions')}</span>
                    <span className="param-range">1.272, 1.618, 2.0, 2.618</span>
                    <span className="param-desc">{t('technicalAnalysis.fibExtensionsDesc')}</span>
                  </div>
                  <div className="param-row">
                    <span className="param-name">{t('technicalAnalysis.fibTimeZones')}</span>
                    <span className="param-range">Fibonacci sequence</span>
                    <span className="param-desc">{t('technicalAnalysis.fibTimeZonesDesc')}</span>
                  </div>
                </div>
                </div>
                )}
              </div>

              {/* HTF Auto Selection */}
              <div className="settings-category">
                <button className="category-header" onClick={() => toggleSettings('ta-htf')}>
                  <h4 className="category-title">{t('technicalAnalysis.settingsHTFTitle')}</h4>
                  <ChevronDown size={18} className={`category-chevron ${expandedSettings.includes('ta-htf') ? 'open' : ''}`} />
                </button>
                {expandedSettings.includes('ta-htf') && (
                <div className="category-content">
                <div className="params-table">
                  <div className="param-row header">
                    <span>{t('technicalAnalysis.htfCurrentTF')}</span>
                    <span>{t('technicalAnalysis.htfAutoHTF')}</span>
                    <span>{t('technicalAnalysis.htfLogic')}</span>
                  </div>
                  <div className="param-row">
                    <span className="param-name">{t('technicalAnalysis.htf1min')}</span>
                    <span className="param-default">{t('technicalAnalysis.htf1minHTF')}</span>
                    <span className="param-desc">{t('technicalAnalysis.htf1minLogic')}</span>
                  </div>
                  <div className="param-row">
                    <span className="param-name">{t('technicalAnalysis.htf3min')}</span>
                    <span className="param-default">{t('technicalAnalysis.htf3minHTF')}</span>
                    <span className="param-desc">{t('technicalAnalysis.htf3minLogic')}</span>
                  </div>
                  <div className="param-row">
                    <span className="param-name">{t('technicalAnalysis.htf5min')}</span>
                    <span className="param-default">{t('technicalAnalysis.htf5minHTF')}</span>
                    <span className="param-desc">{t('technicalAnalysis.htf5minLogic')}</span>
                  </div>
                  <div className="param-row">
                    <span className="param-name">{t('technicalAnalysis.htf15_60min')}</span>
                    <span className="param-default">{t('technicalAnalysis.htf15_60minHTF')}</span>
                    <span className="param-desc">{t('technicalAnalysis.htf15_60minLogic')}</span>
                  </div>
                  <div className="param-row">
                    <span className="param-name">{t('technicalAnalysis.htfDaily')}</span>
                    <span className="param-default">{t('technicalAnalysis.htfDailyHTF')}</span>
                    <span className="param-desc">{t('technicalAnalysis.htfDailyLogic')}</span>
                  </div>
                </div>
                </div>
                )}
              </div>

              {/* Alert System */}
              <div className="settings-category">
                <button className="category-header" onClick={() => toggleSettings('ta-alerts')}>
                  <h4 className="category-title">{t('technicalAnalysis.settingsAlertsTitle')}</h4>
                  <ChevronDown size={18} className={`category-chevron ${expandedSettings.includes('ta-alerts') ? 'open' : ''}`} />
                </button>
                {expandedSettings.includes('ta-alerts') && (
                <div className="category-content">
                <div className="params-table">
                  <div className="param-row header">
                    <span>{t('table.alertType')}</span>
                    <span>{t('table.default')}</span>
                    <span>{t('table.description')}</span>
                  </div>
                  <div className="param-row">
                    <span className="param-name">{t('technicalAnalysis.alertFibLevelsName')}</span>
                    <span className="param-default">Off</span>
                    <span className="param-desc">{t('technicalAnalysis.alertFibLevelsDesc')}</span>
                  </div>
                </div>
                </div>
                )}
              </div>
            </div>
          </section>

          {/* Footer */}
          <div className="docs-footer">
            <div className="footer-content">
              <p>
                {t('footer.helpText')}{' '}
                <a href="mailto:support@fibalgo.com">support@fibalgo.com</a>
              </p>
            </div>
          </div>
        </main>
      </div>

      <style jsx>{`
        /* Base Styles */
        .docs-container {
          min-height: 100vh;
          background: linear-gradient(180deg, #0a0a0f 0%, #0d0d15 100%);
          color: #fff;
          overflow-x: hidden;
        }

        /* Mobile Sticky Navbar - Hidden on Desktop */
        .mobile-navbar {
          display: none;
          position: sticky;
          top: 0;
          z-index: 100;
          background: rgba(10, 10, 15, 0.98);
          backdrop-filter: blur(10px);
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
          padding: 1rem 1rem 0.75rem;
          flex-direction: column;
          gap: 0.75rem;
        }

        .mobile-navbar-row1 {
          display: flex;
          align-items: center;
          padding-bottom: 0.75rem;
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        }

        .mobile-navbar-row2 {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }

        .mobile-logo {
          display: flex;
          align-items: center;
        }

        .mobile-hamburger {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 32px;
          height: 32px;
          background: transparent;
          border: none;
          color: rgba(255, 255, 255, 0.7);
          cursor: pointer;
          flex-shrink: 0;
        }
        .mobile-hamburger:hover {
          color: #fff;
        }

        .mobile-breadcrumb {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.85rem;
        }
        .breadcrumb-category {
          color: rgba(255, 255, 255, 0.5);
          white-space: nowrap;
        }
        .breadcrumb-page {
          color: #fff;
          font-weight: 600;
          white-space: nowrap;
        }
        .mobile-breadcrumb svg {
          color: rgba(255, 255, 255, 0.3);
          flex-shrink: 0;
        }

        /* Mobile Overlay */
        .mobile-overlay {
          display: none;
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.7);
          z-index: 998;
        }

        /* Sidebar Header Mobile */
        .sidebar-header-mobile {
          display: none;
          align-items: center;
          justify-content: space-between;
          padding: 1rem 1.25rem;
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
          margin-bottom: 1rem;
          background: rgba(0, 0, 0, 0.3);
        }
        .sidebar-logo-mobile {
          display: flex;
          align-items: center;
        }
        .sidebar-header-mobile button {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 40px;
          height: 40px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 0.5rem;
          color: rgba(255, 255, 255, 0.7);
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .sidebar-header-mobile button:hover {
          color: #fff;
          background: rgba(255, 255, 255, 0.1);
        }

        /* Hero Section */
        .docs-hero {
          padding: 3rem 2rem;
          padding-top: 5rem;
          display: grid;
          grid-template-columns: 1.5fr 1fr;
          gap: 3rem;
          max-width: 1400px;
          margin: 0 auto;
        }

        .hero-content {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
        }

        .hero-content p {
          font-size: 1.1rem;
          color: rgba(255, 255, 255, 0.65);
          line-height: 1.7;
          max-width: 600px;
          margin-top: 1.5rem;
        }

        .hero-logo {
          display: inline-block;
          margin-bottom: 2.5rem;
          text-decoration: none;
          line-height: 0;
        }
        .hero-logo img {
          display: block;
        }

        .hero-badge {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.5rem 1rem;
          background: rgba(0, 245, 255, 0.1);
          border: 1px solid rgba(0, 245, 255, 0.2);
          border-radius: 2rem;
          font-size: 0.85rem;
          color: #00f5ff;
          margin-top: 1.5rem;
        }

        .hero-actions {
          display: flex;
          gap: 1rem;
          margin-top: 2rem;
          flex-wrap: wrap;
        }

        .btn-primary {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.875rem 1.5rem;
          background: linear-gradient(135deg, #00f5ff 0%, #00a8ff 100%);
          color: #000;
          font-weight: 600;
          border-radius: 0.75rem;
          text-decoration: none;
          transition: all 0.2s ease;
        }

        .btn-primary:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 20px rgba(0, 245, 255, 0.3);
        }

        .btn-secondary {
          display: inline-flex;
          align-items: center;
          padding: 0.875rem 1.5rem;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          color: #fff;
          border-radius: 0.75rem;
          text-decoration: none;
          transition: all 0.2s ease;
        }

        .btn-secondary:hover {
          background: rgba(255, 255, 255, 0.1);
        }

        /* Quick Start Card */
        .quick-start-card {
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 1.25rem;
          padding: 1.5rem;
        }

        .card-header {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          margin-bottom: 1.25rem;
          color: #00f5ff;
        }

        .card-header h3 {
          margin: 0;
          font-size: 1.1rem;
        }

        .quick-steps {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .quick-step {
          display: flex;
          gap: 1rem;
          align-items: flex-start;
        }

        .step-number {
          width: 28px;
          height: 28px;
          border-radius: 50%;
          background: linear-gradient(135deg, #00f5ff 0%, #00a8ff 100%);
          color: #000;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          font-size: 0.85rem;
          flex-shrink: 0;
        }

        .step-content h4 {
          margin: 0 0 0.25rem;
          font-size: 0.95rem;
        }

        .step-content p {
          margin: 0;
          font-size: 0.85rem;
          color: rgba(255, 255, 255, 0.6);
          line-height: 1.5;
        }

        /* Layout */
        .docs-layout {
          display: grid;
          grid-template-columns: 280px 1fr;
          max-width: 1400px;
          margin: 0 auto;
          gap: 2rem;
          padding: 0 2rem 4rem;
          align-items: start;
        }

        /* Sidebar */
        .docs-sidebar {
          position: sticky;
          top: 1.5rem;
          align-self: start;
          width: 280px;
          height: fit-content;
          max-height: calc(100vh - 2rem);
          overflow-y: auto;
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid rgba(255, 255, 255, 0.06);
          border-radius: 1rem;
          padding: 1.25rem;
        }

        @media (min-width: 1025px) {
          .docs-layout {
            grid-template-columns: 1fr;
          }
          .docs-sidebar {
            position: fixed;
            left: 2rem;
            top: 1.5rem;
            height: calc(100vh - 3rem);
            max-height: calc(100vh - 3rem);
          }
          .docs-hero {
            margin-left: 320px;
          }
          .docs-content {
            margin-left: 320px;
          }
        }

        .sidebar-search {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.75rem 1rem;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 0.75rem;
          margin-bottom: 1.5rem;
        }

        .sidebar-search input {
          background: none;
          border: none;
          color: #fff;
          font-size: 0.9rem;
          width: 100%;
          outline: none;
        }

        .sidebar-search input::placeholder {
          color: rgba(255, 255, 255, 0.4);
        }

        .sidebar-home-link {
          display: flex;
          flex-direction: row;
          align-items: center;
          gap: 0.5rem;
          padding: 0.6rem 0.75rem;
          padding-left: calc(1rem + 0.75rem);
          margin: 0 0 0.75rem 0;
          background: none;
          border: none;
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
          color: #00f5ff;
          font-size: 0.85rem;
          font-weight: 500;
          text-decoration: none;
          transition: all 0.2s ease;
        }
        .sidebar-home-link:hover {
          color: #fff;
        }
        .sidebar-home-link svg {
          flex-shrink: 0;
        }

        .sidebar-nav {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .nav-section {
          margin-bottom: 0.5rem;
        }

        .nav-section-header {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          width: 100%;
          padding: 0.75rem;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.06);
          border-radius: 0.5rem;
          color: #fff;
          font-size: 0.9rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .nav-section-header:hover {
          background: rgba(255, 255, 255, 0.06);
        }

        .nav-section-header span {
          flex: 1;
          text-align: left;
        }

        .nav-items {
          padding: 0.5rem 0 0 1rem;
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }

        .nav-item {
          padding: 0.6rem 0.75rem;
          background: none;
          border: none;
          color: rgba(255, 255, 255, 0.6);
          font-size: 0.85rem;
          text-align: left;
          cursor: pointer;
          border-radius: 0.4rem;
          transition: all 0.2s ease;
        }

        .nav-item:hover {
          color: #fff;
          background: rgba(255, 255, 255, 0.05);
        }

        .nav-item.active {
          color: #00f5ff;
          background: rgba(0, 245, 255, 0.1);
        }

        .sidebar-footer {
          margin-top: 2rem;
          padding-top: 1rem;
          border-top: 1px solid rgba(255, 255, 255, 0.08);
        }

        .sidebar-footer a {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          color: rgba(255, 255, 255, 0.5);
          font-size: 0.85rem;
          text-decoration: none;
          transition: color 0.2s ease;
        }

        .sidebar-footer a:hover {
          color: #00f5ff;
        }

        /* Main Content */
        .docs-content {
          display: flex;
          flex-direction: column;
          gap: 3rem;
          min-width: 0;
          overflow: hidden;
        }

        .doc-section {
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid rgba(255, 255, 255, 0.06);
          border-radius: 1.25rem;
          padding: 2rem;
          min-width: 0;
          overflow: hidden;
        }

        .section-header {
          display: flex;
          gap: 1rem;
          align-items: flex-start;
          margin-bottom: 2rem;
          padding-bottom: 1.5rem;
          border-bottom: 1px solid rgba(255, 255, 255, 0.06);
        }

        .section-icon {
          width: 48px;
          height: 48px;
          border-radius: 0.75rem;
          background: rgba(0, 245, 255, 0.15);
          color: #00f5ff;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .section-icon.gradient-cyan { background: linear-gradient(135deg, rgba(0, 245, 255, 0.2), rgba(0, 168, 255, 0.2)); }
        .section-icon.gradient-purple { background: linear-gradient(135deg, rgba(168, 85, 247, 0.2), rgba(139, 92, 246, 0.2)); color: #a855f7; }
        .section-icon.gradient-orange { background: linear-gradient(135deg, rgba(251, 146, 60, 0.2), rgba(249, 115, 22, 0.2)); color: #fb923c; }
        .section-icon.gradient-green { background: linear-gradient(135deg, rgba(34, 197, 94, 0.2), rgba(16, 185, 129, 0.2)); color: #22c55e; }
        .section-icon.gradient-pink { background: linear-gradient(135deg, rgba(236, 72, 153, 0.2), rgba(219, 39, 119, 0.2)); color: #ec4899; }
        .section-icon.gradient-blue { background: linear-gradient(135deg, rgba(59, 130, 246, 0.2), rgba(37, 99, 235, 0.2)); color: #3b82f6; }

        .section-header h2 { margin: 0; font-size: 1.5rem; }
        .section-header p { margin: 0.25rem 0 0; color: rgba(255, 255, 255, 0.6); }

        /* Steps Grid */
        .steps-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1.5rem; }
        .step-card { background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 1rem; padding: 1.5rem; }
        .step-card.featured { background: linear-gradient(135deg, rgba(0, 245, 255, 0.08), rgba(0, 168, 255, 0.05)); border-color: rgba(0, 245, 255, 0.2); }
        .step-badge { display: inline-block; padding: 0.35rem 0.75rem; background: rgba(0, 245, 255, 0.15); color: #00f5ff; font-size: 0.75rem; font-weight: 600; border-radius: 1rem; margin-bottom: 1rem; }
        .step-card h3 { margin: 0 0 0.75rem; font-size: 1.1rem; }
        .step-card p { margin: 0; color: rgba(255, 255, 255, 0.7); line-height: 1.6; font-size: 0.95rem; }
        .step-link { display: inline-flex; align-items: center; gap: 0.5rem; margin-top: 1rem; color: #00f5ff; text-decoration: none; font-size: 0.9rem; font-weight: 500; }
        .email-box { margin-top: 1rem; padding: 0.75rem 1rem; background: rgba(0, 245, 255, 0.1); border: 1px solid rgba(0, 245, 255, 0.2); border-radius: 0.5rem; }
        .email-box a { color: #00f5ff; text-decoration: none; font-weight: 500; }
        .note-box { display: flex; align-items: flex-start; gap: 0.5rem; margin-top: 1rem; padding: 0.75rem; background: rgba(251, 191, 36, 0.1); border: 1px solid rgba(251, 191, 36, 0.2); border-radius: 0.5rem; color: #fbbf24; font-size: 0.85rem; }
        .note-box.warning { background: rgba(251, 191, 36, 0.1); border-color: rgba(251, 191, 36, 0.2); color: #fbbf24; }

        /* Instruction Steps */
        .instruction-steps { display: flex; flex-direction: column; gap: 1rem; }
        .instruction-step { display: flex; gap: 1rem; padding: 1.25rem; background: rgba(255, 255, 255, 0.02); border: 1px solid rgba(255, 255, 255, 0.06); border-radius: 0.75rem; }
        .instruction-number { width: 32px; height: 32px; border-radius: 50%; background: linear-gradient(135deg, #00f5ff, #00a8ff); color: #000; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 0.9rem; flex-shrink: 0; }
        .instruction-content h4 { margin: 0 0 0.5rem; font-size: 1rem; }
        .instruction-content p { margin: 0; color: rgba(255, 255, 255, 0.7); line-height: 1.6; }

        /* Section Divider */
        .section-divider { display: flex; align-items: center; gap: 1rem; padding: 1rem 0; color: #00f5ff; font-weight: 600; }
        .section-divider::before, .section-divider::after { content: ''; flex: 1; height: 1px; background: linear-gradient(90deg, transparent, rgba(0, 245, 255, 0.3), transparent); }

        /* Indicator Sections */
        .indicator-section { background: linear-gradient(135deg, rgba(255, 255, 255, 0.02), rgba(255, 255, 255, 0.01)); }
        .indicator-overview { padding: 1.5rem; background: rgba(255, 255, 255, 0.03); border-radius: 0.75rem; margin-bottom: 2rem; }
        .indicator-overview p { margin: 0; color: rgba(255, 255, 255, 0.8); line-height: 1.7; font-size: 1.05rem; }

        /* Feature Grid */
        .feature-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 1.25rem; margin-bottom: 2rem; }
        .feature-card { padding: 1.25rem; background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 255, 255, 0.06); border-radius: 0.75rem; }
        .feature-icon { width: 40px; height: 40px; border-radius: 0.5rem; background: rgba(0, 245, 255, 0.15); color: #00f5ff; display: flex; align-items: center; justify-content: center; margin-bottom: 1rem; }
        .feature-card h4 { margin: 0 0 0.5rem; font-size: 1rem; }
        .feature-card p { margin: 0; color: rgba(255, 255, 255, 0.65); font-size: 0.9rem; line-height: 1.6; }

        /* Concept Section */
        .concept-section { margin-bottom: 2rem; }
        .concept-section h3 { margin: 0 0 1.25rem; font-size: 1.25rem; }
        .concept-card { padding: 1.5rem; background: rgba(255, 255, 255, 0.02); border: 1px solid rgba(255, 255, 255, 0.06); border-radius: 0.75rem; margin-bottom: 1rem; }
        .concept-card h4 { margin: 0 0 0.75rem; color: #00f5ff; }
        .concept-card p { margin: 0; color: rgba(255, 255, 255, 0.7); line-height: 1.6; }
        .concept-details { display: grid; gap: 1rem; margin-top: 1rem; }
        .detail-item { padding: 1rem; background: rgba(255, 255, 255, 0.02); border-radius: 0.5rem; }
        .badge { display: inline-block; padding: 0.25rem 0.75rem; border-radius: 1rem; font-size: 0.75rem; font-weight: 600; margin-bottom: 0.5rem; }
        .badge.green { background: rgba(34, 197, 94, 0.2); color: #22c55e; }
        .badge.red { background: rgba(239, 68, 68, 0.2); color: #ef4444; }

        /* Trading Strategy */
        .trading-strategy { margin-bottom: 2rem; }
        .trading-strategy h3 { margin: 0 0 1.25rem; font-size: 1.25rem; }
        .strategy-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 1.25rem; }
        .strategy-card { padding: 1.5rem; border-radius: 0.75rem; }
        .strategy-card.buy { background: linear-gradient(135deg, rgba(34, 197, 94, 0.1), rgba(34, 197, 94, 0.05)); border: 1px solid rgba(34, 197, 94, 0.2); }
        .strategy-card.sell { background: linear-gradient(135deg, rgba(239, 68, 68, 0.1), rgba(239, 68, 68, 0.05)); border: 1px solid rgba(239, 68, 68, 0.2); }
        .strategy-card h4 { display: flex; align-items: center; gap: 0.5rem; margin: 0 0 1rem; }
        .strategy-card.buy h4 { color: #22c55e; }
        .strategy-card.sell h4 { color: #ef4444; }
        .strategy-card p { margin: 0; color: rgba(255, 255, 255, 0.7); line-height: 1.6; }
        .strategy-card ol { margin: 0; padding-left: 1.25rem; color: rgba(255, 255, 255, 0.7); line-height: 1.8; }
        .rotate-180 { transform: rotate(180deg); }

        /* Settings Section */
        .settings-section { padding: 1.5rem; background: rgba(255, 255, 255, 0.02); border: 1px solid rgba(255, 255, 255, 0.06); border-radius: 0.75rem; }
        .settings-section h3 { display: flex; align-items: center; gap: 0.5rem; margin: 0 0 1.25rem; color: rgba(255, 255, 255, 0.9); }
        .settings-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 1rem; }
        .setting-item { padding: 1rem; background: rgba(255, 255, 255, 0.02); border-radius: 0.5rem; }
        .setting-item h5 { margin: 0 0 0.5rem; font-size: 0.9rem; color: #00f5ff; }
        .setting-item p { margin: 0; font-size: 0.85rem; color: rgba(255, 255, 255, 0.6); line-height: 1.5; }

        /* Dual Pivot Grid */
        .dual-pivot-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 1.25rem; margin-top: 1rem; }
        .pivot-card { padding: 1.25rem; background: rgba(168, 85, 247, 0.1); border: 1px solid rgba(168, 85, 247, 0.2); border-radius: 0.75rem; }
        .pivot-card h4 { margin: 0 0 0.75rem; color: #a855f7; }
        .pivot-card p { margin: 0; color: rgba(255, 255, 255, 0.7); line-height: 1.6; }

        /* Zones */
        .zones-section { margin-bottom: 2rem; }
        .zones-section h3 { margin: 0 0 1rem; }
        .zones-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 1rem; }
        .zone-card { padding: 1.25rem; border-radius: 0.75rem; }
        .zone-card.noise { background: rgba(156, 163, 175, 0.1); border: 1px solid rgba(156, 163, 175, 0.2); }
        .zone-card.confidence { background: rgba(34, 197, 94, 0.1); border: 1px solid rgba(34, 197, 94, 0.2); }
        .zone-card h4 { margin: 0 0 0.5rem; font-size: 0.95rem; }
        .zone-card.noise h4 { color: #9ca3af; }
        .zone-card.confidence h4 { color: #22c55e; }
        .zone-card p { margin: 0; font-size: 0.9rem; color: rgba(255, 255, 255, 0.6); }

        /* Visuals */
        .visuals-section { margin-bottom: 2rem; }
        .visuals-section h3 { margin: 0 0 1rem; }
        .visual-items { display: flex; flex-direction: column; gap: 0.75rem; }
        .visual-item { display: flex; gap: 1rem; align-items: center; padding: 0.75rem 1rem; background: rgba(255, 255, 255, 0.02); border-radius: 0.5rem; }
        .visual-label { padding: 0.25rem 0.75rem; background: rgba(168, 85, 247, 0.2); color: #a855f7; border-radius: 1rem; font-size: 0.8rem; font-weight: 500; white-space: nowrap; }
        .visual-item p { margin: 0; color: rgba(255, 255, 255, 0.7); font-size: 0.9rem; }

        /* Columns Section */
        .columns-section { margin-bottom: 2rem; }
        .columns-section h3 { margin: 0 0 1rem; }
        .columns-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem; }
        .column-card { padding: 1rem; background: rgba(255, 255, 255, 0.02); border: 1px solid rgba(255, 255, 255, 0.06); border-radius: 0.5rem; }
        .column-card.highlight { background: linear-gradient(135deg, rgba(0, 245, 255, 0.1), rgba(0, 168, 255, 0.05)); border-color: rgba(0, 245, 255, 0.2); }
        .column-card h4 { margin: 0 0 0.5rem; font-size: 0.95rem; }
        .column-card.highlight h4 { color: #00f5ff; }
        .column-card p { margin: 0; font-size: 0.85rem; color: rgba(255, 255, 255, 0.6); }

        /* Workflow */
        .workflow-section { margin-bottom: 2rem; }
        .workflow-section h3 { margin: 0 0 1.25rem; }
        .workflow-steps { display: flex; flex-direction: column; gap: 1rem; }
        .workflow-step { display: flex; gap: 1rem; padding: 1.25rem; background: rgba(255, 255, 255, 0.02); border: 1px solid rgba(255, 255, 255, 0.06); border-radius: 0.75rem; }
        .workflow-number { width: 36px; height: 36px; border-radius: 50%; background: linear-gradient(135deg, #fb923c, #f97316); color: #000; display: flex; align-items: center; justify-content: center; font-weight: 700; flex-shrink: 0; }
        .workflow-step h4 { margin: 0 0 0.25rem; }
        .workflow-step p { margin: 0; color: rgba(255, 255, 255, 0.65); font-size: 0.9rem; }

        /* Breakout Section */
        .breakout-section { margin-bottom: 2rem; }
        .breakout-section h3 { margin: 0 0 1rem; }
        .breakout-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem; }
        .breakout-card { padding: 1.25rem; border-radius: 0.75rem; text-align: center; }
        .breakout-card.strong { background: linear-gradient(135deg, rgba(34, 197, 94, 0.15), rgba(34, 197, 94, 0.08)); border: 1px solid rgba(34, 197, 94, 0.3); }
        .breakout-card.normal { background: rgba(255, 255, 255, 0.05); border: 1px solid rgba(255, 255, 255, 0.1); }
        .breakout-card.weak { background: linear-gradient(135deg, rgba(251, 191, 36, 0.15), rgba(251, 191, 36, 0.08)); border: 1px solid rgba(251, 191, 36, 0.3); }
        .breakout-card h4 { margin: 0 0 0.5rem; }
        .breakout-card.strong h4 { color: #22c55e; }
        .breakout-card.weak h4 { color: #fbbf24; }
        .breakout-card p { margin: 0; font-size: 0.85rem; color: rgba(255, 255, 255, 0.6); }

        /* Bands Section */
        .bands-section { margin-bottom: 2rem; }
        .bands-section h3 { margin: 0 0 1rem; }
        .bands-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 1.25rem; }
        .band-card { padding: 1.25rem; border-radius: 0.75rem; }
        .band-card.maroon { background: linear-gradient(135deg, rgba(127, 29, 29, 0.3), rgba(127, 29, 29, 0.15)); border: 1px solid rgba(153, 27, 27, 0.4); }
        .band-card.teal { background: linear-gradient(135deg, rgba(13, 148, 136, 0.3), rgba(13, 148, 136, 0.15)); border: 1px solid rgba(20, 184, 166, 0.4); }
        .band-card h4 { margin: 0 0 0.5rem; }
        .band-card.maroon h4 { color: #dc2626; }
        .band-card.teal h4 { color: #14b8a6; }
        .band-card p { margin: 0; color: rgba(255, 255, 255, 0.7); font-size: 0.9rem; line-height: 1.5; }

        /* Modules Grid */
        .modules-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1.25rem; margin-bottom: 2rem; }
        .module-card { padding: 1.5rem; background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 255, 255, 0.06); border-radius: 0.75rem; }
        .module-icon { width: 48px; height: 48px; border-radius: 0.75rem; background: linear-gradient(135deg, rgba(59, 130, 246, 0.2), rgba(37, 99, 235, 0.15)); color: #3b82f6; display: flex; align-items: center; justify-content: center; margin-bottom: 1rem; }
        .module-card h4 { margin: 0 0 0.5rem; }
        .module-card p { margin: 0; color: rgba(255, 255, 255, 0.65); font-size: 0.9rem; line-height: 1.5; }

        /* SMC Features */
        .smc-features { padding: 1.5rem; background: rgba(59, 130, 246, 0.05); border: 1px solid rgba(59, 130, 246, 0.15); border-radius: 0.75rem; }
        .smc-features h3 { margin: 0 0 1rem; color: #3b82f6; }
        .smc-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.75rem; }
        .smc-item { display: flex; align-items: center; gap: 0.75rem; padding: 0.75rem; background: rgba(255, 255, 255, 0.03); border-radius: 0.5rem; }
        .smc-tag { padding: 0.25rem 0.6rem; background: rgba(59, 130, 246, 0.2); color: #3b82f6; font-size: 0.75rem; font-weight: 600; border-radius: 0.25rem; }
        .smc-item span:last-child { color: rgba(255, 255, 255, 0.7); font-size: 0.85rem; }

        /* Parameter Tables */
        .params-table { 
          display: flex; 
          flex-direction: column; 
          gap: 0.5rem; 
          margin-top: 1rem; 
        }
        .param-row { 
          display: grid; 
          grid-template-columns: 180px 100px 100px 1fr; 
          gap: 1rem; 
          padding: 0.75rem 1rem; 
          background: rgba(255, 255, 255, 0.02); 
          border-radius: 0.5rem;
          align-items: center;
        }
        .param-row.header { 
          background: rgba(0, 245, 255, 0.1); 
          font-weight: 600; 
          color: #00f5ff;
          border: 1px solid rgba(0, 245, 255, 0.2);
        }
        .param-row.highlight { 
          background: rgba(34, 197, 94, 0.1); 
          border: 1px solid rgba(34, 197, 94, 0.2); 
        }
        .param-row.optional { 
          opacity: 0.7; 
        }
        .param-name { 
          font-family: 'Monaco', 'Menlo', 'Consolas', monospace; 
          font-size: 0.85rem; 
          color: #fb923c; 
        }
        .param-range { 
          font-size: 0.8rem; 
          color: rgba(255, 255, 255, 0.5); 
        }
        .param-default { 
          font-size: 0.85rem; 
          color: #22c55e; 
          font-weight: 500; 
        }
        .param-desc { 
          font-size: 0.85rem; 
          color: rgba(255, 255, 255, 0.7); 
        }

        /* Settings Category - Accordion Style */
        .settings-category { 
          margin-bottom: 1rem; 
          background: rgba(255, 255, 255, 0.02); 
          border: 1px solid rgba(255, 255, 255, 0.06); 
          border-radius: 0.75rem;
          overflow: hidden;
        }
        .category-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 1rem 1.5rem;
          cursor: pointer;
          transition: background 0.2s ease;
          border: none;
          background: transparent;
          width: 100%;
          text-align: left;
        }
        .category-header:hover {
          background: rgba(255, 255, 255, 0.03);
        }
        .category-title { 
          font-size: 1rem; 
          font-weight: 500; 
          color: rgba(255, 255, 255, 0.9); 
          margin: 0;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }
        .category-title::before {
          content: '';
          display: none;
        }
        .category-chevron {
          color: rgba(255, 255, 255, 0.5);
          transition: transform 0.3s ease;
        }
        .category-chevron.open {
          transform: rotate(180deg);
        }
        .category-content {
          padding: 0 1.5rem 1.5rem;
        }

        /* Oscillator Grid */
        .oscillator-grid { 
          display: grid; 
          grid-template-columns: repeat(3, 1fr); 
          gap: 1rem; 
          margin: 1.5rem 0;
        }
        .oscillator-card { 
          padding: 1.25rem; 
          background: linear-gradient(135deg, rgba(168, 85, 247, 0.1), rgba(139, 92, 246, 0.05)); 
          border: 1px solid rgba(168, 85, 247, 0.2); 
          border-radius: 0.75rem;
          text-align: center;
        }
        .oscillator-card h5 { 
          margin: 0 0 0.5rem; 
          color: #a855f7; 
          font-size: 0.95rem;
        }
        .osc-default { 
          font-size: 0.8rem; 
          color: rgba(255, 255, 255, 0.6); 
        }

        /* Algorithm Flow */
        .algorithm-flow { 
          display: flex; 
          flex-direction: column; 
          gap: 1rem; 
          margin: 1.5rem 0;
          padding: 1.5rem;
          background: linear-gradient(135deg, rgba(0, 245, 255, 0.05), rgba(0, 168, 255, 0.02));
          border: 1px solid rgba(0, 245, 255, 0.15);
          border-radius: 0.75rem;
        }
        .algo-step { 
          display: flex; 
          align-items: flex-start; 
          gap: 1rem;
          padding: 1rem;
          background: rgba(255, 255, 255, 0.03);
          border-radius: 0.5rem;
        }
        .algo-num { 
          width: 28px; 
          height: 28px; 
          border-radius: 50%; 
          background: linear-gradient(135deg, #00f5ff, #00a8ff); 
          color: #000; 
          display: flex; 
          align-items: center; 
          justify-content: center; 
          font-weight: 700; 
          font-size: 0.8rem; 
          flex-shrink: 0;
        }
        .algo-step p { 
          margin: 0; 
          color: rgba(255, 255, 255, 0.8); 
          line-height: 1.6;
          font-size: 0.9rem;
        }

        /* Formula Box */
        .formula-box { 
          padding: 1.25rem 1.5rem; 
          background: rgba(0, 0, 0, 0.3); 
          border: 1px solid rgba(255, 255, 255, 0.1); 
          border-radius: 0.5rem; 
          font-family: 'Monaco', 'Menlo', 'Consolas', monospace; 
          font-size: 0.9rem; 
          color: #00f5ff;
          overflow-x: auto;
          margin: 1rem 0;
        }

        /* State Grid */
        .state-grid { 
          display: grid; 
          grid-template-columns: repeat(3, 1fr); 
          gap: 1rem; 
          margin: 1rem 0;
        }
        .state-item { 
          padding: 1rem; 
          background: rgba(255, 255, 255, 0.03); 
          border: 1px solid rgba(255, 255, 255, 0.08); 
          border-radius: 0.5rem;
          text-align: center;
        }
        .state-code { 
          font-family: 'Monaco', 'Menlo', 'Consolas', monospace; 
          font-size: 1.5rem; 
          font-weight: 700; 
          color: #00f5ff;
          display: block;
          margin-bottom: 0.5rem;
        }
        .state-name { 
          font-weight: 600; 
          color: rgba(255, 255, 255, 0.9);
          display: block;
          margin-bottom: 0.25rem;
        }
        .state-desc { 
          font-size: 0.8rem; 
          color: rgba(255, 255, 255, 0.5);
        }

        /* Stats Grid */
        .stats-grid { 
          display: grid; 
          grid-template-columns: repeat(2, 1fr); 
          gap: 1rem; 
          margin: 1rem 0;
        }
        .stats-item { 
          padding: 1rem; 
          background: rgba(34, 197, 94, 0.1); 
          border: 1px solid rgba(34, 197, 94, 0.2); 
          border-radius: 0.5rem;
        }
        .stats-label { 
          font-weight: 600; 
          color: #22c55e;
          font-size: 0.9rem;
          display: block;
          margin-bottom: 0.25rem;
        }
        .stats-desc { 
          font-size: 0.85rem; 
          color: rgba(255, 255, 255, 0.7);
        }

        /* Text Utilities */
        .strong-text { color: #22c55e; }
        .weak-text { color: #fbbf24; }

        /* Footer */
        .docs-footer { padding: 2rem; background: rgba(255, 255, 255, 0.02); border: 1px solid rgba(255, 255, 255, 0.06); border-radius: 1rem; text-align: center; }
        .footer-content p { margin: 0; color: rgba(255, 255, 255, 0.6); }
        .footer-content a { color: #00f5ff; text-decoration: none; }
        .footer-content a:hover { text-decoration: underline; }

        /* Responsive - Tablet */
        @media (max-width: 1200px) {
          .docs-hero { grid-template-columns: 1fr; }
          .modules-grid { grid-template-columns: repeat(2, 1fr); }
          .smc-grid { grid-template-columns: repeat(2, 1fr); }
          .oscillator-grid { grid-template-columns: repeat(2, 1fr); }
          .state-grid { grid-template-columns: repeat(2, 1fr); }
          .param-row { grid-template-columns: 150px 80px 80px 1fr; font-size: 0.85rem; }
        }

        @media (max-width: 1024px) {
          /* Show mobile navbar */
          .mobile-navbar {
            display: flex;
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
          }
          .mobile-overlay {
            display: block;
          }
          .sidebar-header-mobile {
            display: flex;
          }

          .docs-layout { grid-template-columns: 1fr; padding-top: 5.5rem; }
          .docs-sidebar { 
            position: fixed;
            top: 0;
            left: 0;
            width: 85%;
            max-width: 320px;
            height: 100%;
            min-height: 100vh;
            min-height: 100dvh;
            overflow-y: auto;
            z-index: 999;
            transform: translateX(-100%);
            transition: transform 0.3s ease;
            border-radius: 0;
            border: none;
            border-right: 1px solid rgba(255, 255, 255, 0.1);
            background: #0a0a0f;
            padding: 0;
            display: flex;
            flex-direction: column;
          }
          .docs-sidebar.mobile-open {
            transform: translateX(0);
          }
          .docs-sidebar .sidebar-header-mobile {
            flex-shrink: 0;
          }
          .docs-sidebar .sidebar-search {
            margin: 0 1rem 1rem;
            border-radius: 0.5rem;
            flex-shrink: 0;
          }
          .docs-sidebar .sidebar-home-link {
            display: flex !important;
            flex-direction: row !important;
            align-items: center !important;
            margin: 0 0 0.75rem 1rem;
            padding: 0.6rem 0.75rem;
            padding-left: calc(1rem + 0.75rem);
            border-bottom: 1px solid rgba(255, 255, 255, 0.1);
            flex-shrink: 0;
          }
          .docs-sidebar .sidebar-nav {
            padding: 0 1rem 2rem;
            flex: 1;
          }
          .steps-grid { grid-template-columns: 1fr; }
          .feature-grid, .strategy-grid, .settings-grid, .dual-pivot-grid, .zones-grid, .bands-grid { grid-template-columns: 1fr; }
          .columns-grid, .breakout-grid { grid-template-columns: repeat(2, 1fr); }
          .modules-grid { grid-template-columns: 1fr; }
          .smc-grid { grid-template-columns: repeat(2, 1fr); }
          .oscillator-grid { grid-template-columns: repeat(2, 1fr); }
          .stats-grid { grid-template-columns: 1fr; }
        }

        /* Mobile - Primary Focus */
        @media (max-width: 768px) {
          /* Hide Hero on Mobile */
          .docs-hero {
            display: none;
          }

          /* Quick Start Card Mobile */
          .quick-start-card {
            padding: 1rem;
          }
          .card-header h3 {
            font-size: 1rem;
          }
          .quick-step {
            padding: 0.75rem;
          }
          .step-number {
            width: 24px;
            height: 24px;
            font-size: 0.75rem;
          }
          .step-content h4 {
            font-size: 0.9rem;
          }
          .step-content p {
            font-size: 0.8rem;
          }

          /* Main Content Mobile */
          .docs-layout {
            padding: 0 0.75rem 2rem;
            overflow-x: hidden;
          }
          .docs-content {
            gap: 1.5rem;
          }

          /* Sections Mobile */
          .doc-section {
            padding: 1.25rem 1rem;
            border-radius: 0.75rem;
          }
          .section-header {
            flex-direction: column;
            align-items: flex-start;
            gap: 0.75rem;
          }
          .section-icon {
            width: 40px;
            height: 40px;
          }
          .section-header h2 {
            font-size: 1.25rem;
          }
          .section-header p {
            font-size: 0.85rem;
          }

          /* Steps Grid Mobile */
          .step-card {
            padding: 1rem;
          }
          .step-badge {
            font-size: 0.7rem;
            padding: 0.25rem 0.5rem;
          }
          .step-card h3 {
            font-size: 1rem;
          }
          .step-card p {
            font-size: 0.85rem;
          }
          .step-link {
            font-size: 0.85rem;
            padding: 0.5rem 1rem;
          }

          /* Instruction Steps Mobile */
          .instruction-step {
            gap: 0.75rem;
          }
          .instruction-number {
            width: 28px;
            height: 28px;
            font-size: 0.85rem;
          }
          .instruction-content h4 {
            font-size: 0.95rem;
          }
          .instruction-content p {
            font-size: 0.85rem;
          }

          /* Note Boxes Mobile */
          .note-box {
            padding: 0.75rem;
            font-size: 0.8rem;
            flex-direction: column;
            align-items: flex-start;
            gap: 0.5rem;
          }

          /* Indicator Cards Mobile */
          .indicator-overview p {
            font-size: 0.9rem;
          }
          .feature-card, .module-card {
            padding: 1rem;
          }
          .feature-card h4, .module-card h4 {
            font-size: 0.95rem;
          }
          .feature-card p, .module-card p {
            font-size: 0.85rem;
          }
          .feature-icon, .module-icon {
            width: 36px;
            height: 36px;
          }

          /* Settings Section Mobile */
          .settings-section {
            padding: 1rem;
          }
          .settings-section h3 {
            font-size: 1rem;
            gap: 0.5rem;
          }
          .settings-category {
            border-radius: 0.5rem;
          }
          .category-header {
            padding: 0.75rem 1rem;
          }
          .category-title {
            font-size: 0.9rem;
          }
          .category-content {
            padding: 0 1rem 1rem;
          }

          /* Params Table Mobile - Card Style */
          .params-table {
            font-size: 0.85rem;
            gap: 0.75rem;
          }
          .param-row { 
            display: flex;
            flex-direction: column;
            gap: 0.5rem;
            padding: 1rem;
            background: rgba(255, 255, 255, 0.03);
            border: 1px solid rgba(255, 255, 255, 0.08);
            border-radius: 0.75rem;
          }
          .param-row.header { display: none; }
          .param-name {
            font-weight: 600;
            color: #00f5ff;
            font-size: 0.95rem;
            font-family: inherit;
            margin-bottom: 0.25rem;
          }
          .param-range {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            font-size: 0.85rem;
          }
          .param-range::before { 
            content: 'Range:'; 
            color: rgba(255, 255, 255, 0.5); 
            font-weight: 500;
            min-width: 60px;
          }
          .param-default {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            font-size: 0.85rem;
          }
          .param-default::before { 
            content: 'Default:'; 
            color: rgba(255, 255, 255, 0.5); 
            font-weight: 500;
            min-width: 60px;
          }
          .param-desc {
            font-size: 0.85rem;
            color: rgba(255, 255, 255, 0.7);
            margin-top: 0.5rem;
            padding-top: 0.5rem;
            border-top: 1px solid rgba(255, 255, 255, 0.06);
            line-height: 1.5;
          }

          /* Grids Mobile */
          .oscillator-grid { grid-template-columns: 1fr; }
          .state-grid { grid-template-columns: 1fr; }
          .smc-grid { grid-template-columns: 1fr; gap: 0.5rem; }
          .columns-grid, .breakout-grid { grid-template-columns: 1fr; }

          /* SMC Items Mobile */
          .smc-item {
            padding: 0.6rem 0.75rem;
          }
          .smc-tag {
            font-size: 0.7rem;
            padding: 0.2rem 0.4rem;
          }

          /* Algorithm Flow Mobile */
          .algorithm-flow {
            padding: 1rem;
          }
          .algo-step {
            padding: 0.75rem;
            flex-direction: column;
            gap: 0.5rem;
          }
          .algo-num {
            width: 24px;
            height: 24px;
            font-size: 0.75rem;
          }
          .algo-step p {
            font-size: 0.85rem;
          }

          /* Formula Box Mobile */
          .formula-box {
            padding: 1rem;
            font-size: 0.8rem;
          }

          /* State Items Mobile */
          .state-item {
            padding: 0.75rem;
          }
          .state-code {
            font-size: 1.25rem;
          }
          .state-name {
            font-size: 0.9rem;
          }
          .state-desc {
            font-size: 0.75rem;
          }

          /* Oscillator Card Mobile */
          .oscillator-card {
            padding: 1rem;
          }
          .oscillator-card h5 {
            font-size: 0.9rem;
          }
          .oscillator-card p {
            font-size: 0.8rem;
          }
          .osc-default {
            font-size: 0.75rem;
          }

          /* Bands Section Mobile */
          .band-card {
            padding: 1rem;
          }
          .band-card h4 {
            font-size: 0.95rem;
          }
          .band-card p {
            font-size: 0.85rem;
          }

          /* Strategy Cards Mobile */
          .strategy-card {
            padding: 1rem;
          }
          .strategy-card h4 {
            font-size: 1rem;
          }
          .strategy-card ol {
            font-size: 0.85rem;
            padding-left: 1.25rem;
          }

          /* Trading Strategy Mobile */
          .trading-strategy h3 {
            font-size: 1rem;
          }

          /* Footer Mobile */
          .docs-footer {
            padding: 1.25rem;
            border-radius: 0.75rem;
          }
          .footer-content p {
            font-size: 0.85rem;
          }
        }

        /* Small Mobile */
        @media (max-width: 480px) {
          .docs-hero {
            padding: 1rem 0.75rem;
          }
          .hero-logo img {
            width: 160px !important;
          }
          .hero-content p {
            font-size: 0.9rem;
          }
          .quick-start-card {
            padding: 0.75rem;
          }
          .docs-layout {
            padding: 0 0.5rem 1.5rem;
          }
          .doc-section {
            padding: 1rem 0.75rem;
          }
          .section-header h2 {
            font-size: 1.1rem;
          }
          .settings-section {
            padding: 0.75rem;
          }
          .category-header {
            padding: 0.6rem 0.75rem;
          }
          .category-content {
            padding: 0 0.75rem 0.75rem;
          }
          .param-row {
            padding: 0.6rem;
          }
        }
      `}</style>
    </div>
  );
}
