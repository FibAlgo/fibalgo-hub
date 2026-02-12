'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import {
  X,
  Target,
  TrendingUp,
  TrendingDown,
  BarChart3,
  Clock,
  DollarSign,
  Bitcoin,
  Briefcase,
  AlertCircle,
  Loader2,
  Check,
  Search
} from 'lucide-react';

interface CreateAlertModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
  defaultSymbol?: string;
  defaultAssetType?: string;
}

type AssetType = 'crypto' | 'forex' | 'stocks' | 'commodities' | 'indices';
type AlertType = 'price_above' | 'price_below' | 'percent_change_up' | 'percent_change_down';

// Asset with price data
interface AssetWithPrice {
  symbol: string;
  name: string;
  price: number;
  change24h?: number;
}

export default function CreateAlertModal({ 
  isOpen, 
  onClose, 
  onCreated,
  defaultSymbol,
  defaultAssetType 
}: CreateAlertModalProps) {
  const t = useTranslations('alerts');

  const ALERT_TYPES: { id: AlertType; label: string; icon: React.ReactNode; color: string }[] = [
    { id: 'price_above', label: t('priceGoesAbove'), icon: <TrendingUp size={16} />, color: '#00FF88' },
    { id: 'price_below', label: t('priceGoesBelow'), icon: <TrendingDown size={16} />, color: '#FF6B6B' },
    { id: 'percent_change_up', label: t('risesByPercent'), icon: <TrendingUp size={16} />, color: '#4ECDC4' },
    { id: 'percent_change_down', label: t('dropsByPercent'), icon: <TrendingDown size={16} />, color: '#FF9F43' }
  ];

  const [step, setStep] = useState(1);
  const [assetType, setAssetType] = useState<AssetType>((defaultAssetType as AssetType) || 'crypto');
  const [symbol, setSymbol] = useState(defaultSymbol || '');
  const [assetName, setAssetName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [alertType, setAlertType] = useState<AlertType>('price_above');
  const [targetValue, setTargetValue] = useState('');
  const [repeatAlert, setRepeatAlert] = useState(false);
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [currentPrice, setCurrentPrice] = useState<number | null>(null);
  
  // Dynamic asset list from APIs
  const [availableAssets, setAvailableAssets] = useState<AssetWithPrice[]>([]);
  const [assetsLoading, setAssetsLoading] = useState(false);

  // Fetch available assets when asset type changes
  useEffect(() => {
    if (!isOpen) return;
    
    const fetchAssets = async () => {
      setAssetsLoading(true);
      try {
        let assets: AssetWithPrice[] = [];
        
        if (assetType === 'crypto') {
          // Fetch from Binance - top coins
          const symbols = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'XRPUSDT', 'BNBUSDT', 'ADAUSDT', 'DOGEUSDT', 'AVAXUSDT', 'DOTUSDT', 'MATICUSDT', 'LINKUSDT', 'LTCUSDT', 'ATOMUSDT', 'UNIUSDT', 'NEARUSDT', 'APTUSDT'];
          const names: Record<string, string> = {
            'BTCUSDT': 'Bitcoin', 'ETHUSDT': 'Ethereum', 'SOLUSDT': 'Solana', 'XRPUSDT': 'XRP',
            'BNBUSDT': 'BNB', 'ADAUSDT': 'Cardano', 'DOGEUSDT': 'Dogecoin', 'AVAXUSDT': 'Avalanche',
            'DOTUSDT': 'Polkadot', 'MATICUSDT': 'Polygon', 'LINKUSDT': 'Chainlink', 'LTCUSDT': 'Litecoin',
            'ATOMUSDT': 'Cosmos', 'UNIUSDT': 'Uniswap', 'NEARUSDT': 'NEAR', 'APTUSDT': 'Aptos'
          };
          
          const res = await fetch('https://api.binance.com/api/v3/ticker/24hr');
          if (res.ok) {
            const data = await res.json();
            assets = symbols.map(sym => {
              const ticker = data.find((t: { symbol: string }) => t.symbol === sym);
              return {
                symbol: sym,
                name: names[sym] || sym,
                price: ticker ? parseFloat(ticker.lastPrice) : 0,
                change24h: ticker ? parseFloat(ticker.priceChangePercent) : 0
              };
            }).filter(a => a.price > 0);
          }
        } else if (assetType === 'forex') {
          const res = await fetch('/api/forex');
          if (res.ok) {
            const data = await res.json();
            assets = (data.forex || []).map((f: { symbol: string; name: string; price: number; change24h: number }) => ({
              symbol: f.symbol.replace('/', ''),
              name: f.name || f.symbol,
              price: f.price,
              change24h: f.change24h
            }));
          }
        } else if (assetType === 'stocks') {
          const res = await fetch('/api/stocks');
          if (res.ok) {
            const data = await res.json();
            assets = (data.stocks || []).map((s: { symbol: string; name: string; price: number; change24h: number }) => ({
              symbol: s.symbol,
              name: s.name,
              price: s.price,
              change24h: s.change24h
            }));
          }
        } else if (assetType === 'commodities') {
          const res = await fetch('/api/commodities');
          if (res.ok) {
            const data = await res.json();
            assets = (data.commodities || []).map((c: { symbol: string; name: string; price: number; change24h: number }) => ({
              symbol: c.symbol,
              name: c.name,
              price: c.price,
              change24h: c.change24h
            }));
          }
        } else if (assetType === 'indices') {
          const res = await fetch('/api/indices');
          if (res.ok) {
            const data = await res.json();
            assets = (data.indices || []).map((i: { symbol: string; name: string; price: number; change24h: number }) => ({
              symbol: i.symbol,
              name: i.name,
              price: i.price,
              change24h: i.change24h
            }));
          }
        }
        
        setAvailableAssets(assets);
      } catch (err) {
        console.error('Error fetching assets:', err);
      } finally {
        setAssetsLoading(false);
      }
    };
    
    fetchAssets();
  }, [assetType, isOpen]);

  if (!isOpen) return null;

  // Filter assets based on search query - use dynamic assets from API
  const filteredAssets = availableAssets.filter(asset => 
    asset.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
    asset.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const selectAsset = (selectedSymbol: string, selectedName: string, selectedPrice: number) => {
    setSymbol(selectedSymbol);
    setAssetName(selectedName);
    setCurrentPrice(selectedPrice);
    setStep(2);
  };

  const selectAlertType = (type: AlertType) => {
    setAlertType(type);
    setStep(3);
  };

  const createAlert = async () => {
    if (!targetValue) {
      setError(t('enterTargetValue'));
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/user/notifications/alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symbol,
          asset_name: assetName,
          asset_type: assetType,
          alert_type: alertType,
          target_value: parseFloat(targetValue),
          repeat_alert: repeatAlert,
          note
        })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || t('failedToCreateAlert'));
      }

      onCreated();
      onClose();
      
      // Reset form
      setStep(1);
      setSymbol('');
      setAssetName('');
      setTargetValue('');
      setNote('');
      setRepeatAlert(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('failedToCreateAlert'));
    } finally {
      setLoading(false);
    }
  };

  const getAssetIcon = (type: AssetType) => {
    switch (type) {
      case 'crypto': return <Bitcoin size={16} color="#F7931A" />;
      case 'forex': return <DollarSign size={16} color="#4CAF50" />;
      case 'stocks': return <Briefcase size={16} color="#2196F3" />;
      case 'commodities': return <BarChart3 size={16} color="#9C27B0" />;
      case 'indices': return <BarChart3 size={16} color="#FF9800" />;
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div 
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.7)',
          backdropFilter: 'blur(4px)',
          zIndex: 1100
        }}
        onClick={onClose}
      />

      {/* Modal */}
      <div style={{
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: '440px',
        maxWidth: '95vw',
        maxHeight: '85vh',
        background: 'linear-gradient(180deg, #0f0f0f 0%, #141416 100%)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: '16px',
        zIndex: 1101,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {/* Header */}
        <div style={{
          padding: '1.25rem 1.5rem',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, rgba(0,245,255,0.2) 0%, rgba(0,245,255,0.05) 100%)',
              border: '1px solid rgba(0,245,255,0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Target size={18} color="#00F5FF" />
            </div>
            <div>
              <h2 style={{ color: '#fff', fontSize: '1rem', fontWeight: 600, margin: 0 }}>
                {t('createPriceAlert')}
              </h2>
              <span style={{ color: '#666', fontSize: '0.75rem' }}>
                {t('stepOf', { step })}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '8px',
              padding: '0.5rem',
              cursor: 'pointer',
              color: '#888',
              display: 'flex'
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Progress bar */}
        <div style={{
          height: '3px',
          background: 'rgba(255,255,255,0.05)'
        }}>
          <div style={{
            height: '100%',
            width: `${(step / 3) * 100}%`,
            background: 'linear-gradient(90deg, #00F5FF 0%, #00D4FF 100%)',
            transition: 'width 0.3s ease'
          }} />
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflow: 'auto', padding: '1.25rem' }}>
          {step === 1 && (
            <div>
              {/* Asset Type Tabs */}
              <div style={{
                display: 'flex',
                gap: '0.5rem',
                marginBottom: '1rem',
                flexWrap: 'wrap'
              }}>
                {(['crypto', 'forex', 'stocks', 'commodities', 'indices'] as AssetType[]).map(type => (
                  <button
                    key={type}
                    onClick={() => setAssetType(type)}
                    style={{
                      padding: '0.5rem 0.875rem',
                      background: assetType === type ? 'rgba(0,245,255,0.15)' : 'rgba(255,255,255,0.03)',
                      border: `1px solid ${assetType === type ? 'rgba(0,245,255,0.3)' : 'rgba(255,255,255,0.08)'}`,
                      borderRadius: '8px',
                      color: assetType === type ? '#00F5FF' : '#888',
                      fontSize: '0.8rem',
                      fontWeight: 500,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.375rem',
                      textTransform: 'capitalize'
                    }}
                  >
                    {getAssetIcon(type)}
                    {type}
                  </button>
                ))}
              </div>

              {/* Search */}
              <div style={{
                position: 'relative',
                marginBottom: '1rem'
              }}>
                <Search size={16} color="#666" style={{
                  position: 'absolute',
                  left: '0.875rem',
                  top: '50%',
                  transform: 'translateY(-50%)'
                }} />
                <input
                  type="text"
                  placeholder={t('searchAssets')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.75rem 0.875rem 0.75rem 2.5rem',
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: '10px',
                    color: '#fff',
                    fontSize: '0.9rem'
                  }}
                />
              </div>

              {/* Asset List */}
              {assetsLoading ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}>
                  <Loader2 size={24} color="#00F5FF" style={{ animation: 'spin 1s linear infinite' }} />
                </div>
              ) : filteredAssets.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2rem', color: '#666' }}>
                  {t('noAssetsFound')}
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '300px', overflow: 'auto' }}>
                  {filteredAssets.map(asset => (
                    <button
                      key={asset.symbol}
                      onClick={() => selectAsset(asset.symbol, asset.name, asset.price)}
                      style={{
                        padding: '0.875rem',
                        background: 'rgba(255,255,255,0.02)',
                        border: '1px solid rgba(255,255,255,0.08)',
                        borderRadius: '10px',
                        cursor: 'pointer',
                        textAlign: 'left',
                        transition: 'all 0.2s',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}
                    >
                      <div>
                        <div style={{ color: '#fff', fontSize: '0.9rem', fontWeight: 600 }}>
                          {asset.symbol}
                        </div>
                        <div style={{ color: '#666', fontSize: '0.75rem', marginTop: '0.125rem' }}>
                          {asset.name}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ color: '#00F5FF', fontSize: '0.9rem', fontWeight: 600 }}>
                          ${asset.price < 1 ? asset.price.toFixed(6) : asset.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                        {asset.change24h !== undefined && (
                          <div style={{ 
                            color: asset.change24h >= 0 ? '#00FF88' : '#FF6B6B', 
                            fontSize: '0.75rem' 
                          }}>
                            {asset.change24h >= 0 ? '+' : ''}{asset.change24h.toFixed(2)}%
                          </div>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {/* Info text - no custom symbol */}
              <div style={{ 
                marginTop: '1rem', 
                padding: '0.75rem', 
                background: 'rgba(0,245,255,0.05)', 
                borderRadius: '8px',
                border: '1px solid rgba(0,245,255,0.1)'
              }}>
                <span style={{ color: '#888', fontSize: '0.75rem' }}>
                  {t('realTimeDataOnly')}
                </span>
              </div>
            </div>
          )}

          {step === 2 && (
            <div>
              {/* Selected asset */}
              <div style={{
                padding: '1rem',
                background: 'rgba(0,245,255,0.05)',
                border: '1px solid rgba(0,245,255,0.2)',
                borderRadius: '10px',
                marginBottom: '1.25rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem'
              }}>
                {getAssetIcon(assetType)}
                <div>
                  <div style={{ color: '#fff', fontWeight: 600 }}>{symbol}</div>
                  <div style={{ color: '#666', fontSize: '0.8rem' }}>{assetName}</div>
                </div>
                <button
                  onClick={() => setStep(1)}
                  style={{
                    marginLeft: 'auto',
                    background: 'none',
                    border: 'none',
                    color: '#00F5FF',
                    fontSize: '0.8rem',
                    cursor: 'pointer'
                  }}
                >
                  {t('change')}
                </button>
              </div>

              <h3 style={{ color: '#fff', fontSize: '0.9rem', fontWeight: 600, marginBottom: '1rem' }}>
                {t('whenShouldWeAlert')}
              </h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {ALERT_TYPES.map(type => (
                  <button
                    key={type.id}
                    onClick={() => selectAlertType(type.id)}
                    style={{
                      padding: '1rem',
                      background: 'rgba(255,255,255,0.02)',
                      border: '1px solid rgba(255,255,255,0.08)',
                      borderRadius: '10px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem',
                      transition: 'all 0.2s'
                    }}
                  >
                    <div style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '8px',
                      background: `${type.color}15`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: type.color
                    }}>
                      {type.icon}
                    </div>
                    <span style={{ color: '#fff', fontSize: '0.9rem', fontWeight: 500 }}>
                      {type.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 3 && (
            <div>
              {/* Summary */}
              <div style={{
                padding: '1rem',
                background: 'rgba(0,245,255,0.05)',
                border: '1px solid rgba(0,245,255,0.2)',
                borderRadius: '10px',
                marginBottom: '1.25rem'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    {getAssetIcon(assetType)}
                    <span style={{ color: '#fff', fontWeight: 600 }}>{symbol}</span>
                  </div>
                  {/* Current Price */}
                  {currentPrice && (
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ color: '#666', fontSize: '0.7rem' }}>{t('currentPrice')}</div>
                      <div style={{ color: '#00F5FF', fontWeight: 600, fontSize: '0.9rem' }}>
                        ${currentPrice < 1 ? currentPrice.toFixed(6) : currentPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  {ALERT_TYPES.find(t => t.id === alertType)?.icon}
                  <span style={{ color: '#888', fontSize: '0.85rem' }}>
                    {ALERT_TYPES.find(t => t.id === alertType)?.label}
                  </span>
                </div>
                <button
                  onClick={() => setStep(2)}
                  style={{
                    marginTop: '0.75rem',
                    background: 'none',
                    border: 'none',
                    color: '#00F5FF',
                    fontSize: '0.8rem',
                    cursor: 'pointer',
                    padding: 0
                  }}
                >
                  {t('changeCondition')}
                </button>
              </div>

              {/* Target Value */}
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ color: '#888', fontSize: '0.8rem', display: 'block', marginBottom: '0.5rem' }}>
                  {alertType.includes('percent') ? t('percentage') : t('targetPrice')}
                </label>
                <div style={{ position: 'relative' }}>
                  {!alertType.includes('percent') && (
                    <span style={{
                      position: 'absolute',
                      left: '0.875rem',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      color: '#666'
                    }}>
                      $
                    </span>
                  )}
                  <input
                    type="number"
                    placeholder={alertType.includes('percent') ? t('placeholderPercent') : t('placeholderPrice')}
                    value={targetValue}
                    onChange={(e) => setTargetValue(e.target.value)}
                    style={{
                      width: '100%',
                      padding: alertType.includes('percent') ? '0.875rem' : '0.875rem 0.875rem 0.875rem 1.75rem',
                      background: 'rgba(255,255,255,0.03)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '10px',
                      color: '#fff',
                      fontSize: '1.1rem',
                      fontWeight: 600
                    }}
                  />
                  {alertType.includes('percent') && (
                    <span style={{
                      position: 'absolute',
                      right: '0.875rem',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      color: '#666'
                    }}>
                      %
                    </span>
                  )}
                </div>
              </div>

              {/* Note */}
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ color: '#888', fontSize: '0.8rem', display: 'block', marginBottom: '0.5rem' }}>
                  {t('noteOptional')}
                </label>
                <input
                  type="text"
                  placeholder={t('addNotePlaceholder')}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: '10px',
                    color: '#fff',
                    fontSize: '0.9rem'
                  }}
                />
              </div>

              {/* Repeat toggle */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0.875rem',
                background: 'rgba(255,255,255,0.02)',
                borderRadius: '10px',
                marginBottom: '1rem'
              }}>
                <div>
                  <div style={{ color: '#fff', fontSize: '0.85rem', fontWeight: 500 }}>
                    {t('repeatAlert')}
                  </div>
                  <div style={{ color: '#666', fontSize: '0.75rem' }}>
                    {t('repeatAlertDesc')}
                  </div>
                </div>
                <button
                  onClick={() => setRepeatAlert(!repeatAlert)}
                  style={{
                    width: '44px',
                    height: '24px',
                    borderRadius: '12px',
                    background: repeatAlert ? 'linear-gradient(135deg, #00F5FF 0%, #00D4FF 100%)' : 'rgba(255,255,255,0.1)',
                    border: 'none',
                    padding: '2px',
                    cursor: 'pointer',
                    position: 'relative'
                  }}
                >
                  <div style={{
                    width: '20px',
                    height: '20px',
                    borderRadius: '50%',
                    background: '#fff',
                    transform: repeatAlert ? 'translateX(20px)' : 'translateX(0)',
                    transition: 'transform 0.2s'
                  }} />
                </button>
              </div>

              {error && (
                <div style={{
                  padding: '0.75rem',
                  background: 'rgba(255,107,107,0.1)',
                  border: '1px solid rgba(255,107,107,0.2)',
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  marginBottom: '1rem'
                }}>
                  <AlertCircle size={16} color="#FF6B6B" />
                  <span style={{ color: '#FF6B6B', fontSize: '0.85rem' }}>{error}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        {step === 3 && (
          <div style={{
            padding: '1rem 1.25rem',
            borderTop: '1px solid rgba(255,255,255,0.08)',
            display: 'flex',
            gap: '0.75rem'
          }}>
            <button
              onClick={() => setStep(2)}
              style={{
                flex: 1,
                padding: '0.875rem',
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '10px',
                color: '#888',
                fontSize: '0.9rem',
                fontWeight: 500,
                cursor: 'pointer'
              }}
            >
              {t('back')}
            </button>
            <button
              onClick={createAlert}
              disabled={loading || !targetValue}
              style={{
                flex: 2,
                padding: '0.875rem',
                background: 'linear-gradient(135deg, #00F5FF 0%, #00D4FF 100%)',
                border: 'none',
                borderRadius: '10px',
                color: '#000',
                fontSize: '0.9rem',
                fontWeight: 600,
                cursor: loading || !targetValue ? 'not-allowed' : 'pointer',
                opacity: loading || !targetValue ? 0.7 : 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem'
              }}
            >
              {loading ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Check size={16} />
              )}
              {loading ? t('creating') : t('createAlert')}
            </button>
          </div>
        )}

        <style jsx global>{`
          .animate-spin {
            animation: spin 1s linear infinite;
          }
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    </>
  );
}
