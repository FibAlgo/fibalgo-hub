'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import {
  createChart,
  ColorType,
  LineStyle,
  CrosshairMode,
  CandlestickSeries,
  LineSeries,
  createSeriesMarkers,
  type IChartApi,
  type ISeriesApi,
  type CandlestickData,
  type LineData,
  type Time,
} from 'lightweight-charts';
import { calculatePRZ, DEFAULT_CONFIG } from '@/lib/indicators';
import type { OHLCVBar, PRZOutput, FibBoxData, PivotLabel, GaugeData } from '@/lib/indicators';

interface PRZChartProps {
  height?: number;
}

export default function PRZChart({ height = 500 }: PRZChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const barsRef = useRef<OHLCVBar[]>([]);
  const resultRef = useRef<PRZOutput | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ===== CANVAS OVERLAY RENDERER =====
  const renderOverlays = useCallback(() => {
    const chart = chartRef.current;
    const series = candleSeriesRef.current;
    const canvas = overlayCanvasRef.current;
    const result = resultRef.current;
    const bars = barsRef.current;
    if (!chart || !series || !canvas || !result || bars.length === 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Match canvas resolution to display size
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, rect.width, rect.height);

    const timeScale = chart.timeScale();
    const visibleRange = timeScale.getVisibleLogicalRange();
    if (!visibleRange) return;

    const visStart = Math.floor(visibleRange.from);
    const visEnd = Math.ceil(visibleRange.to);

    // =================== FIB ZONE BOXES ===================
    renderFibBoxes(ctx, series, timeScale, bars, result.fibBoxes);

    // =================== FIB LINE RATIO LABELS ===================
    renderFibLineLabels(ctx, series, timeScale, bars, result);

    // =================== PIVOT LABELS ===================
    renderPivotLabels(ctx, series, timeScale, bars, result.pivotLabels, visStart, visEnd);

    // =================== MARKET PRESSURE GAUGE ===================
    if (result.gauge) {
      renderGaugeOnChart(ctx, series, timeScale, bars, result.gauge);
    }
  }, []);

  // ===== MAIN INIT =====
  useEffect(() => {
    let cancelled = false;

    async function init() {
      if (!containerRef.current) return;

      setLoading(true);
      setError(null);

      // 1. Fetch BTC data — 1000 bars for prd=144
      let bars: OHLCVBar[];
      try {
        const res = await fetch('/api/binance-klines?symbol=BTCUSDT&interval=1h&limit=1000');
        if (!res.ok) throw new Error(`API ${res.status}`);
        bars = await res.json();
      } catch (e) {
        console.warn('Binance API failed, generating demo data:', e);
        bars = generateFallbackData(1000);
      }

      if (cancelled || !containerRef.current) return;
      barsRef.current = bars;

      // 2. Cleanup old chart
      if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
      }

      // 3. Create chart — full width, gauge drawn ON chart like TradingView
      const container = containerRef.current;

      const chart = createChart(container, {
        width: container.clientWidth,
        height,
        layout: {
          background: { type: ColorType.Solid, color: '#131722' },
          textColor: 'rgba(255,255,255,0.5)',
          fontSize: 11,
          fontFamily: "'Inter', -apple-system, sans-serif",
        },
        grid: {
          vertLines: { color: 'rgba(255,255,255,0.04)' },
          horzLines: { color: 'rgba(255,255,255,0.04)' },
        },
        crosshair: {
          mode: CrosshairMode.Normal,
          vertLine: { color: 'rgba(0,245,255,0.3)', labelBackgroundColor: '#1e222d' },
          horzLine: { color: 'rgba(0,245,255,0.3)', labelBackgroundColor: '#1e222d' },
        },
        rightPriceScale: {
          borderColor: 'rgba(255,255,255,0.08)',
          scaleMargins: { top: 0.08, bottom: 0.12 },
        },
        timeScale: {
          borderColor: 'rgba(255,255,255,0.08)',
          timeVisible: true,
          secondsVisible: false,
          rightOffset: 12, // space for gauge on right
        },
        handleScroll: { vertTouchDrag: false },
      });

      chartRef.current = chart;

      // 4. Run PRZ engine with adaptive zones enabled
      const result = calculatePRZ(bars, {
        ...DEFAULT_CONFIG,
        prd: 144,
        prd2: 21,
        adaptiveFibLevels: true,
      });
      resultRef.current = result;

      // ===== CANDLESTICK SERIES =====
      const candleSeries = chart.addSeries(CandlestickSeries, {
        upColor: '#26a69a',
        downColor: '#ef5350',
        borderUpColor: '#26a69a',
        borderDownColor: '#ef5350',
        wickUpColor: '#26a69a',
        wickDownColor: '#ef5350',
      });
      candleSeriesRef.current = candleSeries;

      const candleData: CandlestickData<Time>[] = bars.map(b => ({
        time: b.time as Time,
        open: b.open, high: b.high, low: b.low, close: b.close,
      }));
      candleSeries.setData(candleData);

      // ===== MAJOR ZIGZAG (white) =====
      if (result.zigzagLines.length > 0) {
        const zzSeries = chart.addSeries(LineSeries, {
          color: 'rgba(255,255,255,0.75)',
          lineWidth: 2,
          lineStyle: LineStyle.Solid,
          crosshairMarkerVisible: false,
          lastValueVisible: false,
          priceLineVisible: false,
        });
        const zzData = zigzagToLineData(result.zigzagLines, bars);
        if (zzData.length > 0) zzSeries.setData(zzData);
      }

      // ===== RETRACEMENT ZIGZAG (red) =====
      if (result.zigzag2Lines.length > 0) {
        const retSeries = chart.addSeries(LineSeries, {
          color: 'rgba(255,80,80,0.75)',
          lineWidth: 2,
          lineStyle: LineStyle.Solid,
          crosshairMarkerVisible: false,
          lastValueVisible: false,
          priceLineVisible: false,
        });
        const retData = zigzagToLineData(result.zigzag2Lines, bars);
        if (retData.length > 0) retSeries.setData(retData);
      }

      // ===== FIBONACCI DASHED LINES =====
      for (const fib of result.fibLines) {
        candleSeries.createPriceLine({
          price: fib.price,
          color: fib.color + '80',
          lineWidth: 1,
          lineStyle: LineStyle.Dashed,
          axisLabelVisible: false,
          title: '',
        });
      }

      // ===== PIVOT MARKERS (arrows for big pivots only) =====
      const markers: Array<{
        time: Time;
        position: 'aboveBar' | 'belowBar';
        color: string;
        shape: 'arrowDown' | 'arrowUp';
        text: string;
        size: number;
      }> = [];

      for (const lbl of result.pivotLabels) {
        const bar = bars[lbl.barIndex];
        if (!bar) continue;

        const isBigPivot = !lbl.text.includes('-A-') && !lbl.text.includes('-B-');

        if (isBigPivot) {
          markers.push({
            time: bar.time as Time,
            position: lbl.style === 'down' ? 'aboveBar' : 'belowBar',
            color: '#3742fa',
            shape: lbl.style === 'down' ? 'arrowDown' : 'arrowUp',
            text: lbl.text,
            size: 2,
          });
        }
      }

      // Deduplicate
      markers.sort((a, b) => (a.time as number) - (b.time as number));
      const markerMap = new Map<string, (typeof markers)[0]>();
      for (const m of markers) {
        const key = `${m.time}-${m.position}`;
        markerMap.set(key, m);
      }
      const sortedMarkers = Array.from(markerMap.values()).sort(
        (a, b) => (a.time as number) - (b.time as number)
      );
      if (sortedMarkers.length > 0) {
        createSeriesMarkers(candleSeries, sortedMarkers);
      }

      // ===== WATERMARK =====
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (chart as any).applyOptions({
          watermark: {
            visible: true,
            text: 'BTCUSDT · FibAlgo® PRZ™',
            fontSize: 28,
            color: 'rgba(0,245,255,0.06)',
          },
        });
      } catch { /* v5 may not support watermark */ }

      chart.timeScale().fitContent();

      // Subscribe to scroll/zoom for overlay updates
      chart.timeScale().subscribeVisibleLogicalRangeChange(() => {
        requestAnimationFrame(renderOverlays);
      });

      // Initial overlay render
      setTimeout(() => {
        renderOverlays();
        setLoading(false);
      }, 100);
    }

    init();

    return () => {
      cancelled = true;
    };
  }, [height, renderOverlays]);

  // ===== RESIZE OBSERVER =====
  useEffect(() => {
    const observer = new ResizeObserver(() => {
      if (chartRef.current && containerRef.current) {
        chartRef.current.applyOptions({
          width: containerRef.current.clientWidth,
        });
        requestAnimationFrame(renderOverlays);
      }
    });
    if (containerRef.current) observer.observe(containerRef.current);
    return () => {
      observer.disconnect();
      if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
      }
    };
  }, [renderOverlays]);

  return (
    <div style={{ position: 'relative', width: '100%', height }}>
      <div ref={containerRef} style={{ width: '100%', height }} />
      <canvas
        ref={overlayCanvasRef}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
          zIndex: 2,
        }}
      />
      {loading && (
        <div
          style={{
            position: 'absolute', inset: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: '#131722', zIndex: 10,
          }}
        >
          <div style={{ textAlign: 'center' }}>
            <div
              style={{
                width: 28, height: 28,
                border: '2px solid rgba(0,245,255,0.2)',
                borderTopColor: 'rgba(0,245,255,0.8)',
                borderRadius: '50%',
                animation: 'przSpin 0.8s linear infinite',
                margin: '0 auto 10px',
              }}
            />
            <div style={{ color: 'rgba(0,245,255,0.6)', fontSize: '0.8rem', fontFamily: 'monospace' }}>
              Loading BTCUSDT…
            </div>
          </div>
        </div>
      )}
      {error && (
        <div
          style={{
            position: 'absolute', bottom: 8, right: 8,
            background: 'rgba(255,60,60,0.15)', color: '#ff6b6b',
            fontSize: '0.7rem', padding: '4px 8px', borderRadius: 4,
            fontFamily: 'monospace', zIndex: 11,
          }}
        >
          {error}
        </div>
      )}
      <style>{`@keyframes przSpin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

// ============================================================================
// CANVAS RENDERING FUNCTIONS
// ============================================================================

function renderFibBoxes(
  ctx: CanvasRenderingContext2D,
  series: ISeriesApi<'Candlestick'>,
  timeScale: ReturnType<IChartApi['timeScale']>,
  bars: OHLCVBar[],
  fibBoxes: FibBoxData[]
) {
  for (const box of fibBoxes) {
    const topY = series.priceToCoordinate(box.top);
    const bottomY = series.priceToCoordinate(box.bottom);
    if (topY === null || bottomY === null) continue;

    const leftBar = bars[Math.max(0, box.left)];
    const rightBar = bars[Math.min(box.right, bars.length - 1)];
    if (!leftBar || !rightBar) continue;

    const leftX = timeScale.timeToCoordinate(leftBar.time as Time);
    const rightX = timeScale.timeToCoordinate(rightBar.time as Time);
    if (leftX === null || rightX === null) continue;

    const boxH = Math.abs(bottomY - topY);
    const boxW = Math.abs(rightX - leftX);
    if (boxH < 1 || boxW < 1) continue;

    const boxTop = Math.min(topY, bottomY);
    const boxLeft = Math.min(leftX, rightX);

    // Fill — Pine: bgcolor=color.new(box_color, 85) = ~15% opacity
    ctx.fillStyle = box.bgColor;
    ctx.fillRect(boxLeft, boxTop, boxW, boxH);

    // Border — Pine: border_color=color.new(box_color, 60) = ~40% opacity
    ctx.strokeStyle = box.borderColor;
    ctx.lineWidth = 1;
    ctx.strokeRect(boxLeft, boxTop, boxW, boxH);

    // Centered label text inside box
    if (boxH > 12 && boxW > 30) {
      const lines = box.labelText.split('\n');
      const fontSize = boxH > 80 ? 11 : boxH > 50 ? 10 : boxH > 30 ? 9 : 8;
      ctx.font = `${fontSize}px monospace`;
      ctx.fillStyle = 'rgba(255,255,255,0.95)';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      const lineHeight = fontSize + 3;
      const totalTextH = lines.length * lineHeight;
      const startY = boxTop + (boxH - totalTextH) / 2 + lineHeight / 2;
      const centerX = boxLeft + boxW * 0.5;

      ctx.shadowColor = 'rgba(0,0,0,0.9)';
      ctx.shadowBlur = 4;
      for (let i = 0; i < lines.length; i++) {
        ctx.fillText(lines[i], centerX, startY + i * lineHeight);
      }
      ctx.shadowBlur = 0;
    }
  }
}

function renderFibLineLabels(
  ctx: CanvasRenderingContext2D,
  series: ISeriesApi<'Candlestick'>,
  timeScale: ReturnType<IChartApi['timeScale']>,
  bars: OHLCVBar[],
  result: PRZOutput
) {
  for (const fib of result.fibLines) {
    const y = series.priceToCoordinate(fib.price);
    if (y === null) continue;

    const lastBar = bars[bars.length - 1];
    if (!lastBar) continue;
    const rightX = timeScale.timeToCoordinate(lastBar.time as Time);
    if (rightX === null) continue;

    ctx.font = '9px monospace';
    ctx.fillStyle = fib.color + 'cc';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = 'rgba(0,0,0,0.8)';
    ctx.shadowBlur = 3;
    ctx.fillText(fib.ratio.toFixed(3), rightX + 8, y);
    ctx.shadowBlur = 0;
  }
}

function renderPivotLabels(
  ctx: CanvasRenderingContext2D,
  series: ISeriesApi<'Candlestick'>,
  timeScale: ReturnType<IChartApi['timeScale']>,
  bars: OHLCVBar[],
  pivotLabels: PivotLabel[],
  visStart: number,
  visEnd: number
) {
  const placed: { x: number; y: number; w: number; h: number }[] = [];

  for (const lbl of pivotLabels) {
    if (lbl.barIndex < visStart - 5 || lbl.barIndex > visEnd + 5) continue;

    const bar = bars[lbl.barIndex];
    if (!bar) continue;

    const x = timeScale.timeToCoordinate(bar.time as Time);
    const y = series.priceToCoordinate(lbl.price);
    if (x === null || y === null) continue;

    const isBigPivot = !lbl.text.includes('-A-') && !lbl.text.includes('-B-');
    const hasFibInfo = lbl.text.includes('Fib:');
    const hasStar = lbl.text.includes('★');

    let bgColor: string;
    let textColor: string;
    let fontSize: number;
    let displayText: string;
    let padding: number;

    if (isBigPivot) {
      // Big pivot: blue like Pine Script
      bgColor = 'rgba(55,66,250,0.85)';
      textColor = '#ffffff';
      fontSize = 10;
      displayText = lbl.text;
      padding = 4;
    } else if (hasFibInfo) {
      // Retracement pivot with fib info: red like Pine Script
      bgColor = 'rgba(200,50,50,0.85)';
      textColor = '#ffffff';
      fontSize = 9;
      displayText = lbl.text;
      if (displayText.length > 50) displayText = displayText.substring(0, 50) + '…';
      padding = 3;
    } else if (hasStar) {
      bgColor = 'rgba(218,165,32,0.85)';
      textColor = '#ffffff';
      fontSize = 9;
      displayText = lbl.text;
      if (displayText.length > 50) displayText = displayText.substring(0, 50) + '…';
      padding = 3;
    } else {
      // Plain small pivot without fib info
      bgColor = 'rgba(200,50,50,0.7)';
      textColor = '#ffffff';
      fontSize = 8;
      displayText = lbl.text;
      if (displayText.length > 25) displayText = displayText.substring(0, 25) + '…';
      padding = 2;
    }

    const yOffset = lbl.style === 'down' ? -(fontSize + padding * 2 + 8) : (fontSize + 6);

    ctx.font = `${fontSize}px monospace`;
    const metrics = ctx.measureText(displayText);
    const labelW = metrics.width + padding * 2;
    const labelH = fontSize + padding * 2;
    const labelX = x - labelW / 2;
    const labelY = y + yOffset;

    // Overlap check
    let overlapping = false;
    for (const p of placed) {
      if (
        labelX < p.x + p.w + 2 &&
        labelX + labelW + 2 > p.x &&
        labelY < p.y + p.h + 1 &&
        labelY + labelH + 1 > p.y
      ) {
        overlapping = true;
        break;
      }
    }

    // Always show big pivots and fib labels; skip plain small pivots if overlapping
    if (overlapping && !isBigPivot && !hasFibInfo) continue;

    // Draw label background
    ctx.fillStyle = bgColor;
    ctx.beginPath();
    const r = 3;
    ctx.moveTo(labelX + r, labelY);
    ctx.lineTo(labelX + labelW - r, labelY);
    ctx.quadraticCurveTo(labelX + labelW, labelY, labelX + labelW, labelY + r);
    ctx.lineTo(labelX + labelW, labelY + labelH - r);
    ctx.quadraticCurveTo(labelX + labelW, labelY + labelH, labelX + labelW - r, labelY + labelH);
    ctx.lineTo(labelX + r, labelY + labelH);
    ctx.quadraticCurveTo(labelX, labelY + labelH, labelX, labelY + labelH - r);
    ctx.lineTo(labelX, labelY + r);
    ctx.quadraticCurveTo(labelX, labelY, labelX + r, labelY);
    ctx.closePath();
    ctx.fill();

    // Draw text
    ctx.fillStyle = textColor;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = 'rgba(0,0,0,0.5)';
    ctx.shadowBlur = 2;
    ctx.fillText(displayText, x, labelY + labelH / 2);
    ctx.shadowBlur = 0;

    placed.push({ x: labelX, y: labelY, w: labelW, h: labelH });
  }
}

function renderGaugeOnChart(
  ctx: CanvasRenderingContext2D,
  series: ISeriesApi<'Candlestick'>,
  timeScale: ReturnType<IChartApi['timeScale']>,
  bars: OHLCVBar[],
  gauge: GaugeData
) {
  const lastBar = bars[bars.length - 1];
  if (!lastBar) return;

  const lastX = timeScale.timeToCoordinate(lastBar.time as Time);
  if (lastX === null) return;

  // Position gauge to the right of the last candle (like Pine: bar_index + gauge_offset)
  const gaugeX = lastX + 40;

  const topY = series.priceToCoordinate(gauge.topBound);
  const bottomY = series.priceToCoordinate(gauge.bottomBound);
  if (topY === null || bottomY === null) return;

  const gTop = Math.min(topY, bottomY);
  const gBottom = Math.max(topY, bottomY);
  const gaugeHeight = gBottom - gTop;

  if (gaugeHeight < 10) return;

  const barWidth = 6; // Pine: width=6

  // Draw gauge segments
  const segCount = gauge.segments.length;
  const segH = gaugeHeight / segCount;

  for (let i = 0; i < segCount; i++) {
    const seg = gauge.segments[i];
    const segTop = gTop + i * segH;

    ctx.fillStyle = seg.color;
    ctx.fillRect(gaugeX - barWidth / 2, segTop, barWidth, segH + 0.5);
  }

  // Pointer ◀
  const pointerY = series.priceToCoordinate(gauge.pointerY);
  if (pointerY !== null) {
    ctx.fillStyle = '#ffffff';
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText('◀', gaugeX + barWidth / 2 + 2, pointerY);
  }

  // BUY PRESSURE label (top)
  ctx.fillStyle = '#00ffbb';
  ctx.font = 'bold 7px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  ctx.fillText('BUY', gaugeX, gTop - 10);
  ctx.fillText('PRESSURE', gaugeX, gTop - 2);

  // SELL PRESSURE label (bottom)
  ctx.fillStyle = '#ff1100';
  ctx.textBaseline = 'top';
  ctx.fillText('SELL', gaugeX, gBottom + 2);
  ctx.fillText('PRESSURE', gaugeX, gBottom + 10);
}

// ============================================================================
// HELPERS
// ============================================================================

function zigzagToLineData(
  lines: Array<{ x1: number; y1: number; x2: number; y2: number }>,
  bars: OHLCVBar[]
): LineData<Time>[] {
  const map = new Map<number, number>();
  for (const seg of lines) {
    map.set(seg.x1, seg.y1);
    map.set(seg.x2, seg.y2);
  }
  const result: LineData<Time>[] = [];
  const sortedKeys = Array.from(map.keys()).sort((a, b) => a - b);
  for (const idx of sortedKeys) {
    const bar = bars[idx];
    if (bar) {
      result.push({ time: bar.time as Time, value: map.get(idx)! });
    }
  }
  return result;
}

function generateFallbackData(count: number): OHLCVBar[] {
  const bars: OHLCVBar[] = [];
  let price = 67000;
  const now = Math.floor(Date.now() / 1000);
  for (let i = 0; i < count; i++) {
    const change = (Math.random() - 0.48) * 500;
    const open = price;
    const close = price + change;
    const high = Math.max(open, close) + Math.random() * 300;
    const low = Math.min(open, close) - Math.random() * 300;
    bars.push({
      time: now - (count - i) * 3600,
      open, high, low, close,
      volume: 100 + Math.random() * 1000,
    });
    price = close;
  }
  return bars;
}
