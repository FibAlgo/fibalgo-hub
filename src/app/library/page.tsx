'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
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

// Navigation structure
const navigation = [
  {
    title: 'Getting Started',
    icon: Compass,
    items: [
      { id: 'getting-access', label: 'Getting Access' },
      { id: 'setup-website', label: 'Setup Indicators (Website)' },
      { id: 'setup-mobile', label: 'Set Up FibAlgo (Mobile)' },
      { id: 'desktop-notifications', label: 'Desktop Notifications' },
      { id: 'mobile-notifications', label: 'Mobile Notifications' },
    ],
  },
  {
    title: 'FibAlgo® Indicators',
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

// Quick Start Steps
const quickStartSteps = [
  {
    step: 1,
    title: 'Choose Your Plan',
    description: 'Select Basic, Premium, or Ultimate based on your trading needs.',
    icon: CheckCircle,
  },
  {
    step: 2,
    title: 'Create Account',
    description: 'Sign up and complete your subscription. Access is granted automatically.',
    icon: ArrowRight,
  },
  {
    step: 3,
    title: 'Start Trading!',
    description: 'Ultimate plan users get TradingView indicators automatically. Check Invite-Only Scripts.',
    icon: Play,
  },
];

export default function LibraryPage() {
  const [activeSection, setActiveSection] = useState('getting-access');
  const [expandedNav, setExpandedNav] = useState<string[]>(['Getting Started', 'FibAlgo® Indicators']);
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

  // Show loading state until client hydration is complete
  if (!mounted) {
    return (
      <div className="docs-container" style={{ 
        minHeight: '100vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        background: '#0a0a0f'
      }}>
        <div style={{ textAlign: 'center' }}>
          <Image 
            src="/logo-white.svg" 
            alt="FibAlgo" 
            width={200} 
            height={56}
            priority
          />
        </div>
      </div>
    );
  }

  return (
    <div className="docs-container">
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
            Documentation
          </div>
          <p>
            Complete guide to FibAlgo indicators. Learn setup, configuration, and trading strategies
            for all our premium TradingView tools.
          </p>
        </div>

        {/* Quick Start Card */}
        <div className="quick-start-card">
          <div className="card-header">
            <Zap size={20} />
            <h3>Quick Start Guide</h3>
          </div>
          <div className="quick-steps">
            {quickStartSteps.map((step) => (
              <div key={step.step} className="quick-step">
                <div className="step-number">{step.step}</div>
                <div className="step-content">
                  <h4>{step.title}</h4>
                  <p>{step.description}</p>
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
              placeholder="Search docs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <Link href="/" className="sidebar-home-link" style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '0.5rem', marginLeft: '1rem', paddingLeft: '0.75rem', marginBottom: '0.5rem' }}>
            <Home size={16} style={{ flexShrink: 0 }} />
            <span style={{ display: 'inline' }}>Home</span>
          </Link>

          <Link href="/#pricing" className="sidebar-home-link" style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '0.5rem', marginLeft: '1rem', paddingLeft: '0.75rem', marginBottom: '1rem' }}>
            <Crown size={16} style={{ flexShrink: 0 }} />
            <span style={{ display: 'inline' }}>Plans</span>
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
                <h2>Getting Access</h2>
                <p>Get Started with FibAlgo in 3 Simple Steps</p>
              </div>
            </div>

            <div className="steps-grid">
              <div className="step-card featured">
                <div className="step-badge">Step 1</div>
                <h3>Choose Your Plan</h3>
                <p>
                  Visit our pricing page to explore available subscription options. 
                  Select the plan that best fits your trading needs.
                </p>
                <Link href="/#pricing" className="step-link">
                  View Pricing Plans
                </Link>
              </div>

              <div className="step-card">
                <div className="step-badge">Step 2</div>
                <h3>Create Your Account</h3>
                <p>
                  Click &ldquo;Subscribe Now&rdquo; on your chosen plan. Complete the signup process
                  and payment. Your account will be activated automatically - no manual setup required.
                </p>
              </div>

              <div className="step-card">
                <div className="step-badge">Step 3</div>
                <h3>Start Trading!</h3>
                <p>
                  Access the features included in your plan. For TradingView indicator access,
                  go to Indicators then Invite-Only Scripts to find them.
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
                <h2>Setup Indicators (Website)</h2>
                <p>Enable FibAlgo indicators on TradingView desktop</p>
              </div>
            </div>

            <div className="instruction-steps">
              <div className="instruction-step">
                <div className="instruction-number">1</div>
                <div className="instruction-content">
                  <h4>Launch TradingView</h4>
                  <p>After subscribing to any FibAlgo plan, go to TradingView and launch any chart.</p>
                </div>
              </div>

              <div className="instruction-step">
                <div className="instruction-number">2</div>
                <div className="instruction-content">
                  <h4>Open Indicators</h4>
                  <p>Click the &ldquo;Indicators&rdquo; tab at the top of the chart.</p>
                </div>
              </div>

              <div className="instruction-step">
                <div className="instruction-number">3</div>
                <div className="instruction-content">
                  <h4>Access Invite-Only Scripts</h4>
                  <p>Click the &ldquo;Invite-only Scripts&rdquo; section in the indicators panel.</p>
                </div>
              </div>

              <div className="instruction-step">
                <div className="instruction-number">4</div>
                <div className="instruction-content">
                  <h4>Add to Chart</h4>
                  <p>
                    You now have access to all of the FibAlgo Premium Indicators. To add them to
                    your chart, simply click the indicator you would like to use.
                  </p>
                  <div className="note-box warning">
                    <AlertCircle size={14} />
                    <span>Free TradingView users are only allowed to have a maximum of 3 indicators on their chart at once.</span>
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
                <h2>Set Up FibAlgo (Mobile)</h2>
                <p>Access your indicators inside the TradingView mobile app</p>
              </div>
            </div>

            <div className="instruction-steps">
              <div className="instruction-step">
                <div className="instruction-number">1</div>
                <div className="instruction-content">
                  <h4>Open TradingView App</h4>
                  <p>Launch the TradingView app on your mobile device and open up any chart.</p>
                </div>
              </div>

              <div className="instruction-step">
                <div className="instruction-number">2</div>
                <div className="instruction-content">
                  <h4>Access Settings</h4>
                  <p>Click the &ldquo;Settings&rdquo; button on the bottom of your screen.</p>
                </div>
              </div>

              <div className="instruction-step">
                <div className="instruction-number">3</div>
                <div className="instruction-content">
                  <h4>Open Indicators</h4>
                  <p>Click the &ldquo;Indicators&rdquo; button.</p>
                </div>
              </div>

              <div className="instruction-step">
                <div className="instruction-number">4</div>
                <div className="instruction-content">
                  <h4>Find Invite-Only Scripts</h4>
                  <p>Click the &ldquo;Invite-only Scripts&rdquo; section.</p>
                </div>
              </div>

              <div className="instruction-step">
                <div className="instruction-number">5</div>
                <div className="instruction-content">
                  <h4>Add Indicators</h4>
                  <p>
                    You now have access to all of the FibAlgo Premium Indicators. Tap the indicator
                    you would like to use.
                  </p>
                  <div className="note-box warning">
                    <AlertCircle size={14} />
                    <span>Free TradingView users are only allowed to have a maximum of 2 indicators on their chart at once on mobile.</span>
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
                <h2>Set Up Desktop Notifications</h2>
                <p>Configure alerts for TradingView desktop</p>
              </div>
            </div>

            <div className="instruction-steps">
              <div className="instruction-step">
                <div className="instruction-number">1</div>
                <div className="instruction-content">
                  <h4>Add Indicator to Chart</h4>
                  <p>Make sure the indicator you want to receive alerts from is on your chart.</p>
                </div>
              </div>

              <div className="instruction-step">
                <div className="instruction-number">2</div>
                <div className="instruction-content">
                  <h4>Open Indicator Settings</h4>
                  <p>Go to the settings of the indicator for which you want to create an alert.</p>
                </div>
              </div>

              <div className="instruction-step">
                <div className="instruction-number">3</div>
                <div className="instruction-content">
                  <h4>Select Alert Signals</h4>
                  <p>
                    You can select the signal you want to alert in this section. Please note that the
                    signals you select in this settings section will only be sent as alerts.
                  </p>
                </div>
              </div>

              <div className="instruction-step">
                <div className="instruction-number">4</div>
                <div className="instruction-content">
                  <h4>Save Settings</h4>
                  <p>After selecting the desired signals, press the &apos;OK&apos; button to save these settings.</p>
                </div>
              </div>

              <div className="instruction-step">
                <div className="instruction-number">5</div>
                <div className="instruction-content">
                  <h4>Access Alert Menu</h4>
                  <p>Click on the indicator and click the &apos;...&apos; icon.</p>
                </div>
              </div>

              <div className="instruction-step">
                <div className="instruction-number">6</div>
                <div className="instruction-content">
                  <h4>Add Alert</h4>
                  <p>Select the &ldquo;Add alert on ...&rdquo; option.</p>
                </div>
              </div>

              <div className="instruction-step">
                <div className="instruction-number">7</div>
                <div className="instruction-content">
                  <h4>Customize Alert</h4>
                  <p>You can customize your alert settings here according to your preferences.</p>
                </div>
              </div>

              <div className="instruction-step">
                <div className="instruction-number">8</div>
                <div className="instruction-content">
                  <h4>Create Alert</h4>
                  <p>Click &ldquo;Create Alert&rdquo; to finalize and activate your notification.</p>
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
                <h2>Set Up Mobile Notifications</h2>
                <p>Configure alerts for TradingView mobile app</p>
              </div>
            </div>

            <div className="instruction-steps">
              <div className="instruction-step">
                <div className="instruction-number">1</div>
                <div className="instruction-content">
                  <h4>Add Indicator to Chart</h4>
                  <p>Make sure the indicator you want to receive alerts from is on your chart.</p>
                </div>
              </div>

              <div className="instruction-step">
                <div className="instruction-number">2</div>
                <div className="instruction-content">
                  <h4>Open Indicator Settings</h4>
                  <p>Go to the settings of the indicator for which you want to create an alert.</p>
                </div>
              </div>

              <div className="instruction-step">
                <div className="instruction-number">3</div>
                <div className="instruction-content">
                  <h4>Select Alert Signals</h4>
                  <p>
                    You can select the signal you want to alert in this section. Please note that the
                    signals you select in this settings section will only be sent as alerts.
                  </p>
                </div>
              </div>

              <div className="instruction-step">
                <div className="instruction-number">4</div>
                <div className="instruction-content">
                  <h4>Save Settings</h4>
                  <p>After selecting the desired signals, press the &apos;OK&apos; button to save these settings.</p>
                </div>
              </div>

              <div className="instruction-step">
                <div className="instruction-number">5</div>
                <div className="instruction-content">
                  <h4>Access Alert Menu</h4>
                  <p>Tap on the indicator and tap the &apos;...&apos; icon.</p>
                </div>
              </div>

              <div className="instruction-step">
                <div className="instruction-number">6</div>
                <div className="instruction-content">
                  <h4>Add Alert</h4>
                  <p>Select the &ldquo;Add alert on ...&rdquo; option.</p>
                </div>
              </div>

              <div className="instruction-step">
                <div className="instruction-number">7</div>
                <div className="instruction-content">
                  <h4>Customize Alert</h4>
                  <p>You can customize your alert settings here according to your preferences.</p>
                </div>
              </div>

              <div className="instruction-step">
                <div className="instruction-number">8</div>
                <div className="instruction-content">
                  <h4>Create Alert</h4>
                  <p>Tap &ldquo;Create Alert&rdquo; to finalize and activate your notification.</p>
                </div>
              </div>
            </div>
          </section>

          {/* Indicators Section Divider */}
          <div className="section-divider">
            <Layers size={20} />
            <span>FibAlgo® Premium Indicators</span>
          </div>

          {/* Perfect Entry Zone */}
          <section id="perfect-entry-zone" className="doc-section indicator-section">
            <div className="section-header">
              <div className="section-icon gradient-cyan">
                <Radar size={24} />
              </div>
              <div>
                <h2>FibAlgo® - Perfect Entry Zone™</h2>
                <p>Adaptive Fibonacci System with Dynamic S/R Zones</p>
              </div>
            </div>

            <div className="indicator-overview">
              <p>
                FibAlgo® - Perfect Entry Zone™ is a comprehensive, multi-layered technical analysis tool
                designed to give traders a definitive edge in the market. It goes beyond simple indicators
                by combining four powerful systems into one cohesive interface.
              </p>
            </div>

            <div className="feature-grid">
              <div className="feature-card">
                <div className="feature-icon">
                  <Brain size={20} />
                </div>
                <h4>Adaptive Fibonacci System</h4>
                <p>
                  Instead of using fixed settings, its &ldquo;brain&rdquo; analyzes historical price action to find the
                  most statistically relevant Fibonacci levels for the current market conditions.
                </p>
              </div>

              <div className="feature-card">
                <div className="feature-icon">
                  <TrendingUp size={20} />
                </div>
                <h4>Dynamic S/R Zones</h4>
                <p>
                  Visually identifies &ldquo;Perfect Entry Zones&rdquo; that dynamically flip from resistance to
                  support (and vice-versa) based on price breakthroughs.
                </p>
              </div>

              <div className="feature-card">
                <div className="feature-icon">
                  <Clock size={20} />
                </div>
                <h4>Perfect Time Zones</h4>
                <p>
                  Using the Fibonacci sequence, projects future time zones where market volatility and
                  potential trend reversals are more likely to occur.
                </p>
              </div>

              <div className="feature-card">
                <div className="feature-icon">
                  <Gauge size={20} />
                </div>
                <h4>Market Pressure Gauge</h4>
                <p>
                  Real-time visualization of buying versus selling power, measuring the underlying momentum
                  and potential exhaustion points.
                </p>
              </div>
            </div>

            <div className="concept-section">
              <h3>Core Concepts</h3>

              <div className="concept-card">
                <h4>A. The Adaptive Engine (The &ldquo;Brain&rdquo;)</h4>
                <p>
                  This is the indicator&apos;s most powerful feature. Most indicators use a fixed lookback period
                  (e.g., &ldquo;14&rdquo; or &ldquo;50&rdquo;), which may not be suitable for all market conditions. FibAlgo&apos;s
                  adaptive system intelligently tests numerous lookback periods to identify which one has
                  historically predicted market reversals with the highest accuracy.
                </p>
              </div>

              <div className="concept-card">
                <h4>B. The Support/Resistance Flip</h4>
                <div className="concept-details">
                  <div className="detail-item">
                    <span className="badge green">Uptrend</span>
                    <p>
                      The indicator first identifies a potential resistance area as a <strong>RED BOX</strong>.
                      If the price breaks decisively through this red zone, the trend is confirmed as strong.
                      The indicator then &ldquo;flips&rdquo; this box&apos;s color to <strong>GREEN</strong>. This former
                      resistance has now become a new support level, presenting a potential long entry opportunity
                      on a retest.
                    </p>
                  </div>
                  <div className="detail-item">
                    <span className="badge red">Downtrend</span>
                    <p>
                      A potential support area first appears as a <strong>GREEN BOX</strong>. If the price
                      breaks down through this green zone, the bearish trend is strong. The indicator flips
                      the box to <strong>RED</strong>, turning the old support into new resistance.
                    </p>
                  </div>
                </div>
              </div>

              <div className="concept-card">
                <h4>C. Confidence %</h4>
                <p>
                  Each &ldquo;Perfect Entry Zone&rdquo; comes with a Confidence percentage. This score answers a simple
                  question: &ldquo;Historically, how often has the market reacted to this specific price area?&rdquo;
                  A higher percentage indicates that the zone is more statistically significant.
                </p>
              </div>
            </div>

            <div className="trading-strategy">
              <h3>How to Use for Trading</h3>
              <div className="strategy-grid">
                <div className="strategy-card buy">
                  <h4>
                    <TrendingUp size={18} />
                    Buy Signals (Long Entry)
                  </h4>
                  <p>
                    During an uptrend, watch for the price to break above and close through a RED (Resistance)
                    Zone. The indicator will then flip this zone to GREEN (Support). The primary long entry
                    signal occurs when the price pulls back to retest this newly formed GREEN zone.
                  </p>
                </div>
                <div className="strategy-card sell">
                  <h4>
                    <TrendingUp size={18} className="rotate-180" />
                    Sell Signals (Short Entry)
                  </h4>
                  <p>
                    During a downtrend, watch for the price to break below and close through a GREEN (Support)
                    Zone. The indicator will flip this zone to RED (Resistance). The primary short entry signal
                    occurs when the price pulls back to retest this newly formed RED zone.
                  </p>
                </div>
              </div>
            </div>

            {/* Complete Settings Reference */}
            <div className="settings-section full-width">
              <h3>
                <Settings size={18} />
                Complete Settings Reference
              </h3>

              {/* Main Settings */}
              <div className="settings-category">
                <button className="category-header" onClick={() => toggleSettings('pez-main')}>
                  <h4 className="category-title">Main Settings</h4>
                  <ChevronDown size={18} className={`category-chevron ${expandedSettings.includes('pez-main') ? 'open' : ''}`} />
                </button>
                {expandedSettings.includes('pez-main') && (
                <div className="category-content">
                <div className="params-table">
                  <div className="param-row header">
                    <span>Parameter</span>
                    <span>Range</span>
                    <span>Default</span>
                    <span>Description</span>
                  </div>
                  <div className="param-row">
                    <span className="param-name">Fibonacci Period</span>
                    <span className="param-range">21 - 200</span>
                    <span className="param-default">144</span>
                    <span className="param-desc">Controls pivot detection sensitivity. Higher = major trends, lower = short-term swings. Uses Fibonacci numbers (21, 34, 55, 89, 144).</span>
                  </div>
                  <div className="param-row">
                    <span className="param-name">Fibonacci Analysis Set</span>
                    <span className="param-range">SET1-SET4</span>
                    <span className="param-default">SET2: Advanced Harmonic</span>
                    <span className="param-desc">Pre-configured Fibonacci level combinations. SET1: Classic, SET2: Advanced Harmonic, SET3: Extended, SET4: Precision.</span>
                  </div>
                </div>
                </div>
                )}
              </div>

              {/* Adaptive S/R System */}
              <div className="settings-category">
                <button className="category-header" onClick={() => toggleSettings('pez-adaptive-sr')}>
                  <h4 className="category-title">Adaptive S/R System</h4>
                  <ChevronDown size={18} className={`category-chevron ${expandedSettings.includes('pez-adaptive-sr') ? 'open' : ''}`} />
                </button>
                {expandedSettings.includes('pez-adaptive-sr') && (
                <div className="category-content">
                <div className="params-table">
                  <div className="param-row header">
                    <span>Parameter</span>
                    <span>Range</span>
                    <span>Default</span>
                    <span>Description</span>
                  </div>
                  <div className="param-row">
                    <span className="param-name">Enable Adaptive S/R Lookback</span>
                    <span className="param-range">On/Off</span>
                    <span className="param-default">On</span>
                    <span className="param-desc">When enabled, the &ldquo;brain&rdquo; automatically finds the optimal lookback period by testing multiple values.</span>
                  </div>
                  <div className="param-row">
                    <span className="param-name">Manual S/R Lookback</span>
                    <span className="param-range">1 - 144</span>
                    <span className="param-default">55</span>
                    <span className="param-desc">Fixed lookback period when Adaptive mode is OFF. Use Fibonacci numbers for best results.</span>
                  </div>
                  <div className="param-row">
                    <span className="param-name">Min S/R Lookback to Test</span>
                    <span className="param-range">10 - 34</span>
                    <span className="param-default">13</span>
                    <span className="param-desc">Minimum lookback period the adaptive system will test. Lower = faster signals.</span>
                  </div>
                  <div className="param-row">
                    <span className="param-name">Max S/R Lookback to Test</span>
                    <span className="param-range">34 - 200</span>
                    <span className="param-default">144</span>
                    <span className="param-desc">Maximum lookback period the adaptive system will test. Higher = more reliable signals.</span>
                  </div>
                </div>
                </div>
                )}
              </div>

              {/* Adaptive Time System */}
              <div className="settings-category">
                <button className="category-header" onClick={() => toggleSettings('pez-adaptive-time')}>
                  <h4 className="category-title">Adaptive Time System</h4>
                  <ChevronDown size={18} className={`category-chevron ${expandedSettings.includes('pez-adaptive-time') ? 'open' : ''}`} />
                </button>
                {expandedSettings.includes('pez-adaptive-time') && (
                <div className="category-content">
                <div className="params-table">
                  <div className="param-row header">
                    <span>Parameter</span>
                    <span>Range</span>
                    <span>Default</span>
                    <span>Description</span>
                  </div>
                  <div className="param-row">
                    <span className="param-name">Show Time Zone</span>
                    <span className="param-range">On/Off</span>
                    <span className="param-default">On</span>
                    <span className="param-desc">Display Fibonacci Time Zone backgrounds on chart.</span>
                  </div>
                  <div className="param-row">
                    <span className="param-name">Enable Time Adaptive Lookback</span>
                    <span className="param-range">On/Off</span>
                    <span className="param-default">On</span>
                    <span className="param-desc">Auto-optimize time zone lookback periods.</span>
                  </div>
                  <div className="param-row">
                    <span className="param-name">Manual Time Lookback</span>
                    <span className="param-range">1 - 144</span>
                    <span className="param-default">55</span>
                    <span className="param-desc">Fixed time lookback when adaptive is OFF.</span>
                  </div>
                  <div className="param-row">
                    <span className="param-name">Min/Max Time Lookback</span>
                    <span className="param-range">13 - 144</span>
                    <span className="param-default">13 / 144</span>
                    <span className="param-desc">Range for adaptive time system testing.</span>
                  </div>
                </div>
                </div>
                )}
              </div>

              {/* Visibility Settings */}
              <div className="settings-category">
                <button className="category-header" onClick={() => toggleSettings('pez-visibility')}>
                  <h4 className="category-title">Visibility Settings</h4>
                  <ChevronDown size={18} className={`category-chevron ${expandedSettings.includes('pez-visibility') ? 'open' : ''}`} />
                </button>
                {expandedSettings.includes('pez-visibility') && (
                <div className="category-content">
                <div className="params-table">
                  <div className="param-row header">
                    <span>Parameter</span>
                    <span>Options</span>
                    <span>Default</span>
                    <span>Description</span>
                  </div>
                  <div className="param-row">
                    <span className="param-name">Show Pivot Lines</span>
                    <span className="param-range">On/Off</span>
                    <span className="param-default">Off</span>
                    <span className="param-desc">Display ZigZag pivot connection lines.</span>
                  </div>
                  <div className="param-row">
                    <span className="param-name">Trend Line</span>
                    <span className="param-range">On/Off + Color</span>
                    <span className="param-default">On (White)</span>
                    <span className="param-desc">Show current trend direction line.</span>
                  </div>
                  <div className="param-row">
                    <span className="param-name">Levels Line</span>
                    <span className="param-range">On/Off</span>
                    <span className="param-default">On</span>
                    <span className="param-desc">Display Fibonacci level lines.</span>
                  </div>
                  <div className="param-row">
                    <span className="param-name">Labels Position</span>
                    <span className="param-range">Left / Right</span>
                    <span className="param-default">Left</span>
                    <span className="param-desc">Position of Fibonacci level labels.</span>
                  </div>
                  <div className="param-row">
                    <span className="param-name">Box Labels Position</span>
                    <span className="param-range">Left / Mid / Right</span>
                    <span className="param-default">Mid</span>
                    <span className="param-desc">Position of zone box labels.</span>
                  </div>
                  <div className="param-row">
                    <span className="param-name">Font Sizes</span>
                    <span className="param-range">8-18 / Tiny-Large</span>
                    <span className="param-default">12 / Normal</span>
                    <span className="param-desc">Fibonacci values and label font sizes.</span>
                  </div>
                </div>
                </div>
                )}
              </div>

              {/* How to Calculate */}
              <div className="settings-category">
                <button className="category-header" onClick={() => toggleSettings('pez-debug')}>
                  <h4 className="category-title">How to Calculate (Debug)</h4>
                  <ChevronDown size={18} className={`category-chevron ${expandedSettings.includes('pez-debug') ? 'open' : ''}`} />
                </button>
                {expandedSettings.includes('pez-debug') && (
                <div className="category-content">
                <div className="params-table">
                  <div className="param-row header">
                    <span>Parameter</span>
                    <span>Type</span>
                    <span>Default</span>
                    <span>Description</span>
                  </div>
                  <div className="param-row">
                    <span className="param-name">Show Pivot Fib Values</span>
                    <span className="param-range">On/Off</span>
                    <span className="param-default">Off</span>
                    <span className="param-desc">Display calculated Fibonacci values at each pivot.</span>
                  </div>
                  <div className="param-row">
                    <span className="param-name">Show Pivot Time Fib Ranges</span>
                    <span className="param-range">On/Off</span>
                    <span className="param-default">Off</span>
                    <span className="param-desc">Show time-based Fibonacci ranges.</span>
                  </div>
                  <div className="param-row">
                    <span className="param-name">Show Fibonacci Time Zones</span>
                    <span className="param-range">On/Off</span>
                    <span className="param-default">Off</span>
                    <span className="param-desc">Display projected time zone markers.</span>
                  </div>
                </div>
                </div>
                )}
              </div>
            </div>

            {/* Zone States Explanation */}
            <div className="technical-section">
              <h3>Technical: Zone State Management</h3>
              <p>The indicator tracks three distinct states for each zone:</p>
              <div className="state-grid">
                <div className="state-item">
                  <span className="state-code">State 0</span>
                  <span className="state-name">Inactive</span>
                  <span className="state-desc">Zone is not currently active</span>
                </div>
                <div className="state-item">
                  <span className="state-code">State 1</span>
                  <span className="state-name">Sell Mode (Red)</span>
                  <span className="state-desc">Zone acting as resistance</span>
                </div>
                <div className="state-item">
                  <span className="state-code">State 2</span>
                  <span className="state-name">Buy Mode (Green)</span>
                  <span className="state-desc">Zone acting as support</span>
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
                <p>Next-Generation Fibonacci Trading with Statistical Confidence</p>
              </div>
            </div>

            <div className="indicator-overview">
              <p>
                FibAlgo® - Perfect Retracement Zone™ is a next-generation Fibonacci trading tool that moves
                beyond static, arbitrary lines to deliver a smarter, data-driven analysis of market retracements.
                It is built on a powerful dual-pivot engine that precisely identifies both major market trends
                and the minor retracements within them.
              </p>
            </div>

            <div className="feature-grid">
              <div className="feature-card">
                <div className="feature-icon">
                  <Activity size={20} />
                </div>
                <h4>Dual-Pivot Engine</h4>
                <p>
                  Precisely identifies both major market trends and the minor retracements within them using
                  two distinct pivot detection systems.
                </p>
              </div>

              <div className="feature-card">
                <div className="feature-icon">
                  <Brain size={20} />
                </div>
                <h4>Adaptive Fibonacci System</h4>
                <p>
                  Analyzes the asset&apos;s unique price history to identify statistically-proven Confidence Zones
                  where reversals are most likely to occur.
                </p>
              </div>

              <div className="feature-card">
                <div className="feature-icon">
                  <BarChart3 size={20} />
                </div>
                <h4>Deep Statistical Data</h4>
                <p>
                  Every Fibonacci zone is enriched with historical success rate and breakout probability
                  of that specific level.
                </p>
              </div>

              <div className="feature-card">
                <div className="feature-icon">
                  <Gauge size={20} />
                </div>
                <h4>Market Pressure Gauge</h4>
                <p>
                  Real-time confirmation of buying or selling strength positioned between major pivots.
                </p>
              </div>
            </div>

            <div className="concept-section">
              <h3>The Core Engine: A Dual Pivot System</h3>

              <div className="dual-pivot-grid">
                <div className="pivot-card">
                  <h4>Major Trend Pivots</h4>
                  <p>
                    Controlled by the &ldquo;Major Trend Period,&rdquo; this system identifies the significant market
                    highs and lows. These pivots establish the primary trend direction and are labeled as
                    <strong> A-series</strong> (for downtrends) or <strong>B-series</strong> (for uptrends).
                  </p>
                </div>
                <div className="pivot-card">
                  <h4>Retracement Pivots</h4>
                  <p>
                    Controlled by the &ldquo;Retracement Period,&rdquo; this system detects smaller, minor pivots that
                    occur within the major trend. These are the crucial pullbacks and bounces that form the
                    basis for Fibonacci retracement calculations.
                  </p>
                </div>
              </div>
            </div>

            <div className="zones-section">
              <h3>Adaptive Fibonacci Zones</h3>
              <div className="zones-grid">
                <div className="zone-card noise">
                  <h4>NZ1 & NZ2 (Noise Zones)</h4>
                  <p>Statistically less significant areas where reversals are less common.</p>
                </div>
                <div className="zone-card confidence">
                  <h4>CZ1, CZ2, CZ3 (Confidence Zones)</h4>
                  <p>High-probability zones where, historically, the most successful reversals have occurred.</p>
                </div>
              </div>
            </div>

            <div className="visuals-section">
              <h3>Understanding the Visuals</h3>
              <div className="visual-items">
                <div className="visual-item">
                  <span className="visual-label">Pivot Labels</span>
                  <p>Major pivots labeled A-1, B-1, etc. Retracement pivots labeled with Fibonacci level.</p>
                </div>
                <div className="visual-item">
                  <span className="visual-label">Star System</span>
                  <p>A star signifies a historically successful and powerful retracement level.</p>
                </div>
                <div className="visual-item">
                  <span className="visual-label">Fibonacci Boxes</span>
                  <p>Colored boxes with Total count, Conf%, and Star Conf% for each zone.</p>
                </div>
              </div>
            </div>

            <div className="trading-strategy">
              <h3>Practical Trading Strategy</h3>
              <div className="strategy-grid">
                <div className="strategy-card buy">
                  <h4>
                    <TrendingUp size={18} />
                    Long Entries (Uptrend)
                  </h4>
                  <ol>
                    <li>Confirm the indicator is in a B-series uptrend</li>
                    <li>Wait for price to pull back into a high-probability support area (CZ1, CZ2, CZ3)</li>
                    <li>Watch the Market Pressure Gauge move into the green</li>
                  </ol>
                </div>
                <div className="strategy-card sell">
                  <h4>
                    <TrendingUp size={18} className="rotate-180" />
                    Short Entries (Downtrend)
                  </h4>
                  <ol>
                    <li>Confirm the indicator is in an A-series downtrend</li>
                    <li>Wait for price to rally into a high-probability resistance area</li>
                    <li>Watch the Market Pressure Gauge move into the red</li>
                  </ol>
                </div>
              </div>
            </div>

            {/* Complete Settings Reference */}
            <div className="settings-section full-width">
              <h3>
                <Settings size={18} />
                Complete Settings Reference
              </h3>

              {/* Trend Settings */}
              <div className="settings-category">
                <button className="category-header" onClick={() => toggleSettings('prz-trend')}>
                  <h4 className="category-title">Trend Settings</h4>
                  <ChevronDown size={18} className={`category-chevron ${expandedSettings.includes('prz-trend') ? 'open' : ''}`} />
                </button>
                {expandedSettings.includes('prz-trend') && (
                <div className="category-content">
                <div className="params-table">
                  <div className="param-row header">
                    <span>Parameter</span>
                    <span>Range</span>
                    <span>Default</span>
                    <span>Description</span>
                  </div>
                  <div className="param-row">
                    <span className="param-name">Major Trend Period</span>
                    <span className="param-range">2 - 1404</span>
                    <span className="param-default">144</span>
                    <span className="param-desc">Controls the detection of significant market highs/lows. Higher values identify longer-term trends (A-series/B-series pivots).</span>
                  </div>
                  <div className="param-row">
                    <span className="param-name">Retracement Period</span>
                    <span className="param-range">2 - 144</span>
                    <span className="param-default">21</span>
                    <span className="param-desc">Detects smaller pullbacks and bounces within the major trend. Lower values = more sensitive retracement detection.</span>
                  </div>
                </div>
                </div>
                )}
              </div>

              {/* Adaptive Zone Configuration */}
              <div className="settings-category">
                <button className="category-header" onClick={() => toggleSettings('prz-adaptive')}>
                  <h4 className="category-title">Adaptive Zone Configuration</h4>
                  <ChevronDown size={18} className={`category-chevron ${expandedSettings.includes('prz-adaptive') ? 'open' : ''}`} />
                </button>
                {expandedSettings.includes('prz-adaptive') && (
                <div className="category-content">
                <div className="params-table">
                  <div className="param-row header">
                    <span>Parameter</span>
                    <span>Range</span>
                    <span>Default</span>
                    <span>Description</span>
                  </div>
                  <div className="param-row">
                    <span className="param-name">Enable Adaptive Fib Levels</span>
                    <span className="param-range">On/Off</span>
                    <span className="param-default">Off</span>
                    <span className="param-desc">When enabled, dynamically calculates optimal Fibonacci zones based on historical data.</span>
                  </div>
                  <div className="param-row">
                    <span className="param-name">Noise Zone 1 Percentage</span>
                    <span className="param-range">5% - 25%</span>
                    <span className="param-default">10%</span>
                    <span className="param-desc">Size of the first noise zone (NZ1) - statistically less significant area.</span>
                  </div>
                  <div className="param-row">
                    <span className="param-name">Noise Zone 2 Percentage</span>
                    <span className="param-range">5% - 25%</span>
                    <span className="param-default">10%</span>
                    <span className="param-desc">Size of the second noise zone (NZ2).</span>
                  </div>
                  <div className="param-row">
                    <span className="param-name">Confidence Zone 1-3 %</span>
                    <span className="param-range">15% - 40%</span>
                    <span className="param-default">26.67% each</span>
                    <span className="param-desc">Size of high-probability reversal zones (CZ1, CZ2, CZ3).</span>
                  </div>
                </div>
                </div>
                )}
              </div>

              {/* Fibonacci Retracement Levels */}
              <div className="settings-category">
                <button className="category-header" onClick={() => toggleSettings('prz-fib')}>
                  <h4 className="category-title">Fibonacci Retracement Levels (10 Customizable)</h4>
                  <ChevronDown size={18} className={`category-chevron ${expandedSettings.includes('prz-fib') ? 'open' : ''}`} />
                </button>
                {expandedSettings.includes('prz-fib') && (
                <div className="category-content">
                <div className="params-table">
                  <div className="param-row header">
                    <span>Level</span>
                    <span>Ratio</span>
                    <span>Default Color</span>
                    <span>Description</span>
                  </div>
                  <div className="param-row">
                    <span className="param-name">Level 1</span>
                    <span className="param-range">0.0</span>
                    <span className="param-default">Gray</span>
                    <span className="param-desc">Start of retracement (0% - swing high/low)</span>
                  </div>
                  <div className="param-row">
                    <span className="param-name">Level 2</span>
                    <span className="param-range">0.236</span>
                    <span className="param-default">Red</span>
                    <span className="param-desc">Shallow retracement level (23.6%)</span>
                  </div>
                  <div className="param-row">
                    <span className="param-name">Level 3</span>
                    <span className="param-range">0.382</span>
                    <span className="param-default">Orange</span>
                    <span className="param-desc">First major Fibonacci level (38.2%)</span>
                  </div>
                  <div className="param-row">
                    <span className="param-name">Level 4</span>
                    <span className="param-range">0.5</span>
                    <span className="param-default">Green</span>
                    <span className="param-desc">Middle retracement (50%)</span>
                  </div>
                  <div className="param-row">
                    <span className="param-name">Level 5</span>
                    <span className="param-range">0.618</span>
                    <span className="param-default">Teal</span>
                    <span className="param-desc">Golden Ratio - most significant level (61.8%)</span>
                  </div>
                  <div className="param-row">
                    <span className="param-name">Level 6</span>
                    <span className="param-range">0.786</span>
                    <span className="param-default">Aqua</span>
                    <span className="param-desc">Deep retracement (78.6%)</span>
                  </div>
                  <div className="param-row">
                    <span className="param-name">Level 7</span>
                    <span className="param-range">1.0</span>
                    <span className="param-default">Gray</span>
                    <span className="param-desc">Full retracement (100% - opposite swing)</span>
                  </div>
                  <div className="param-row optional">
                    <span className="param-name">Level 8 (Optional)</span>
                    <span className="param-range">0.75</span>
                    <span className="param-default">Blue (Off)</span>
                    <span className="param-desc">Custom intermediate level</span>
                  </div>
                  <div className="param-row optional">
                    <span className="param-name">Level 9 (Optional)</span>
                    <span className="param-range">0.886</span>
                    <span className="param-default">Purple (Off)</span>
                    <span className="param-desc">Extended Fibonacci level</span>
                  </div>
                  <div className="param-row optional">
                    <span className="param-name">Level 10 (Optional)</span>
                    <span className="param-range">0.95</span>
                    <span className="param-default">Maroon (Off)</span>
                    <span className="param-desc">Near-full retracement level</span>
                  </div>
                </div>
                </div>
                )}
              </div>

              {/* Market Pressure Settings */}
              <div className="settings-category">
                <button className="category-header" onClick={() => toggleSettings('prz-pressure')}>
                  <h4 className="category-title">Market Pressure Gauge</h4>
                  <ChevronDown size={18} className={`category-chevron ${expandedSettings.includes('prz-pressure') ? 'open' : ''}`} />
                </button>
                {expandedSettings.includes('prz-pressure') && (
                <div className="category-content">
                <div className="params-table">
                  <div className="param-row header">
                    <span>Parameter</span>
                    <span>Range</span>
                    <span>Default</span>
                    <span>Description</span>
                  </div>
                  <div className="param-row">
                    <span className="param-name">Show Market Pressure Gauge</span>
                    <span className="param-range">On/Off</span>
                    <span className="param-default">On</span>
                    <span className="param-desc">Toggle the real-time buying/selling pressure visualization.</span>
                  </div>
                  <div className="param-row">
                    <span className="param-name">Gauge Distance from Price</span>
                    <span className="param-range">1 - 100</span>
                    <span className="param-default">5</span>
                    <span className="param-desc">Vertical offset of the gauge from current price.</span>
                  </div>
                  <div className="param-row">
                    <span className="param-name">Bullish Color</span>
                    <span className="param-range">Color</span>
                    <span className="param-default">#00ffbb</span>
                    <span className="param-desc">Color when buying pressure dominates.</span>
                  </div>
                  <div className="param-row">
                    <span className="param-name">Bearish Color</span>
                    <span className="param-range">Color</span>
                    <span className="param-default">#ff1100</span>
                    <span className="param-desc">Color when selling pressure dominates.</span>
                  </div>
                </div>
                </div>
                )}
              </div>

              {/* Display Settings */}
              <div className="settings-category">
                <button className="category-header" onClick={() => toggleSettings('prz-display')}>
                  <h4 className="category-title">Display Settings</h4>
                  <ChevronDown size={18} className={`category-chevron ${expandedSettings.includes('prz-display') ? 'open' : ''}`} />
                </button>
                {expandedSettings.includes('prz-display') && (
                <div className="category-content">
                <div className="params-table">
                  <div className="param-row header">
                    <span>Parameter</span>
                    <span>Options</span>
                    <span>Default</span>
                    <span>Description</span>
                  </div>
                  <div className="param-row">
                    <span className="param-name">Show Pivot Labels</span>
                    <span className="param-range">On/Off</span>
                    <span className="param-default">On</span>
                    <span className="param-desc">Display A-1, B-1 labels at major pivots.</span>
                  </div>
                  <div className="param-row">
                    <span className="param-name">Major Trend Pivot</span>
                    <span className="param-range">On/Off + Colors</span>
                    <span className="param-default">On (White)</span>
                    <span className="param-desc">Show main trend ZigZag lines.</span>
                  </div>
                  <div className="param-row">
                    <span className="param-name">Retracement Pivot</span>
                    <span className="param-range">On/Off + Colors</span>
                    <span className="param-default">On (Red)</span>
                    <span className="param-desc">Show minor retracement ZigZag lines.</span>
                  </div>
                  <div className="param-row">
                    <span className="param-name">Show Dynamic Fibonacci</span>
                    <span className="param-range">On/Off</span>
                    <span className="param-default">On</span>
                    <span className="param-desc">Display real-time Fibonacci retracement levels.</span>
                  </div>
                  <div className="param-row">
                    <span className="param-name">Show Fibonacci Boxes</span>
                    <span className="param-range">On/Off</span>
                    <span className="param-default">On</span>
                    <span className="param-desc">Display colored zone boxes with statistics.</span>
                  </div>
                </div>
                </div>
                )}
              </div>
            </div>

            {/* Statistical Tracking */}
            <div className="technical-section">
              <h3>Technical: Adaptive Brain Data</h3>
              <p>The indicator maintains comprehensive statistical tracking for both A-series and B-series:</p>
              <div className="stats-grid">
                <div className="stats-item">
                  <span className="stats-label">fib_counts</span>
                  <span className="stats-desc">Total retracements at each Fibonacci level</span>
                </div>
                <div className="stats-item">
                  <span className="stats-label">star_counts</span>
                  <span className="stats-desc">Successful (starred) retracements per level</span>
                </div>
                <div className="stats-item">
                  <span className="stats-label">total_fibs</span>
                  <span className="stats-desc">Overall retracement count</span>
                </div>
                <div className="stats-item">
                  <span className="stats-label">total_stars</span>
                  <span className="stats-desc">Total successful retracements</span>
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
                <p>Multi-Symbol Dashboard for Perfect Entry Zone Analysis</p>
              </div>
            </div>

            <div className="indicator-overview">
              <p>
                The FibAlgo® - Screener (PEZ) is a powerful multi-symbol dashboard that works as a companion
                to our main FibAlgo® - Perfect Entry Zone™ indicator. Instead of analyzing one chart at a time,
                the screener allows you to monitor up to 10 different symbols and timeframes simultaneously
                from a single, organized table on your chart.
              </p>
            </div>

            <div className="columns-section">
              <h3>Columns Explained</h3>
              <div className="columns-grid">
                <div className="column-card">
                  <h4>Volatility</h4>
                  <p>Measures current market energy based on ATR. Categorized as &ldquo;Low,&rdquo; &ldquo;Moderate,&rdquo; or &ldquo;High.&rdquo;</p>
                </div>
                <div className="column-card">
                  <h4>Trend</h4>
                  <p>Short-term trend direction: &ldquo;Bullish,&rdquo; &ldquo;Bearish,&rdquo; or &ldquo;Sideways.&rdquo;</p>
                </div>
                <div className="column-card">
                  <h4>Fib Range</h4>
                  <p>Current price location within the Fibonacci structure calculated by the PEZ engine.</p>
                </div>
                <div className="column-card">
                  <h4>Trend Strength</h4>
                  <p>Calculated using ADX. Below 25: Weak trend. Above 50: Very strong trend.</p>
                </div>
                <div className="column-card highlight">
                  <h4>Buy Zone / Sell Zone</h4>
                  <p>Most critical column! Shows &ldquo;Active&rdquo; when price is inside a Perfect Entry Zone.</p>
                </div>
              </div>
            </div>

            <div className="workflow-section">
              <h3>How to Use the Screener</h3>
              <div className="workflow-steps">
                <div className="workflow-step">
                  <div className="workflow-number">1</div>
                  <div>
                    <h4>Setup Your Watchlist</h4>
                    <p>Go into settings and populate the &ldquo;Symbol List&rdquo; with up to 10 symbols. Assign timeframe for each.</p>
                  </div>
                </div>
                <div className="workflow-step">
                  <div className="workflow-number">2</div>
                  <div>
                    <h4>Scan for Confluence</h4>
                    <p>Look for multiple columns aligning: Trend &ldquo;Bullish&rdquo; + Trend Strength &gt; 25% + Buy Zone &ldquo;Active&rdquo;</p>
                  </div>
                </div>
                <div className="workflow-step">
                  <div className="workflow-number">3</div>
                  <div>
                    <h4>Analyze with Main Indicator</h4>
                    <p>Open the symbol&apos;s chart and apply Perfect Entry Zone™ for detailed analysis.</p>
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
                <p>Intelligent Trading System with Volatility-Adjusted Levels</p>
              </div>
            </div>

            <div className="indicator-overview">
              <p>
                FibAlgo® - Smart Trading™ is an all-in-one, intelligent trading system designed to provide
                a clear and systematic approach to navigating the markets. It is engineered to filter out
                market noise, identify high-probability breakout opportunities, and provide dynamic profit
                targets that adapt to the trend&apos;s momentum.
              </p>
            </div>

            <div className="feature-grid">
              <div className="feature-card">
                <div className="feature-icon">
                  <Target size={20} />
                </div>
                <h4>Volatility-Adjusted Levels</h4>
                <p>
                  Creates a &ldquo;buffer zone&rdquo; around support/resistance levels using ATR, significantly
                  reducing fake signals.
                </p>
              </div>

              <div className="feature-card">
                <div className="feature-icon">
                  <Zap size={20} />
                </div>
                <h4>Strength-Rated Breakouts</h4>
                <p>
                  Classifies breakouts as &ldquo;Strong Break,&rdquo; &ldquo;Break,&rdquo; or &ldquo;Low Break&rdquo; based on volatility
                  during the break.
                </p>
              </div>

              <div className="feature-card">
                <div className="feature-icon">
                  <ArrowRight size={20} />
                </div>
                <h4>Reversal Zones</h4>
                <p>
                  &ldquo;Second Chance&rdquo; re-entry zones (Teal for Buy, Maroon for Sell) appear after breakouts
                  for missed entries.
                </p>
              </div>

              <div className="feature-card">
                <div className="feature-icon">
                  <TrendingUp size={20} />
                </div>
                <h4>Dynamic Take Profit Zones</h4>
                <p>
                  Gray TP zones move and expand with the trend, allowing you to stay in winning trades longer.
                </p>
              </div>
            </div>

            <div className="breakout-section">
              <h3>Breakout Signal Strength</h3>
              <div className="breakout-grid">
                <div className="breakout-card strong">
                  <h4>Strong Break</h4>
                  <p>Very high volatility. Highest quality signal with strong conviction.</p>
                </div>
                <div className="breakout-card normal">
                  <h4>Break</h4>
                  <p>Normal volatility. Standard, reliable signal.</p>
                </div>
                <div className="breakout-card weak">
                  <h4>Low Break</h4>
                  <p>Low volatility. Signal suggests caution, may lack follow-through.</p>
                </div>
              </div>
            </div>

            <div className="trading-strategy">
              <h3>Practical Trading Strategy</h3>
              <div className="strategy-grid">
                <div className="strategy-card buy">
                  <h4>
                    <TrendingUp size={18} />
                    Buy Signals
                  </h4>
                  <ol>
                    <li>Wait for &ldquo;Break&rdquo; or &ldquo;Strong Break&rdquo; above maroon resistance</li>
                    <li>For conservative entry, wait for retest of Teal Reversal Zone</li>
                    <li>Take profits when price enters gray TP Zone</li>
                  </ol>
                </div>
                <div className="strategy-card sell">
                  <h4>
                    <TrendingUp size={18} className="rotate-180" />
                    Sell Signals
                  </h4>
                  <ol>
                    <li>Wait for &ldquo;Break&rdquo; or &ldquo;Strong Break&rdquo; below teal support</li>
                    <li>For conservative entry, wait for retest of Maroon Reversal Zone</li>
                    <li>Take profits when price enters gray TP Zone</li>
                  </ol>
                </div>
              </div>
            </div>

            <div className="settings-section full-width">
              <h3>
                <Settings size={18} />
                Complete Settings Reference
              </h3>

              {/* Main Chart Settings */}
              <div className="settings-category">
                <button className="category-header" onClick={() => toggleSettings('st-main')}>
                  <h4 className="category-title">Main Chart Settings</h4>
                  <ChevronDown size={18} className={`category-chevron ${expandedSettings.includes('st-main') ? 'open' : ''}`} />
                </button>
                {expandedSettings.includes('st-main') && (
                <div className="category-content">
                <div className="params-table">
                  <div className="param-row header">
                    <span>Parameter</span>
                    <span>Range</span>
                    <span>Default</span>
                    <span>Description</span>
                  </div>
                  <div className="param-row highlight">
                    <span className="param-name">Fake Trend Break Sensitivity</span>
                    <span className="param-range">0.1 - 2.0</span>
                    <span className="param-default">1.0</span>
                    <span className="param-desc">ATR scaling for volatility-buffered S/R lines AND breakout strength classification. Higher = wider buffer, fewer signals but stronger. Lower = earlier signals but more fakeouts. Practical: 0.8-1.2 core, 0.5-0.7 aggressive scalping, 1.3-1.6 conservative swing.</span>
                  </div>
                  <div className="param-row highlight">
                    <span className="param-name">Volatility Sensitivity</span>
                    <span className="param-range">1.0 - 5.0</span>
                    <span className="param-default">3.0</span>
                    <span className="param-desc">Supertrend band width multiplier (uses ATR). Higher = wider bands, fewer trend flips, higher confidence but later signals. Typical: 2.5-3.5 default, 2.0 or lower for fast scalping, 3.5-4.5 for choppy markets.</span>
                  </div>
                </div>
                </div>
                )}
              </div>

              {/* ATR Thresholds */}
              <div className="settings-category">
                <button className="category-header" onClick={() => toggleSettings('st-atr')}>
                  <h4 className="category-title">Breakout Strength Classification (ATR-Based)</h4>
                  <ChevronDown size={18} className={`category-chevron ${expandedSettings.includes('st-atr') ? 'open' : ''}`} />
                </button>
                {expandedSettings.includes('st-atr') && (
                <div className="category-content">
                <div className="params-table">
                  <div className="param-row header">
                    <span>Classification</span>
                    <span>Condition</span>
                    <span>Multiplier</span>
                    <span>Meaning</span>
                  </div>
                  <div className="param-row">
                    <span className="param-name strong-text">Strong Break</span>
                    <span className="param-range">ATR &gt; Threshold</span>
                    <span className="param-default">1.4×</span>
                    <span className="param-desc">Current ATR exceeds 1.4× of 50-period rolling average. High conviction signal.</span>
                  </div>
                  <div className="param-row">
                    <span className="param-name">Break</span>
                    <span className="param-range">Normal ATR</span>
                    <span className="param-default">1.0×</span>
                    <span className="param-desc">ATR within normal range. Standard reliable signal.</span>
                  </div>
                  <div className="param-row">
                    <span className="param-name weak-text">Low Break</span>
                    <span className="param-range">ATR &lt; Threshold</span>
                    <span className="param-default">0.7×</span>
                    <span className="param-desc">ATR below 0.7× of average. Caution - may lack follow-through.</span>
                  </div>
                </div>
                </div>
                )}
              </div>

              {/* HTF Trend Settings */}
              <div className="settings-category">
                <button className="category-header" onClick={() => toggleSettings('st-htf')}>
                  <h4 className="category-title">HTF Trend Settings</h4>
                  <ChevronDown size={18} className={`category-chevron ${expandedSettings.includes('st-htf') ? 'open' : ''}`} />
                </button>
                {expandedSettings.includes('st-htf') && (
                <div className="category-content">
                <div className="params-table">
                  <div className="param-row header">
                    <span>Parameter</span>
                    <span>Options</span>
                    <span>Default</span>
                    <span>Description</span>
                  </div>
                  <div className="param-row">
                    <span className="param-name">Use HTF Trend</span>
                    <span className="param-range">On/Off</span>
                    <span className="param-default">Off</span>
                    <span className="param-desc">Filter signals to only show those aligned with higher timeframe trend.</span>
                  </div>
                  <div className="param-row">
                    <span className="param-name">HTF Resolution</span>
                    <span className="param-range">Timeframe</span>
                    <span className="param-default">60 (1H)</span>
                    <span className="param-desc">Higher timeframe to use for trend direction filter.</span>
                  </div>
                  <div className="param-row">
                    <span className="param-name">HTF Volatility Sensitivity</span>
                    <span className="param-range">1.0 - 5.0</span>
                    <span className="param-default">3.0</span>
                    <span className="param-desc">Supertrend multiplier for the HTF trend calculation.</span>
                  </div>
                  <div className="param-row">
                    <span className="param-name">Show HTF Trend Label</span>
                    <span className="param-range">On/Off</span>
                    <span className="param-default">Off</span>
                    <span className="param-desc">Display current HTF trend direction on chart.</span>
                  </div>
                </div>
                </div>
                )}
              </div>

              {/* Line Settings */}
              <div className="settings-category">
                <button className="category-header" onClick={() => toggleSettings('st-lines')}>
                  <h4 className="category-title">Line Settings</h4>
                  <ChevronDown size={18} className={`category-chevron ${expandedSettings.includes('st-lines') ? 'open' : ''}`} />
                </button>
                {expandedSettings.includes('st-lines') && (
                <div className="category-content">
                <div className="params-table">
                  <div className="param-row header">
                    <span>Parameter</span>
                    <span>Options</span>
                    <span>Default</span>
                    <span>Description</span>
                  </div>
                  <div className="param-row">
                    <span className="param-name">Show Lines</span>
                    <span className="param-range">On/Off</span>
                    <span className="param-default">On</span>
                    <span className="param-desc">Display support/resistance level lines.</span>
                  </div>
                  <div className="param-row">
                    <span className="param-name">Extend Lines</span>
                    <span className="param-range">On/Off</span>
                    <span className="param-default">Off</span>
                    <span className="param-desc">Extend lines without right extension.</span>
                  </div>
                  <div className="param-row">
                    <span className="param-name">Resistance Line Color</span>
                    <span className="param-range">Color</span>
                    <span className="param-default">Maroon (20% transparent)</span>
                    <span className="param-desc">Color for resistance (sell) levels.</span>
                  </div>
                  <div className="param-row">
                    <span className="param-name">Support Line Color</span>
                    <span className="param-range">Color</span>
                    <span className="param-default">Teal (20% transparent)</span>
                    <span className="param-desc">Color for support (buy) levels.</span>
                  </div>
                </div>
                </div>
                )}
              </div>

              {/* Zone & Box Settings */}
              <div className="settings-category">
                <button className="category-header" onClick={() => toggleSettings('st-zones')}>
                  <h4 className="category-title">Zone and Box Settings</h4>
                  <ChevronDown size={18} className={`category-chevron ${expandedSettings.includes('st-zones') ? 'open' : ''}`} />
                </button>
                {expandedSettings.includes('st-zones') && (
                <div className="category-content">
                <div className="params-table">
                  <div className="param-row header">
                    <span>Parameter</span>
                    <span>Options</span>
                    <span>Default</span>
                    <span>Description</span>
                  </div>
                  <div className="param-row">
                    <span className="param-name">Show Reversal Zone</span>
                    <span className="param-range">On/Off</span>
                    <span className="param-default">Off</span>
                    <span className="param-desc">Toggle visibility of retracement re-entry zones.</span>
                  </div>
                  <div className="param-row">
                    <span className="param-name">Show TP Zone</span>
                    <span className="param-range">On/Off</span>
                    <span className="param-default">Off</span>
                    <span className="param-desc">Toggle visibility of take profit zones.</span>
                  </div>
                  <div className="param-row">
                    <span className="param-name">Reversal Sell Zone Color</span>
                    <span className="param-range">Color</span>
                    <span className="param-default">Maroon (60%)</span>
                    <span className="param-desc">Color for sell reversal zones.</span>
                  </div>
                  <div className="param-row">
                    <span className="param-name">Reversal Buy Zone Color</span>
                    <span className="param-range">Color</span>
                    <span className="param-default">Teal (60%)</span>
                    <span className="param-desc">Color for buy reversal zones.</span>
                  </div>
                  <div className="param-row">
                    <span className="param-name">Take Profit Zone Color</span>
                    <span className="param-range">Color</span>
                    <span className="param-default">Gray (90%)</span>
                    <span className="param-desc">Color for TP zones.</span>
                  </div>
                </div>
                </div>
                )}
              </div>

              {/* Box Text Customization */}
              <div className="settings-category">
                <button className="category-header" onClick={() => toggleSettings('st-text')}>
                  <h4 className="category-title">Box Text Customization</h4>
                  <ChevronDown size={18} className={`category-chevron ${expandedSettings.includes('st-text') ? 'open' : ''}`} />
                </button>
                {expandedSettings.includes('st-text') && (
                <div className="category-content">
                <div className="params-table">
                  <div className="param-row header">
                    <span>Parameter</span>
                    <span>Type</span>
                    <span>Default</span>
                    <span>Description</span>
                  </div>
                  <div className="param-row">
                    <span className="param-name">Show Box Text</span>
                    <span className="param-range">On/Off</span>
                    <span className="param-default">On</span>
                    <span className="param-desc">Display text labels inside zones.</span>
                  </div>
                  <div className="param-row">
                    <span className="param-name">Box Text Size</span>
                    <span className="param-range">Tiny-Huge</span>
                    <span className="param-default">Normal</span>
                    <span className="param-desc">Font size for zone labels.</span>
                  </div>
                  <div className="param-row">
                    <span className="param-name">Reversal Texts</span>
                    <span className="param-range">String</span>
                    <span className="param-default">&ldquo;Retracement&rdquo; / &ldquo;Retracement Trend Zone&rdquo;</span>
                    <span className="param-desc">Customizable text for reversal zones.</span>
                  </div>
                  <div className="param-row">
                    <span className="param-name">Take Profit Texts</span>
                    <span className="param-range">String</span>
                    <span className="param-default">&ldquo;TP&rdquo; / &ldquo;Buy/Sell Take Profit Zone&rdquo;</span>
                    <span className="param-desc">Customizable text for TP zones.</span>
                  </div>
                </div>
                </div>
                )}
              </div>

              {/* Alert System */}
              <div className="settings-category">
                <button className="category-header" onClick={() => toggleSettings('st-alerts')}>
                  <h4 className="category-title">Smart Alert System</h4>
                  <ChevronDown size={18} className={`category-chevron ${expandedSettings.includes('st-alerts') ? 'open' : ''}`} />
                </button>
                {expandedSettings.includes('st-alerts') && (
                <div className="category-content">
                <div className="params-table">
                  <div className="param-row header">
                    <span>Alert Type</span>
                    <span>Default</span>
                    <span>Trigger Condition</span>
                  </div>
                  <div className="param-row">
                    <span className="param-name">Enable Alert System</span>
                    <span className="param-default">On</span>
                    <span className="param-desc">Master toggle for all alerts.</span>
                  </div>
                  <div className="param-row">
                    <span className="param-name">Reversal Sell/Buy Box Started</span>
                    <span className="param-default">Off</span>
                    <span className="param-desc">Alert when new reversal zone forms.</span>
                  </div>
                  <div className="param-row">
                    <span className="param-name">Up/Down Breakout</span>
                    <span className="param-default">Off</span>
                    <span className="param-desc">Alert on any breakout signal.</span>
                  </div>
                  <div className="param-row">
                    <span className="param-name">Strong Up/Down Breakout</span>
                    <span className="param-default">Off</span>
                    <span className="param-desc">Alert only on high-conviction breaks.</span>
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
                <p>Statistical Oscillator Analysis with Dynamic Zones</p>
              </div>
            </div>

            <div className="indicator-overview">
              <p>
                FibAlgo® - Oscillator Matrix™ is a next-generation statistical tool that revolutionizes
                how traders use oscillators. It analyzes hundreds of past price tops and bottoms to discover
                which oscillator values have actually led to reversals, then visualizes them as dynamic,
                data-driven zones.
              </p>
            </div>

            <div className="feature-grid">
              <div className="feature-card">
                <div className="feature-icon">
                  <Brain size={20} />
                </div>
                <h4>Statistical Brain</h4>
                <p>
                  Learns from the market by recording oscillator values at every identified pivot point,
                  then groups findings into statistically significant categories.
                </p>
              </div>

              <div className="feature-card">
                <div className="feature-icon">
                  <Layers size={20} />
                </div>
                <h4>6 Core Oscillators</h4>
                <p>
                  RSI, MFI, Momentum, Stochastic, Stochastic RSI, and Chaikin Money Flow. The entire
                  statistical engine adapts to your preferred tool.
                </p>
              </div>

              <div className="feature-card">
                <div className="feature-icon">
                  <BarChart3 size={20} />
                </div>
                <h4>Analysis Table (Matrix)</h4>
                <p>
                  Detailed dashboard showing Zone, Count, Conf%, Avg Drop%/Rise%, and Avg Time for every
                  identified zone.
                </p>
              </div>

              <div className="feature-card">
                <div className="feature-icon">
                  <Clock size={20} />
                </div>
                <h4>Data Decay Engine</h4>
                <p>
                  Adaptive feature that gives more weight to recent market behavior for relevant analysis.
                </p>
              </div>
            </div>

            <div className="bands-section">
              <h3>Dynamic Overbought/Oversold Bands</h3>
              <div className="bands-grid">
                <div className="band-card maroon">
                  <h4>Maroon Band (Peak Zone)</h4>
                  <p>Highlights oscillator range where price peaks have historically occurred most often.
                    Your dynamic overbought/resistance zone.</p>
                </div>
                <div className="band-card teal">
                  <h4>Teal Band (Trough Zone)</h4>
                  <p>Highlights range where price troughs have occurred most often.
                    Your dynamic oversold/support zone.</p>
                </div>
              </div>
            </div>

            <div className="trading-strategy">
              <h3>Trading Strategy</h3>
              <div className="strategy-grid">
                <div className="strategy-card sell">
                  <h4>Sell Signals</h4>
                  <ol>
                    <li>Look for oscillator to enter Maroon Band</li>
                    <li>Check Analysis Table for high Conf% and Avg Drop%</li>
                    <li>This provides strong confirmation for potential short</li>
                  </ol>
                </div>
                <div className="strategy-card buy">
                  <h4>Buy Signals</h4>
                  <ol>
                    <li>Look for oscillator to enter Teal Band</li>
                    <li>Check Analysis Table for high Conf% and Avg Rise%</li>
                    <li>This provides data-backed evidence for potential long</li>
                  </ol>
                </div>
              </div>
            </div>

            {/* Complete Settings Reference */}
            <div className="settings-section full-width">
              <h3>
                <Settings size={18} />
                Complete Settings Reference
              </h3>

              {/* Choose Main Oscillator */}
              <div className="settings-category">
                <button className="category-header" onClick={() => toggleSettings('om-oscillator')}>
                  <h4 className="category-title">Choose Main Oscillator</h4>
                  <ChevronDown size={18} className={`category-chevron ${expandedSettings.includes('om-oscillator') ? 'open' : ''}`} />
                </button>
                {expandedSettings.includes('om-oscillator') && (
                <div className="category-content">
                <div className="oscillator-grid">
                  <div className="oscillator-card">
                    <h5>RSI (Relative Strength Index)</h5>
                    <p>Most popular momentum oscillator. Measures speed and magnitude of price changes. Range: 0-100.</p>
                    <span className="osc-default">Default Length: 14</span>
                  </div>
                  <div className="oscillator-card">
                    <h5>MFI (Money Flow Index)</h5>
                    <p>Volume-weighted RSI. Incorporates both price and volume data. Range: 0-100.</p>
                    <span className="osc-default">Default Length: 14</span>
                  </div>
                  <div className="oscillator-card">
                    <h5>Momentum</h5>
                    <p>Measures rate of price change. Simple difference between current and past price.</p>
                    <span className="osc-default">Default Length: 14</span>
                  </div>
                  <div className="oscillator-card">
                    <h5>Stochastic</h5>
                    <p>Compares closing price to high-low range. Shows position within recent range. Range: 0-100.</p>
                    <span className="osc-default">Length: 14, %K Smooth: 1, %D Smooth: 3</span>
                  </div>
                  <div className="oscillator-card">
                    <h5>Stochastic RSI</h5>
                    <p>Stochastic applied to RSI values. More sensitive than regular Stochastic. Range: 0-100.</p>
                    <span className="osc-default">RSI: 14, Stoch: 14, %K: 3, %D: 3</span>
                  </div>
                  <div className="oscillator-card">
                    <h5>Chaikin Money Flow</h5>
                    <p>Measures accumulation/distribution over a period. Range: -1 to +1 (normalized to 0-100).</p>
                    <span className="osc-default">Default Length: 14</span>
                  </div>
                </div>
                </div>
                )}
              </div>

              {/* Algorithm Settings */}
              <div className="settings-category">
                <button className="category-header" onClick={() => toggleSettings('om-algorithm')}>
                  <h4 className="category-title">Algorithm Settings</h4>
                  <ChevronDown size={18} className={`category-chevron ${expandedSettings.includes('om-algorithm') ? 'open' : ''}`} />
                </button>
                {expandedSettings.includes('om-algorithm') && (
                <div className="category-content">
                <div className="params-table">
                  <div className="param-row header">
                    <span>Parameter</span>
                    <span>Range</span>
                    <span>Default</span>
                    <span>Description</span>
                  </div>
                  <div className="param-row">
                    <span className="param-name">PH/PL Period</span>
                    <span className="param-range">2 - 200</span>
                    <span className="param-default">21</span>
                    <span className="param-desc">How sensitive the algorithm is to price changes. Lower = more frequent signals, Higher = fewer but stronger signals.</span>
                  </div>
                  <div className="param-row">
                    <span className="param-name">Lookback Pivots for Analysis</span>
                    <span className="param-range">10 - 500</span>
                    <span className="param-default">100</span>
                    <span className="param-desc">How many past price turning points to analyze. More data = more reliable statistics but slower updates.</span>
                  </div>
                  <div className="param-row">
                    <span className="param-name">Enable Performance Analysis</span>
                    <span className="param-range">On/Off</span>
                    <span className="param-default">On</span>
                    <span className="param-desc">Track actual performance (price movement) after each signal.</span>
                  </div>
                  <div className="param-row">
                    <span className="param-name">Bars to Check Performance</span>
                    <span className="param-range">5 - 100</span>
                    <span className="param-default">20</span>
                    <span className="param-desc">How far ahead to measure price movement after signals. Higher = longer-term performance tracking.</span>
                  </div>
                  <div className="param-row">
                    <span className="param-name">Enable Data Decay</span>
                    <span className="param-range">On/Off</span>
                    <span className="param-default">On</span>
                    <span className="param-desc">Weight recent data more heavily than older data for adaptive analysis.</span>
                  </div>
                  <div className="param-row">
                    <span className="param-name">Decay Rate</span>
                    <span className="param-range">0.1 - 1.0</span>
                    <span className="param-default">0.95</span>
                    <span className="param-desc">How much to favor recent data. Higher = recent signals matter more (0.9-0.99 recommended).</span>
                  </div>
                </div>
                </div>
                )}
              </div>

              {/* RSI Specific Settings */}
              <div className="settings-category">
                <button className="category-header" onClick={() => toggleSettings('om-rsi')}>
                  <h4 className="category-title">RSI Settings (When RSI Selected)</h4>
                  <ChevronDown size={18} className={`category-chevron ${expandedSettings.includes('om-rsi') ? 'open' : ''}`} />
                </button>
                {expandedSettings.includes('om-rsi') && (
                <div className="category-content">
                <div className="params-table">
                  <div className="param-row header">
                    <span>Parameter</span>
                    <span>Options</span>
                    <span>Default</span>
                    <span>Description</span>
                  </div>
                  <div className="param-row">
                    <span className="param-name">RSI Length</span>
                    <span className="param-range">1+</span>
                    <span className="param-default">14</span>
                    <span className="param-desc">Lookback period for RSI calculation.</span>
                  </div>
                  <div className="param-row">
                    <span className="param-name">Enable RSI Smoothing</span>
                    <span className="param-range">On/Off</span>
                    <span className="param-default">Off</span>
                    <span className="param-desc">Apply additional smoothing to RSI line.</span>
                  </div>
                  <div className="param-row">
                    <span className="param-name">RSI Smoothing Type</span>
                    <span className="param-range">6 Types</span>
                    <span className="param-default">SMA</span>
                    <span className="param-desc">SMA, SMA + BB, EMA, SMMA (RMA), WMA, VWMA</span>
                  </div>
                  <div className="param-row">
                    <span className="param-name">RSI Smoothing Length</span>
                    <span className="param-range">1+</span>
                    <span className="param-default">14</span>
                    <span className="param-desc">Smoothing period.</span>
                  </div>
                  <div className="param-row">
                    <span className="param-name">Bollinger Bands StdDev</span>
                    <span className="param-range">0.1+</span>
                    <span className="param-default">2.0</span>
                    <span className="param-desc">Standard deviation for BB when &ldquo;SMA + BB&rdquo; smoothing selected.</span>
                  </div>
                </div>
                </div>
                )}
              </div>

              {/* Stochastic Settings */}
              <div className="settings-category">
                <button className="category-header" onClick={() => toggleSettings('om-stochastic')}>
                  <h4 className="category-title">Stochastic Settings</h4>
                  <ChevronDown size={18} className={`category-chevron ${expandedSettings.includes('om-stochastic') ? 'open' : ''}`} />
                </button>
                {expandedSettings.includes('om-stochastic') && (
                <div className="category-content">
                <div className="params-table">
                  <div className="param-row header">
                    <span>Parameter</span>
                    <span>Range</span>
                    <span>Default</span>
                    <span>Description</span>
                  </div>
                  <div className="param-row">
                    <span className="param-name">Stochastic Length</span>
                    <span className="param-range">1+</span>
                    <span className="param-default">14</span>
                    <span className="param-desc">Lookback period for %K calculation.</span>
                  </div>
                  <div className="param-row">
                    <span className="param-name">%K Smoothing</span>
                    <span className="param-range">1+</span>
                    <span className="param-default">1</span>
                    <span className="param-desc">Smoothing applied to %K line.</span>
                  </div>
                  <div className="param-row">
                    <span className="param-name">Show %D</span>
                    <span className="param-range">On/Off</span>
                    <span className="param-default">Off</span>
                    <span className="param-desc">Display the %D signal line.</span>
                  </div>
                  <div className="param-row">
                    <span className="param-name">%D Smoothing</span>
                    <span className="param-range">1+</span>
                    <span className="param-default">3</span>
                    <span className="param-desc">Smoothing applied to %D line.</span>
                  </div>
                </div>
                </div>
                )}
              </div>

              {/* Table Settings */}
              <div className="settings-category">
                <button className="category-header" onClick={() => toggleSettings('om-table')}>
                  <h4 className="category-title">Table Settings</h4>
                  <ChevronDown size={18} className={`category-chevron ${expandedSettings.includes('om-table') ? 'open' : ''}`} />
                </button>
                {expandedSettings.includes('om-table') && (
                <div className="category-content">
                <div className="params-table">
                  <div className="param-row header">
                    <span>Parameter</span>
                    <span>Options</span>
                    <span>Default</span>
                    <span>Description</span>
                  </div>
                  <div className="param-row">
                    <span className="param-name">Show Analysis Table</span>
                    <span className="param-range">On/Off</span>
                    <span className="param-default">Off</span>
                    <span className="param-desc">Display the statistical analysis matrix table.</span>
                  </div>
                  <div className="param-row">
                    <span className="param-name">Table Size</span>
                    <span className="param-range">Tiny/Small/Normal/Large</span>
                    <span className="param-default">Small</span>
                    <span className="param-desc">Size of the analysis table display.</span>
                  </div>
                </div>
                </div>
                )}
              </div>
            </div>

            {/* Technical: How the Statistical Brain Works */}
            <div className="technical-section">
              <h3>Technical: Statistical Brain Algorithm</h3>
              <div className="algorithm-flow">
                <div className="algo-step">
                  <span className="algo-num">1</span>
                  <div>
                    <h5>Pivot Detection</h5>
                    <p>Uses ZigZag algorithm (on close price) to identify significant highs (PH) and lows (PL).</p>
                  </div>
                </div>
                <div className="algo-step">
                  <span className="algo-num">2</span>
                  <div>
                    <h5>Value Recording</h5>
                    <p>At each pivot, records the oscillator value into phRSI_values or plRSI_values arrays.</p>
                  </div>
                </div>
                <div className="algo-step">
                  <span className="algo-num">3</span>
                  <div>
                    <h5>Categorization</h5>
                    <p>Groups oscillator values into categories (e.g., 0-10, 10-20, etc.) using CategoryData UDT.</p>
                  </div>
                </div>
                <div className="algo-step">
                  <span className="algo-num">4</span>
                  <div>
                    <h5>Weighted Counting</h5>
                    <p>Applies decay rate to weight recent pivots more heavily than older ones.</p>
                  </div>
                </div>
                <div className="algo-step">
                  <span className="algo-num">5</span>
                  <div>
                    <h5>Mode Detection</h5>
                    <p>Finds the most frequent category (mode) for peaks and troughs to determine band placement.</p>
                  </div>
                </div>
                <div className="algo-step">
                  <span className="algo-num">6</span>
                  <div>
                    <h5>Dynamic Band Display</h5>
                    <p>Draws Maroon band at peak mode range, Teal band at trough mode range.</p>
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
                <p>AI-Powered All-in-One Trading Suite</p>
              </div>
            </div>

            <div className="indicator-overview">
              <p>
                FibAlgo® - Technical Analysis™ is not just an indicator; it is a complete, AI-powered trading
                suite designed to be the ultimate all-in-one analysis toolkit. It consolidates dozens of powerful
                trading concepts into a single, cohesive, and highly customizable interface.
              </p>
            </div>

            <div className="modules-grid">
              <div className="module-card">
                <div className="module-icon">
                  <Brain size={24} />
                </div>
                <h4>AI-Powered Dashboard</h4>
                <p>
                  Real-time summary of dozens of classic indicators organized into Trend, Momentum, Pressure,
                  and Volume categories. Includes unique Fear & Greed meter.
                </p>
              </div>

              <div className="module-card">
                <div className="module-icon">
                  <Target size={24} />
                </div>
                <h4>Smart Money Concepts (SMC) & ICT</h4>
                <p>
                  Auto-detects Break of Structure (BOS), Change of Character (CHOCH), Order Blocks, Fair Value
                  Gaps (FVG), and ICT Killzones (Asia, London, New York).
                </p>
              </div>

              <div className="module-card">
                <div className="module-icon">
                  <Sparkles size={24} />
                </div>
                <h4>Predictive & Adaptive Tools</h4>
                <p>
                  AI Price Forecast analyzes historical data to project future price paths. Adaptive Trend
                  Finder finds statistically relevant trends. Probabilistic Highs & Lows with AI-Threshold.
                </p>
              </div>

              <div className="module-card">
                <div className="module-icon">
                  <LineChart size={24} />
                </div>
                <h4>Automated Fibonacci & S/R</h4>
                <p>
                  Auto-draws Fibonacci Retracement/Extension levels, Time Zones, and significant horizontal
                  Support/Resistance levels.
                </p>
              </div>

              <div className="module-card">
                <div className="module-icon">
                  <Activity size={24} />
                </div>
                <h4>AI-Enhanced RSI</h4>
                <p>
                  Uses AI-supported calculations to create dynamic bands that adapt to current market conditions
                  instead of fixed 70/30 levels.
                </p>
              </div>

              <div className="module-card">
                <div className="module-icon">
                  <Settings size={24} />
                </div>
                <h4>Modular Configuration</h4>
                <p>
                  Enable only the tools you need via the master switchboard settings panel. Combine any modules
                  to create your custom trading system.
                </p>
              </div>
            </div>

            <div className="smc-features">
              <h3>Smart Money Concepts Features</h3>
              <div className="smc-grid">
                <div className="smc-item">
                  <span className="smc-tag">BOS</span>
                  <span>Break of Structure</span>
                </div>
                <div className="smc-item">
                  <span className="smc-tag">CHOCH</span>
                  <span>Change of Character</span>
                </div>
                <div className="smc-item">
                  <span className="smc-tag">OB</span>
                  <span>Order Blocks</span>
                </div>
                <div className="smc-item">
                  <span className="smc-tag">FVG</span>
                  <span>Fair Value Gaps</span>
                </div>
                <div className="smc-item">
                  <span className="smc-tag">Killzones</span>
                  <span>Asia, London, New York Sessions</span>
                </div>
                <div className="smc-item">
                  <span className="smc-tag">Daily Bias</span>
                  <span>ICT Directional Sentiment</span>
                </div>
              </div>
            </div>

            {/* Complete Settings Reference */}
            <div className="settings-section full-width">
              <h3>
                <Settings size={18} />
                Complete Settings Reference
              </h3>

              {/* Master Feature Switches */}
              <div className="settings-category">
                <button className="category-header" onClick={() => toggleSettings('ta-features')}>
                  <h4 className="category-title">AI-Powered Algorithm Features</h4>
                  <ChevronDown size={18} className={`category-chevron ${expandedSettings.includes('ta-features') ? 'open' : ''}`} />
                </button>
                {expandedSettings.includes('ta-features') && (
                <div className="category-content">
                <div className="params-table">
                  <div className="param-row header">
                    <span>Feature</span>
                    <span>Default</span>
                    <span>Description</span>
                  </div>
                  <div className="param-row">
                    <span className="param-name">ICT Killzone</span>
                    <span className="param-default">Off</span>
                    <span className="param-desc">Highlight trading session times (Asia, London, New York) with timezone selection (GMT-12 to GMT+14).</span>
                  </div>
                  <div className="param-row">
                    <span className="param-name">ICT Daily Bias</span>
                    <span className="param-default">Off</span>
                    <span className="param-desc">The daily bias refers to overall sentiment or direction expected within a trading day.</span>
                  </div>
                  <div className="param-row">
                    <span className="param-name">Fibonacci Levels</span>
                    <span className="param-default">Off</span>
                    <span className="param-desc">Auto-draw Fibonacci retracements and extensions. Options: Pivot Points, Retracements, Extensions, or combinations.</span>
                  </div>
                  <div className="param-row">
                    <span className="param-name">Time Zones</span>
                    <span className="param-default">Off</span>
                    <span className="param-desc">Fibonacci-based time projection zones.</span>
                  </div>
                  <div className="param-row">
                    <span className="param-name">Smart Money Concepts</span>
                    <span className="param-default">Off</span>
                    <span className="param-desc">Auto-detect BOS, CHOCH, Order Blocks, FVG - combination of key level strategy with market structure.</span>
                  </div>
                  <div className="param-row">
                    <span className="param-name">Price Forecast</span>
                    <span className="param-default">Off</span>
                    <span className="param-desc">AI-powered price prediction by analyzing backtest data. Engine options: ChatGPT or Gemini.</span>
                  </div>
                  <div className="param-row">
                    <span className="param-name">Technical Analysis</span>
                    <span className="param-default">Off</span>
                    <span className="param-desc">Instant price analysis dashboard using multiple indicators. Toggle &ldquo;Simple&rdquo; for minimal view.</span>
                  </div>
                  <div className="param-row">
                    <span className="param-name">High and Low</span>
                    <span className="param-default">On</span>
                    <span className="param-desc">Shows percentage probability that highs/lows will return based on trend strength.</span>
                  </div>
                  <div className="param-row">
                    <span className="param-name">AI-Threshold</span>
                    <span className="param-default">On</span>
                    <span className="param-desc">AI-calculated threshold levels for probabilistic analysis.</span>
                  </div>
                  <div className="param-row">
                    <span className="param-name">Support/Resistance</span>
                    <span className="param-default">Off</span>
                    <span className="param-desc">Auto-draw significant horizontal S/R levels. Line styles: Solid, Dotted, Dashed.</span>
                  </div>
                  <div className="param-row">
                    <span className="param-name">Trend Finder</span>
                    <span className="param-default">On</span>
                    <span className="param-desc">AI-powered current trend identification and tracking.</span>
                  </div>
                  <div className="param-row">
                    <span className="param-name">RSI</span>
                    <span className="param-default">Off</span>
                    <span className="param-desc">AI-enhanced RSI with dynamic overbought/oversold bands instead of fixed 70/30.</span>
                  </div>
                </div>
                </div>
                )}
              </div>

              {/* Fibonacci Settings */}
              <div className="settings-category">
                <button className="category-header" onClick={() => toggleSettings('ta-fib')}>
                  <h4 className="category-title">Fibonacci Levels Configuration</h4>
                  <ChevronDown size={18} className={`category-chevron ${expandedSettings.includes('ta-fib') ? 'open' : ''}`} />
                </button>
                {expandedSettings.includes('ta-fib') && (
                <div className="category-content">
                <div className="params-table">
                  <div className="param-row header">
                    <span>Tool Type</span>
                    <span>Levels</span>
                    <span>Description</span>
                  </div>
                  <div className="param-row">
                    <span className="param-name">Pivot Points</span>
                    <span className="param-range">Auto</span>
                    <span className="param-desc">Based on detected ZigZag pivots.</span>
                  </div>
                  <div className="param-row">
                    <span className="param-name">Retracements</span>
                    <span className="param-range">0, 0.236, 0.382, 0.5, 0.618, 0.786, 1.0</span>
                    <span className="param-desc">Standard Fibonacci retracement levels.</span>
                  </div>
                  <div className="param-row">
                    <span className="param-name">Extensions</span>
                    <span className="param-range">1.272, 1.618, 2.0, 2.618</span>
                    <span className="param-desc">Fibonacci extension targets.</span>
                  </div>
                  <div className="param-row">
                    <span className="param-name">Time Zones</span>
                    <span className="param-range">Fibonacci sequence</span>
                    <span className="param-desc">Vertical time projections based on Fibonacci numbers.</span>
                  </div>
                </div>
                </div>
                )}
              </div>

              {/* HTF Auto Selection */}
              <div className="settings-category">
                <button className="category-header" onClick={() => toggleSettings('ta-htf')}>
                  <h4 className="category-title">Higher Timeframe Auto-Selection</h4>
                  <ChevronDown size={18} className={`category-chevron ${expandedSettings.includes('ta-htf') ? 'open' : ''}`} />
                </button>
                {expandedSettings.includes('ta-htf') && (
                <div className="category-content">
                <div className="params-table">
                  <div className="param-row header">
                    <span>Current TF</span>
                    <span>Auto HTF</span>
                    <span>Logic</span>
                  </div>
                  <div className="param-row">
                    <span className="param-name">1 minute</span>
                    <span className="param-default">4 hour</span>
                    <span className="param-desc">240× multiplier for intraday context</span>
                  </div>
                  <div className="param-row">
                    <span className="param-name">3 minute</span>
                    <span className="param-default">4 hour</span>
                    <span className="param-desc">Intraday to swing context</span>
                  </div>
                  <div className="param-row">
                    <span className="param-name">5 minute</span>
                    <span className="param-default">Daily</span>
                    <span className="param-desc">Scalp to daily context</span>
                  </div>
                  <div className="param-row">
                    <span className="param-name">15-60 minute</span>
                    <span className="param-default">Weekly</span>
                    <span className="param-desc">Intraday to weekly context</span>
                  </div>
                  <div className="param-row">
                    <span className="param-name">Daily+</span>
                    <span className="param-default">Monthly</span>
                    <span className="param-desc">Swing to position context</span>
                  </div>
                </div>
                </div>
                )}
              </div>

              {/* Alert System */}
              <div className="settings-category">
                <button className="category-header" onClick={() => toggleSettings('ta-alerts')}>
                  <h4 className="category-title">Smart Alerts System</h4>
                  <ChevronDown size={18} className={`category-chevron ${expandedSettings.includes('ta-alerts') ? 'open' : ''}`} />
                </button>
                {expandedSettings.includes('ta-alerts') && (
                <div className="category-content">
                <div className="params-table">
                  <div className="param-row header">
                    <span>Alert Type</span>
                    <span>Default</span>
                    <span>Description</span>
                  </div>
                  <div className="param-row">
                    <span className="param-name">Fibonacci Levels (All Alerts)</span>
                    <span className="param-default">Off</span>
                    <span className="param-desc">Alert when price crosses any Fibonacci level.</span>
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
                Need more help? Contact us at{' '}
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
        }

        .doc-section {
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid rgba(255, 255, 255, 0.06);
          border-radius: 1.25rem;
          padding: 2rem;
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
