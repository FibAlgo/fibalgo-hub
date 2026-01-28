'use client';

import { useState, useEffect } from 'react';
import { 
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Clock
} from 'lucide-react';

type Importance = 'high' | 'medium' | 'low';
type EventCategory = 'economic' | 'crypto' | 'earnings' | 'fed' | 'ipo' | 'other';

interface CalendarEvent {
  id: string;
  title: string;
  description: string;
  date: string;
  time?: string;
  importance: Importance;
  category: EventCategory;
  country?: string;
  type?: 'macro' | 'crypto';
  currency?: string;
  previous?: string;
  forecast?: string;
  actual?: string;
  unit?: string;
}

// Country flags
const getCountryFlag = (country?: string): string => {
  const flags: Record<string, string> = {
    'US': 'ğŸ‡ºğŸ‡¸', 'EU': 'ğŸ‡ªğŸ‡º', 'GB': 'ğŸ‡¬ğŸ‡§', 'JP': 'ğŸ‡¯ğŸ‡µ', 'CN': 'ğŸ‡¨ğŸ‡³',
    'DE': 'ğŸ‡©ğŸ‡ª', 'FR': 'ğŸ‡«ğŸ‡·', 'CA': 'ğŸ‡¨ğŸ‡¦', 'AU': 'ğŸ‡¦ğŸ‡º', 'CH': 'ğŸ‡¨ğŸ‡­',
    'NZ': 'ğŸ‡³ğŸ‡¿', 'KR': 'ğŸ‡°ğŸ‡·', 'IN': 'ğŸ‡®ğŸ‡³', 'BR': 'ğŸ‡§ğŸ‡·', 'MX': 'ğŸ‡²ğŸ‡½',
  };
  return flags[country || ''] || 'ğŸŒ';
};

// Impact indicator component
const ImpactIndicator = ({ importance }: { importance: Importance }) => {
  const colors = {
    high: ['#EF4444', '#EF4444', '#EF4444'],
    medium: ['#F59E0B', '#F59E0B', '#374151'],
    low: ['#6B7280', '#374151', '#374151']
  };
  
  return (
    <div style={{ display: 'flex', gap: '2px' }}>
      {colors[importance].map((color, i) => (
        <div
          key={i}
          style={{
            width: '4px',
            height: '16px',
            borderRadius: '2px',
            background: color
          }}
        />
      ))}
    </div>
  );
};

// Format time for display
const formatEventTime = (time?: string, eventType?: string) => {
  if (!time) return 'â€”';
  if (time.includes('Before') || time.includes('After')) return time;
  
  try {
    const date = new Date(time);
    if (isNaN(date.getTime())) return time;
    
    // Crypto events usually don't have specific times
    const hours = date.getUTCHours();
    const minutes = date.getUTCMinutes();
    if (hours === 0 && minutes === 0 && eventType === 'crypto') {
      return 'TBA';
    }
    
    // Format as HH:MM
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false 
    });
  } catch {
    return time;
  }
};

// Group events by date
const groupEventsByDate = (events: CalendarEvent[]) => {
  const grouped: Record<string, CalendarEvent[]> = {};
  events.forEach(event => {
    const dateKey = event.date;
    if (!grouped[dateKey]) {
      grouped[dateKey] = [];
    }
    grouped[dateKey].push(event);
  });
  return grouped;
};

// Format date header
const formatDateHeader = (dateStr: string) => {
  const date = new Date(dateStr);
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  if (date.toDateString() === today.toDateString()) {
    return { day: 'Today', date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), isToday: true };
  }
  if (date.toDateString() === tomorrow.toDateString()) {
    return { day: 'Tomorrow', date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), isToday: false };
  }
  return { 
    day: date.toLocaleDateString('en-US', { weekday: 'short' }), 
    date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    isToday: false
  };
};

export default function CalendarPage() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [analyses, setAnalyses] = useState<{
    daily: any | null;
    weekly: any | null;
    monthly: any | null;
  } | null>(null);
  const [macroAnalysis, setMacroAnalysis] = useState<{
    daily: any | null;
    weekly: any | null;
    monthly: any | null;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date()); // Changed to single date
  const [filter, setFilter] = useState<'all' | 'high' | 'medium'>('all');
  const [countryFilter, setCountryFilter] = useState<string>('all');
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [showOutlook, setShowOutlook] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [outlookTab, setOutlookTab] = useState<'forex' | 'crypto'>('forex'); // NEW: Forex/Crypto tab

  // Fetch macro analysis from news aggregate
  const fetchMacroAnalysis = async () => {
    try {
      const [daily, weekly, monthly] = await Promise.all([
        fetch('/api/cron/analyze-news-aggregate?period=daily').then(r => r.json()),
        fetch('/api/cron/analyze-news-aggregate?period=weekly').then(r => r.json()),
        fetch('/api/cron/analyze-news-aggregate?period=monthly').then(r => r.json())
      ]);
      
      setMacroAnalysis({
        daily: daily.analysis || null,
        weekly: weekly.analysis || null,
        monthly: monthly.analysis || null
      });
    } catch (error) {
      console.error('Failed to fetch macro analysis:', error);
    }
  };

  // Get date range for selected date (single day or week view)
  const getDateRange = () => {
    const start = new Date(selectedDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(selectedDate);
    end.setHours(23, 59, 59, 999);
    return { start, end };
  };

  const dateRange = getDateRange();

  // Fetch calendar data
  const fetchCalendar = async () => {
    setIsLoading(true);
    try {
      // Fetch week's data to show in list
      const weekStart = new Date(selectedDate);
      weekStart.setDate(selectedDate.getDate() - selectedDate.getDay() + 1);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);
      
      const from = weekStart.toISOString().split('T')[0];
      const to = weekEnd.toISOString().split('T')[0];

      const response = await fetch(`/api/calendar?from=${from}&to=${to}`);
      const data = await response.json();

      if (data.success) {
        setEvents(data.events);
        setLastUpdated(new Date());
        if (data.analyses) {
          setAnalyses(data.analyses);
        }
      }
    } catch (error) {
      console.error('Failed to fetch calendar:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCalendar();
    fetchMacroAnalysis();
  }, [selectedDate.toDateString()]); // React to date changes

  // Filter events
  const filteredEvents = events.filter(event => {
    if (filter === 'high' && event.importance !== 'high') return false;
    if (filter === 'medium' && event.importance === 'low') return false;
    if (countryFilter !== 'all' && event.country !== countryFilter) return false;
    return true;
  });

  // Filter for selected date only
  const selectedDateStr = selectedDate.toISOString().split('T')[0];
  const selectedDayEvents = filteredEvents.filter(e => e.date === selectedDateStr);

  // Group by date (for display)
  const groupedEvents = groupEventsByDate(selectedDayEvents);
  const sortedDates = Object.keys(groupedEvents).sort((a, b) => 
    new Date(a).getTime() - new Date(b).getTime()
  );

  // Get unique countries for filter
  const countries = [...new Set(events.map(e => e.country).filter(Boolean))];

  // Date navigation helpers
  const goToDay = (offset: number) => {
    const newDate = new Date(selectedDate);
    newDate.setDate(selectedDate.getDate() + offset);
    setSelectedDate(newDate);
  };

  const isToday = selectedDate.toDateString() === new Date().toDateString();
  
  const formatDateLabel = () => {
    return selectedDate.toLocaleDateString('en-US', { 
      weekday: 'long',
      month: 'long', 
      day: 'numeric', 
      year: 'numeric' 
    });
  };

  return (
    <div style={{ 
      height: '100%', 
      overflow: 'auto',
      background: '#000'
    }}>
      {/* Header */}
      <div style={{
        position: 'sticky',
        top: 0,
        background: '#000',
        borderBottom: '1px solid rgba(255,255,255,0.1)',
        padding: '1rem 1.5rem',
        zIndex: 10
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, rgba(0,245,255,0.2), rgba(139,92,246,0.2))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Clock size={22} color="#00F5FF" />
            </div>
            <div>
              <h1 style={{ color: '#fff', fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>
                Economic Calendar
              </h1>
              <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.8rem', margin: 0 }}>
                {lastUpdated ? `Updated ${lastUpdated.toLocaleTimeString()}` : 'Loading...'}
              </p>
            </div>
          </div>

          <button
            onClick={fetchCalendar}
            disabled={isLoading}
            style={{
              background: 'rgba(0,245,255,0.1)',
              border: '1px solid rgba(0,245,255,0.3)',
              borderRadius: '8px',
              padding: '0.5rem 1rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              color: '#00F5FF',
              fontSize: '0.85rem'
            }}
          >
            <RefreshCw size={16} style={{ animation: isLoading ? 'spin 1s linear infinite' : 'none' }} />
            Refresh
          </button>
        </div>

        {/* Day Navigation */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          marginBottom: '1rem'
        }}>
          <button
            onClick={() => goToDay(-1)}
            style={{
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '8px',
              padding: '0.5rem 1rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.25rem',
              color: '#fff',
              fontSize: '0.85rem'
            }}
          >
            <ChevronLeft size={18} />
            Previous
          </button>
          
          <div style={{ textAlign: 'center' }}>
            <div style={{ color: '#fff', fontSize: '1rem', fontWeight: 600 }}>
              {formatDateLabel()}
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', marginTop: '0.25rem' }}>
              {isToday && (
                <span style={{ 
                  background: 'rgba(0,245,255,0.2)', 
                  color: '#00F5FF', 
                  fontSize: '0.7rem', 
                  padding: '0.15rem 0.5rem', 
                  borderRadius: '4px',
                  fontWeight: 500
                }}>
                  Today
                </span>
              )}
              {!isToday && (
                <button
                  onClick={() => setSelectedDate(new Date())}
                  style={{
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    color: '#00F5FF',
                    fontSize: '0.65rem',
                    padding: '0.15rem 0.5rem',
                    borderRadius: '4px',
                    cursor: 'pointer'
                  }}
                >
                  Go to Today
                </button>
              )}
            </div>
          </div>
          
          <button
            onClick={() => goToDay(1)}
            style={{
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '8px',
              padding: '0.5rem 1rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.25rem',
              color: '#fff',
              fontSize: '0.85rem'
            }}
          >
            Next
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      {/* Market Outlook Section - Professional Trading Dashboard Style */}
      {analyses && (analyses.daily || analyses.weekly || analyses.monthly) && (
        <div style={{
          margin: '0 1.5rem 1rem',
          background: '#0A0A0F',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '8px',
          overflow: 'hidden'
        }}>
          {/* Header with Tabs */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid rgba(255,255,255,0.08)',
            background: 'rgba(255,255,255,0.02)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <div style={{
                  padding: '0.75rem 1rem',
                  borderRight: '1px solid rgba(255,255,255,0.08)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}>
                  <div style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    background: '#22C55E',
                    animation: 'pulse 2s infinite'
                  }} />
                  <span style={{ color: '#fff', fontSize: '0.8rem', fontWeight: 600, letterSpacing: '0.5px' }}>
                    MARKET OUTLOOK
                  </span>
                </div>
                
                {/* Period Tabs */}
                <div style={{ display: 'flex' }}>
                  {(['daily', 'weekly', 'monthly'] as const).map((period) => {
                    const analysis = analyses[period];
                    if (!analysis) return null;
                    const labels = { daily: 'TODAY', weekly: 'WEEK', monthly: 'MONTH' };
                    return (
                      <button
                        key={period}
                        onClick={() => setShowOutlook(period)}
                        style={{
                          padding: '0.75rem 1.25rem',
                          background: showOutlook === period ? 'rgba(0,245,255,0.08)' : 'transparent',
                          border: 'none',
                          borderBottom: showOutlook === period ? '2px solid #00F5FF' : '2px solid transparent',
                          color: showOutlook === period ? '#00F5FF' : 'rgba(255,255,255,0.4)',
                          fontSize: '0.7rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                          transition: 'all 0.15s',
                          letterSpacing: '0.5px'
                        }}
                      >
                        {labels[period]}
                      </button>
                    );
                  })}
                </div>
              </div>
              
              {/* FOREX / CRYPTO Tabs */}
              <div style={{ display: 'flex', gap: '0.25rem', marginRight: '1rem' }}>
                <button
                  onClick={() => setOutlookTab('forex')}
                  style={{
                    padding: '0.4rem 0.75rem',
                    background: outlookTab === 'forex' ? 'rgba(59,130,246,0.2)' : 'rgba(255,255,255,0.05)',
                    border: outlookTab === 'forex' ? '1px solid rgba(59,130,246,0.4)' : '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '4px',
                    color: outlookTab === 'forex' ? '#3B82F6' : 'rgba(255,255,255,0.5)',
                    fontSize: '0.65rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.15s'
                  }}
                >
                  FOREX
                </button>
                <button
                  onClick={() => setOutlookTab('crypto')}
                  style={{
                    padding: '0.4rem 0.75rem',
                    background: outlookTab === 'crypto' ? 'rgba(245,158,11,0.2)' : 'rgba(255,255,255,0.05)',
                    border: outlookTab === 'crypto' ? '1px solid rgba(245,158,11,0.4)' : '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '4px',
                    color: outlookTab === 'crypto' ? '#F59E0B' : 'rgba(255,255,255,0.5)',
                    fontSize: '0.65rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.15s'
                  }}
                >
                  CRYPTO
                </button>
              </div>
            </div>
            
            {/* Last Updated */}
            <div style={{ padding: '0 1rem', color: 'rgba(255,255,255,0.3)', fontSize: '0.65rem' }}>
              {analyses[showOutlook]?.analyzed_at && 
                `Updated ${new Date(analyses[showOutlook].analyzed_at).toLocaleTimeString()}`
              }
            </div>
          </div>

          {/* Content */}
          {(() => {
            const currentAnalysis = analyses[showOutlook];
            if (!currentAnalysis) return null;
            
            // Use new confidence field or fallback to outlook_score
            const score = currentAnalysis.confidence || currentAnalysis.outlook_score || 5;
            const gaugeRotation = ((score - 1) / 9) * 180 - 90; // -90 to 90 degrees
            
            // Get market regime color
            const getRegimeColor = (regime: string) => {
              switch(regime) {
                case 'risk-on': return '#22C55E';
                case 'risk-off': return '#EF4444';
                case 'transition': return '#F59E0B';
                default: return '#9CA3AF';
              }
            };
            
            const marketRegime = currentAnalysis.market_regime || currentAnalysis.overall_outlook || 'neutral';
            const macroBias = currentAnalysis.macro_bias || (currentAnalysis.outlook_score > 6 ? 'bullish' : currentAnalysis.outlook_score < 4 ? 'bearish' : 'neutral');
            
            return (
              <div style={{ display: 'flex' }}>
                {/* Left Panel - Key Metrics */}
                <div style={{
                  width: '280px',
                  borderRight: '1px solid rgba(255,255,255,0.08)',
                  padding: '1rem'
                }}>
                  {/* Outlook Gauge */}
                  <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
                    <div style={{
                      width: '120px',
                      height: '60px',
                      margin: '0 auto',
                      position: 'relative',
                      overflow: 'hidden'
                    }}>
                      {/* Gauge Background */}
                      <div style={{
                        width: '120px',
                        height: '120px',
                        borderRadius: '50%',
                        background: `conic-gradient(
                          from 180deg,
                          #EF4444 0deg,
                          #F59E0B 60deg,
                          #22C55E 120deg,
                          #22C55E 180deg,
                          transparent 180deg
                        )`,
                        opacity: 0.3
                      }} />
                      {/* Gauge Needle */}
                      <div style={{
                        position: 'absolute',
                        bottom: '0',
                        left: '50%',
                        width: '4px',
                        height: '50px',
                        background: 'linear-gradient(to top, #fff, transparent)',
                        transformOrigin: 'bottom center',
                        transform: `translateX(-50%) rotate(${gaugeRotation}deg)`,
                        borderRadius: '2px'
                      }} />
                      {/* Center dot */}
                      <div style={{
                        position: 'absolute',
                        bottom: '-4px',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        width: '12px',
                        height: '12px',
                        borderRadius: '50%',
                        background: '#fff',
                        border: '2px solid #0A0A0F'
                      }} />
                    </div>
                    <div style={{
                      marginTop: '0.5rem',
                      fontSize: '1.5rem',
                      fontWeight: 700,
                      color: score >= 7 ? '#22C55E' : score >= 4 ? '#F59E0B' : '#EF4444'
                    }}>
                      {score}<span style={{ fontSize: '0.8rem', opacity: 0.5 }}>/10</span>
                    </div>
                    <div style={{
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      color: getRegimeColor(marketRegime),
                      textTransform: 'uppercase',
                      letterSpacing: '1px'
                    }}>
                      {marketRegime.replace('-', ' ')}
                    </div>
                  </div>
                  
                  {/* Quick Stats Grid */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '0.5rem'
                  }}>
                    {/* Market Regime */}
                    <div style={{
                      background: 'rgba(255,255,255,0.03)',
                      borderRadius: '6px',
                      padding: '0.6rem',
                      textAlign: 'center'
                    }}>
                      <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.6rem', marginBottom: '0.25rem', textTransform: 'uppercase' }}>
                        Bias
                      </div>
                      <div style={{
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        color: macroBias === 'bullish' ? '#22C55E' : 
                               macroBias === 'bearish' ? '#EF4444' : '#9CA3AF'
                      }}>
                        {macroBias?.toUpperCase()}
                      </div>
                    </div>
                    
                    {/* Volatility */}
                    <div style={{
                      background: 'rgba(255,255,255,0.03)',
                      borderRadius: '6px',
                      padding: '0.6rem',
                      textAlign: 'center'
                    }}>
                      <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.6rem', marginBottom: '0.25rem', textTransform: 'uppercase' }}>
                        Volatility
                      </div>
                      <div style={{
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        color: (currentAnalysis.volatility_regime === 'elevated' || currentAnalysis.volatility_regime === 'rising') ? '#EF4444' : 
                               currentAnalysis.volatility_regime === 'falling' ? '#22C55E' : '#F59E0B'
                      }}>
                        {(currentAnalysis.volatility_regime || currentAnalysis.volatility_expectation || 'stable')?.toUpperCase()}
                      </div>
                    </div>
                    
                    {/* Liquidity */}
                    <div style={{
                      background: 'rgba(255,255,255,0.03)',
                      borderRadius: '6px',
                      padding: '0.6rem',
                      textAlign: 'center'
                    }}>
                      <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.6rem', marginBottom: '0.25rem', textTransform: 'uppercase' }}>
                        Liquidity
                      </div>
                      <div style={{
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        color: currentAnalysis.liquidity_condition === 'easing' ? '#22C55E' : 
                               currentAnalysis.liquidity_condition === 'tightening' ? '#EF4444' : '#9CA3AF'
                      }}>
                        {(currentAnalysis.liquidity_condition || 'stable')?.toUpperCase()}
                      </div>
                    </div>
                    
                    {/* Actionability */}
                    <div style={{
                      background: 'rgba(255,255,255,0.03)',
                      borderRadius: '6px',
                      padding: '0.6rem',
                      textAlign: 'center'
                    }}>
                      <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.6rem', marginBottom: '0.25rem', textTransform: 'uppercase' }}>
                        Actionability
                      </div>
                      <div style={{ 
                        fontSize: '0.75rem', 
                        fontWeight: 600, 
                        color: currentAnalysis.actionability === 'high' ? '#22C55E' : 
                               currentAnalysis.actionability === 'medium' ? '#F59E0B' : '#6B7280'
                      }}>
                        {(currentAnalysis.actionability || 'low')?.toUpperCase()}
                      </div>
                    </div>
                  </div>
                  
                  {/* Assets in Focus */}
                  {currentAnalysis.assets_in_focus?.length > 0 && (
                    <div style={{ marginTop: '1rem' }}>
                      <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.6rem', marginBottom: '0.4rem', textTransform: 'uppercase' }}>
                        Assets in Focus
                      </div>
                      <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap' }}>
                        {currentAnalysis.assets_in_focus.slice(0, 6).map((a: string) => (
                          <span key={a} style={{
                            background: 'rgba(0,245,255,0.1)',
                            border: '1px solid rgba(0,245,255,0.2)',
                            color: '#00F5FF',
                            padding: '0.2rem 0.4rem',
                            borderRadius: '4px',
                            fontSize: '0.65rem',
                            fontWeight: 600
                          }}>
                            {a}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                
                {/* Right Panel - Analysis */}
                <div style={{ flex: 1, padding: '1rem' }}>
                  {/* Dominant Themes */}
                  {currentAnalysis.dominant_themes?.length > 0 && (
                    <div style={{ marginBottom: '1rem' }}>
                      <div style={{ 
                        color: 'rgba(255,255,255,0.4)', 
                        fontSize: '0.65rem', 
                        marginBottom: '0.4rem', 
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem'
                      }}>
                        <span style={{ width: '4px', height: '4px', borderRadius: '50%', background: '#8B5CF6' }} />
                        Dominant Themes
                      </div>
                      <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap' }}>
                        {currentAnalysis.dominant_themes.map((t: any, i: number) => (
                          <span key={i} style={{
                            background: 'rgba(139,92,246,0.1)',
                            border: '1px solid rgba(139,92,246,0.2)',
                            color: '#A78BFA',
                            padding: '0.25rem 0.5rem',
                            borderRadius: '4px',
                            fontSize: '0.7rem',
                            fontWeight: 500
                          }}>
                            {typeof t === 'string' ? t : t.theme}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Positioning Implication */}
                  {currentAnalysis.positioning_implication && (
                    <div style={{ marginBottom: '1rem' }}>
                      <div style={{ 
                        color: 'rgba(255,255,255,0.4)', 
                        fontSize: '0.65rem', 
                        marginBottom: '0.4rem', 
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem'
                      }}>
                        <span style={{ width: '4px', height: '4px', borderRadius: '50%', background: '#00F5FF' }} />
                        Positioning Implication
                      </div>
                      <p style={{ 
                        color: 'rgba(255,255,255,0.9)', 
                        fontSize: '0.85rem', 
                        lineHeight: 1.6, 
                        margin: 0,
                        borderLeft: '2px solid rgba(0,245,255,0.3)',
                        paddingLeft: '0.75rem'
                      }}>
                        {currentAnalysis.positioning_implication}
                      </p>
                    </div>
                  )}
                  
                  {/* Risk Assessment */}
                  {currentAnalysis.risk_assessment && (
                    <div style={{
                      background: 'rgba(239,68,68,0.05)',
                      border: '1px solid rgba(239,68,68,0.15)',
                      borderRadius: '6px',
                      padding: '0.75rem',
                      marginBottom: '1rem'
                    }}>
                      <div style={{ 
                        color: '#EF4444', 
                        fontSize: '0.65rem', 
                        marginBottom: '0.4rem', 
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                        fontWeight: 600,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem'
                      }}>
                        <span>âš </span>
                        Risk Assessment
                      </div>
                      <p style={{ 
                        color: '#F87171', 
                        fontSize: '0.8rem', 
                        lineHeight: 1.5, 
                        margin: 0 
                      }}>
                        {currentAnalysis.risk_assessment}
                      </p>
                    </div>
                  )}
                  
                  {/* Notes / Executive Summary fallback */}
                  {(currentAnalysis.notes || currentAnalysis.executive_summary) && (
                    <div style={{ marginBottom: '1rem' }}>
                      <div style={{ 
                        color: 'rgba(255,255,255,0.4)', 
                        fontSize: '0.65rem', 
                        marginBottom: '0.4rem', 
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem'
                      }}>
                        <span style={{ width: '4px', height: '4px', borderRadius: '50%', background: '#22C55E' }} />
                        Analyst Notes
                      </div>
                      <p style={{ 
                        color: 'rgba(255,255,255,0.7)', 
                        fontSize: '0.8rem', 
                        lineHeight: 1.5, 
                        margin: 0,
                        borderLeft: '2px solid rgba(34,197,94,0.3)',
                        paddingLeft: '0.75rem'
                      }}>
                        {currentAnalysis.notes || currentAnalysis.executive_summary}
                      </p>
                    </div>
                  )}
                  
                  {/* Legacy: Trading Implications */}
                  {currentAnalysis.trading_implications && !currentAnalysis.positioning_implication && (
                    <div style={{ marginBottom: '1rem' }}>
                      <div style={{ 
                        color: 'rgba(255,255,255,0.4)', 
                        fontSize: '0.65rem', 
                        marginBottom: '0.4rem', 
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem'
                      }}>
                        <span style={{ width: '4px', height: '4px', borderRadius: '50%', background: '#22C55E' }} />
                        Trading Implications
                      </div>
                      <p style={{ 
                        color: 'rgba(255,255,255,0.7)', 
                        fontSize: '0.8rem', 
                        lineHeight: 1.5, 
                        margin: 0,
                        borderLeft: '2px solid rgba(34,197,94,0.3)',
                        paddingLeft: '0.75rem'
                      }}>
                        {currentAnalysis.trading_implications}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* Filters */}
      <div style={{ 
        display: 'flex', 
        gap: '0.5rem', 
        flexWrap: 'wrap',
        alignItems: 'center',
        padding: '0.75rem 1.5rem',
        background: 'rgba(255,255,255,0.02)',
        borderBottom: '1px solid rgba(255,255,255,0.1)'
      }}>
        {/* Impact Filter */}
        <div style={{ display: 'flex', gap: '0.25rem', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', padding: '0.25rem' }}>
          {(['all', 'high', 'medium'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              style={{
                padding: '0.4rem 0.75rem',
                borderRadius: '6px',
                border: 'none',
                background: filter === f ? 'rgba(0,245,255,0.2)' : 'transparent',
                color: filter === f ? '#00F5FF' : 'rgba(255,255,255,0.6)',
                fontSize: '0.8rem',
                fontWeight: 500,
                cursor: 'pointer'
              }}
            >
              {f === 'all' ? 'All' : f === 'high' ? 'ğŸ”´ High' : 'ğŸŸ  Med+'}
            </button>
          ))}
        </div>

        {/* Country Filter */}
        <select
          value={countryFilter}
          onChange={(e) => setCountryFilter(e.target.value)}
          style={{
            background: '#000',
            border: '1px solid rgba(255,255,255,0.2)',
            borderRadius: '8px',
            padding: '0.4rem 0.75rem',
            color: '#fff',
            fontSize: '0.8rem',
            cursor: 'pointer'
          }}
        >
          <option value="all">ğŸŒ All Countries</option>
          {countries.map(c => (
            <option key={c} value={c}>{getCountryFlag(c)} {c}</option>
          ))}
        </select>
      </div>

      {/* Table Header */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '80px 40px 50px 1fr 90px 90px 90px',
        gap: '0.5rem',
        padding: '0.75rem 1.5rem',
        borderBottom: '1px solid rgba(255,255,255,0.1)',
        background: 'rgba(255,255,255,0.02)',
        position: 'sticky',
        top: '165px',
        zIndex: 9
      }}>
        <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.7rem', fontWeight: 600, textTransform: 'uppercase' }}>Time</div>
        <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.7rem', fontWeight: 600 }}></div>
        <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.7rem', fontWeight: 600, textTransform: 'uppercase' }}>Impact</div>
        <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.7rem', fontWeight: 600, textTransform: 'uppercase' }}>Event</div>
        <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.7rem', fontWeight: 600, textAlign: 'right', textTransform: 'uppercase' }}>Actual</div>
        <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.7rem', fontWeight: 600, textAlign: 'right', textTransform: 'uppercase' }}>Forecast</div>
        <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.7rem', fontWeight: 600, textAlign: 'right', textTransform: 'uppercase' }}>Previous</div>
      </div>

      {/* Events List */}
      <div style={{ padding: '0 0 2rem 0' }}>
        {isLoading ? (
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            padding: '4rem',
            color: 'rgba(255,255,255,0.5)'
          }}>
            <RefreshCw size={24} style={{ animation: 'spin 1s linear infinite', marginRight: '0.5rem' }} />
            Loading events...
          </div>
        ) : sortedDates.length === 0 ? (
          <div style={{ 
            textAlign: 'center', 
            padding: '4rem',
            color: 'rgba(255,255,255,0.5)'
          }}>
            No events found for this period
          </div>
        ) : (
          sortedDates.map(dateKey => {
            const dateHeader = formatDateHeader(dateKey);
            const dayEvents = groupedEvents[dateKey];
            
            return (
              <div key={dateKey}>
                {/* Date Header */}
                <div style={{
                  padding: '0.75rem 1.5rem',
                  background: dateHeader.isToday ? 'rgba(0,245,255,0.05)' : 'rgba(255,255,255,0.02)',
                  borderBottom: '1px solid rgba(255,255,255,0.05)',
                  borderLeft: dateHeader.isToday ? '3px solid #00F5FF' : '3px solid transparent',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}>
                  <span style={{ 
                    color: dateHeader.isToday ? '#00F5FF' : '#fff', 
                    fontWeight: 600,
                    fontSize: '0.9rem'
                  }}>
                    {dateHeader.day}
                  </span>
                  <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.85rem' }}>
                    {dateHeader.date}
                  </span>
                  <span style={{ 
                    color: 'rgba(255,255,255,0.4)', 
                    fontSize: '0.75rem',
                    marginLeft: 'auto'
                  }}>
                    {dayEvents.length} event{dayEvents.length !== 1 ? 's' : ''}
                  </span>
                </div>

                {/* Events for this date */}
                {dayEvents.map((event) => (
                  <div
                    key={event.id}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '80px 40px 50px 1fr 90px 90px 90px',
                      gap: '0.5rem',
                      padding: '0.65rem 1.5rem',
                      borderBottom: '1px solid rgba(255,255,255,0.03)',
                      alignItems: 'center',
                      transition: 'background 0.15s'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    {/* Time */}
                    <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.8rem', fontFamily: 'monospace' }}>
                      {formatEventTime(event.time, event.type)}
                    </div>

                    {/* Country Flag */}
                    <div style={{ fontSize: '1.1rem' }}>
                      {getCountryFlag(event.country)}
                    </div>

                    {/* Impact */}
                    <div>
                      <ImpactIndicator importance={event.importance} />
                    </div>

                    {/* Event Title */}
                    <div>
                      <div style={{ 
                        color: event.importance === 'high' ? '#fff' : 'rgba(255,255,255,0.85)', 
                        fontSize: '0.85rem',
                        fontWeight: event.importance === 'high' ? 600 : 400,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem'
                      }}>
                        {event.title}
                        {event.type && (
                          <span style={{
                            background: event.type === 'crypto' ? 'rgba(245,158,11,0.15)' : 'rgba(59,130,246,0.15)',
                            border: event.type === 'crypto' ? '1px solid rgba(245,158,11,0.3)' : '1px solid rgba(59,130,246,0.3)',
                            color: event.type === 'crypto' ? '#F59E0B' : '#3B82F6',
                            padding: '0.1rem 0.35rem',
                            borderRadius: '3px',
                            fontSize: '0.6rem',
                            fontWeight: 600,
                            textTransform: 'uppercase',
                            letterSpacing: '0.5px'
                          }}>
                            {event.type === 'crypto' ? 'CRYPTO' : 'FOREX'}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Actual */}
                    <div style={{ 
                      textAlign: 'right',
                      color: event.actual ? (
                        event.forecast && parseFloat(event.actual) > parseFloat(event.forecast) ? '#22C55E' :
                        event.forecast && parseFloat(event.actual) < parseFloat(event.forecast) ? '#EF4444' : '#fff'
                      ) : 'rgba(255,255,255,0.25)',
                      fontSize: '0.8rem',
                      fontWeight: event.actual ? 600 : 400,
                      fontFamily: 'monospace'
                    }}>
                      {event.actual || 'â€”'}
                    </div>

                    {/* Forecast */}
                    <div style={{ 
                      textAlign: 'right',
                      color: 'rgba(255,255,255,0.5)',
                      fontSize: '0.8rem',
                      fontFamily: 'monospace'
                    }}>
                      {event.forecast || 'â€”'}
                    </div>

                    {/* Previous */}
                    <div style={{ 
                      textAlign: 'right',
                      color: 'rgba(255,255,255,0.35)',
                      fontSize: '0.8rem',
                      fontFamily: 'monospace'
                    }}>
                      {event.previous || 'â€”'}
                    </div>
                  </div>
                ))}
              </div>
            );
          })
        )}
      </div>

      {/* Legend */}
      <div style={{
        position: 'fixed',
        bottom: '1rem',
        right: '1rem',
        background: 'rgba(0,0,0,0.95)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: '8px',
        padding: '0.6rem 1rem',
        display: 'flex',
        gap: '1rem',
        fontSize: '0.7rem',
        backdropFilter: 'blur(10px)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <ImpactIndicator importance="high" />
          <span style={{ color: 'rgba(255,255,255,0.5)' }}>High Impact</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <ImpactIndicator importance="medium" />
          <span style={{ color: 'rgba(255,255,255,0.5)' }}>Medium</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <ImpactIndicator importance="low" />
          <span style={{ color: 'rgba(255,255,255,0.5)' }}>Low</span>
        </div>
      </div>

      <style jsx global>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

