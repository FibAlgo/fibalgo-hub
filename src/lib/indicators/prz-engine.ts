// ============================================================================
// FibAlgo® - Perfect Retracement Zone™
// BIREBIR Pine Script v5 → TypeScript çevirisi
// Bar-by-bar state machine — Pine Script'teki her satırın karşılığı
// ============================================================================

export interface OHLCVBar {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface PRZConfig {
  prd: number;    // Major Trend Period (default 144)
  prd2: number;   // Retracement Period (default 21)
  // Fib levels
  fibLevels: { show: boolean; ratio: number; color: string }[];
  // Adaptive zones
  adaptiveFibLevels: boolean;
  nz1Percentage: number;
  nz2Percentage: number;
  cz1Percentage: number;
  cz2Percentage: number;
  cz3Percentage: number;
  // Display
  showFibs: boolean;
  showFibBoxes: boolean;
  showPivotLabels: boolean;
  showZigzag: boolean;
  showZigzag2: boolean;
  showMarketPressureGauge: boolean;
  // Colors
  upcol: string;
  dncol: string;
  upcol2: string;
  dncol2: string;
  bullishColor: string;
  bearishColor: string;
  gaugeOffset: number;
}

export const DEFAULT_CONFIG: PRZConfig = {
  prd: 144,
  prd2: 21,
  fibLevels: [
    { show: true, ratio: 0.0, color: '#808080' },
    { show: true, ratio: 0.236, color: '#ff0000' },
    { show: true, ratio: 0.382, color: '#ff8c00' },
    { show: true, ratio: 0.5, color: '#00ff00' },
    { show: true, ratio: 0.618, color: '#008080' },
    { show: true, ratio: 0.786, color: '#00ffff' },
    { show: true, ratio: 1.0, color: '#808080' },
  ],
  adaptiveFibLevels: true,
  nz1Percentage: 10.0,
  nz2Percentage: 10.0,
  cz1Percentage: 26.67,
  cz2Percentage: 26.67,
  cz3Percentage: 26.67,
  showFibs: true,
  showFibBoxes: true,
  showPivotLabels: true,
  showZigzag: true,
  showZigzag2: true,
  showMarketPressureGauge: true,
  upcol: '#ffffff',
  dncol: '#ffffff',
  upcol2: '#ff0000',
  dncol2: '#ff0000',
  bullishColor: '#00ffbb',
  bearishColor: '#ff1100',
  gaugeOffset: 5,
};

// ============= OUTPUT TYPES =============

export interface ZigZagLine {
  x1: number; y1: number; // bar index, price
  x2: number; y2: number;
  color: string;
  width: number;
}

export interface PivotLabel {
  barIndex: number;
  price: number;
  text: string;
  style: 'up' | 'down'; // label_up = below bar, label_down = above bar
  color: string;
  textColor: string;
  size: string;
}

export interface FibLine {
  price: number;
  color: string;
  ratio: number;
}

export interface FibBoxData {
  left: number;
  right: number;
  top: number;
  bottom: number;
  bgColor: string;
  borderColor: string;
  labelText: string;
}

export interface GaugeData {
  segments: { y1: number; y2: number; color: string }[];
  pointerY: number;
  topBound: number;
  bottomBound: number;
  barIndex: number;
  offset: number;
}

export interface PRZOutput {
  zigzagLines: ZigZagLine[];
  zigzag2Lines: ZigZagLine[];
  pivotLabels: PivotLabel[];
  fibLines: FibLine[];
  fibBoxes: FibBoxData[];
  gauge: GaugeData | null;
  // For dynamic fib drawing bounds
  fibRangeStartBar: number;
  fibRangeEndBar: number;
}

// ============= PINE SCRIPT TA FUNCTIONS =============

/** ta.pivothigh(high, leftbars, rightbars) — rightbars=1 as in original */
function pivotHigh(highs: number[], i: number, leftBars: number): number | null {
  if (i < leftBars || i + 1 >= highs.length) return null;
  const val = highs[i];
  for (let j = 1; j <= leftBars; j++) {
    if (highs[i - j] > val) return null;
  }
  // right bars = 1
  if (highs[i + 1] >= val) return null;
  return val;
}

/** ta.pivotlow(low, leftbars, rightbars) — rightbars=1 as in original */
function pivotLow(lows: number[], i: number, leftBars: number): number | null {
  if (i < leftBars || i + 1 >= lows.length) return null;
  const val = lows[i];
  for (let j = 1; j <= leftBars; j++) {
    if (lows[i - j] < val) return null;
  }
  if (lows[i + 1] <= val) return null;
  return val;
}

/** ta.highestbars(high, period) == 0 ? high : na */
function highestBarHigh(highs: number[], i: number, period: number): number | null {
  if (i < period - 1) return null;
  let maxVal = -Infinity;
  for (let j = 0; j < period; j++) {
    if (highs[i - j] > maxVal) maxVal = highs[i - j];
  }
  return highs[i] === maxVal ? highs[i] : null;
}

/** ta.lowestbars(low, period) == 0 ? low : na */
function lowestBarLow(lows: number[], i: number, period: number): number | null {
  if (i < period - 1) return null;
  let minVal = Infinity;
  for (let j = 0; j < period; j++) {
    if (lows[i - j] < minVal) minVal = lows[i - j];
  }
  return lows[i] === minVal ? lows[i] : null;
}

// ============= COLOR HELPERS =============

function interpolateColor(c1: string, c2: string, t: number): string {
  const h = (s: string) => parseInt(s, 16);
  const r1 = h(c1.slice(1, 3)), g1 = h(c1.slice(3, 5)), b1 = h(c1.slice(5, 7));
  const r2 = h(c2.slice(1, 3)), g2 = h(c2.slice(3, 5)), b2 = h(c2.slice(5, 7));
  const r = Math.round(r1 + (r2 - r1) * t);
  const g = Math.round(g1 + (g2 - g1) * t);
  const b = Math.round(b1 + (b2 - b1) * t);
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

// ============= ADAPTIVE ZONE CALCULATION =============
// Pine Script: calculate_adaptive_zones()
function calculateAdaptiveZones(allValues: number[], config: PRZConfig): number[] {
  const filtered = allValues.filter(v => v >= 0 && v <= 1).sort((a, b) => a - b);

  if (filtered.length > 20) {
    const totalCount = filtered.length;
    let nz1Ratio = config.nz1Percentage / 100.0;
    let cz1Ratio = config.cz1Percentage / 100.0;
    let cz2Ratio = config.cz2Percentage / 100.0;
    let cz3Ratio = config.cz3Percentage / 100.0;
    let nz2Ratio = config.nz2Percentage / 100.0;

    const totalPct = nz1Ratio + cz1Ratio + cz2Ratio + cz3Ratio + nz2Ratio;
    if (Math.abs(totalPct - 1.0) > 0.001) {
      nz1Ratio /= totalPct;
      cz1Ratio /= totalPct;
      cz2Ratio /= totalPct;
      cz3Ratio /= totalPct;
      nz2Ratio /= totalPct;
    }

    const nz1EndIdx = Math.max(0, Math.floor(totalCount * nz1Ratio) - 1);
    const cz1EndIdx = Math.max(nz1EndIdx + 1, Math.floor(totalCount * (nz1Ratio + cz1Ratio)) - 1);
    const cz2EndIdx = Math.max(cz1EndIdx + 1, Math.floor(totalCount * (nz1Ratio + cz1Ratio + cz2Ratio)) - 1);
    const cz3EndIdx = Math.max(cz2EndIdx + 1, Math.floor(totalCount * (nz1Ratio + cz1Ratio + cz2Ratio + cz3Ratio)) - 1);

    const zones = [
      0.0,
      filtered[Math.min(nz1EndIdx, filtered.length - 1)],
      filtered[Math.min(cz1EndIdx, filtered.length - 1)],
      filtered[Math.min(cz2EndIdx, filtered.length - 1)],
      filtered[Math.min(cz3EndIdx, filtered.length - 1)],
      1.0,
    ].sort((a, b) => a - b);

    // Deduplicate very close values
    const unique = [zones[0]];
    for (let i = 1; i < zones.length; i++) {
      if (zones[i] > zones[i - 1] + 0.0001) unique.push(zones[i]);
    }
    if (unique.length >= 6) return unique;
  }

  // Fallback: use default percentages
  let nz1R = config.nz1Percentage / 100.0;
  let cz1R = config.cz1Percentage / 100.0;
  let cz2R = config.cz2Percentage / 100.0;
  let cz3R = config.cz3Percentage / 100.0;
  const nz2R = config.nz2Percentage / 100.0;
  const tot = nz1R + cz1R + cz2R + cz3R + nz2R;
  nz1R /= tot; cz1R /= tot; cz2R /= tot; cz3R /= tot;
  return [0.0, nz1R, nz1R + cz1R, nz1R + cz1R + cz2R, nz1R + cz1R + cz2R + cz3R, 1.0];
}

/** Get zone name for a fib level using adaptive zones */
function getAdaptiveZoneName(level: number, zones: number[]): { name: string; lower: number; upper: number } | null {
  if (zones.length < 6) return null;
  const zoneNames = ['NZ1', 'CZ1', 'CZ2', 'CZ3', 'NZ2'];
  for (let i = 0; i < zones.length - 1 && i < zoneNames.length; i++) {
    if (level >= zones[i] && level < zones[i + 1]) {
      return { name: zoneNames[i], lower: zones[i], upper: zones[i + 1] };
    }
  }
  // Check last range
  if (level >= zones[zones.length - 2] && level <= zones[zones.length - 1]) {
    return { name: zoneNames[zoneNames.length - 1], lower: zones[zones.length - 2], upper: zones[zones.length - 1] };
  }
  return null;
}

/** Get color for adaptive zone */
function getAdaptiveZoneColor(index: number): string {
  // Pine: 0,1 = gray (NZ1), 2 = orange (CZ1), 3 = green (CZ2), 4 = blue (CZ3), 5 = gray (NZ2)
  if (index <= 1) return '#808080'; // NZ1
  if (index === 2) return '#ff8c00'; // CZ1 - orange
  if (index === 3) return '#00ff00'; // CZ2 - green  
  if (index === 4) return '#0000ff'; // CZ3 - blue
  return '#808080'; // NZ2
}

// ============= MAIN CALCULATION =============

export function calculatePRZ(bars: OHLCVBar[], config: PRZConfig = DEFAULT_CONFIG): PRZOutput {
  const n = bars.length;
  const highs = bars.map(b => b.high);
  const lows = bars.map(b => b.low);
  const closes = bars.map(b => b.close);
  const volumes = bars.map(b => b.volume);

  // Build sorted fib ratios
  const fib_ratios_from_input: number[] = config.fibLevels
    .filter(f => f.show)
    .map(f => f.ratio)
    .sort((a, b) => a - b);

  // Get fib colors mapped by ratio
  const fibColorMap = new Map<number, string>();
  for (const f of config.fibLevels) {
    if (f.show) fibColorMap.set(f.ratio, f.color);
  }

  // === STATE VARIABLES (var in Pine Script = persistent) ===
  let dir = 0;
  const MAX_ARRAY_SIZE = 20;
  let zigzag: number[] = []; // [value, barIndex, value, barIndex, ...]

  let ph_counter = 0;
  let pl_counter = 0;
  let last_big_label = 'Start';

  let small_ph_counter = 0;
  let small_pl_counter = 0;

  let dir2 = 0;
  let zigzag2: number[] = [];

  // Fib tracking maps
  const fib_start_points_B = new Map<string, number>();
  const fib_end_points_B = new Map<string, number | null>();
  const fib_start_points_A = new Map<string, number>();
  const fib_end_points_A = new Map<string, number | null>();

  // Stats
  const fib_counts_A = new Map<string, number>();
  const fib_counts_B = new Map<string, number>();
  const star_counts_A = new Map<string, number>();
  const star_counts_B = new Map<string, number>();
  let total_fibs_A = 0;
  let total_fibs_B = 0;
  let total_stars_A = 0;
  let total_stars_B = 0;

  // Fib data arrays
  const all_fib_values_A: number[] = [];
  const all_fib_values_B: number[] = [];

  // Adaptive zones
  let adaptive_zones_A: number[] = [];
  let adaptive_zones_B: number[] = [];

  // Dynamic fib state
  let last_completed_pivot: number | null = null;
  let last_completed_bar: number | null = null;

  // === OUTPUT ACCUMULATORS ===
  const zigzagLines: ZigZagLine[] = [];
  const zigzag2Lines: ZigZagLine[] = [];
  const pivotLabels: PivotLabel[] = [];

  // Label tracking for ★ stars
  const labels_to_watch_B = new Map<string, number>(); // label index
  const highs_to_break_B = new Map<string, number>();
  const labels_to_watch_A = new Map<string, number>();
  const lows_to_break_A = new Map<string, number>();

  // For retracement label fib levels (needed for star calculation)
  const label_fib_data = new Map<number, { fibStart: number; fibEnd: number; price: number; series: string }>();

  // Previous direction for [1] reference
  let prev_dir = 0;
  let prev_dir2 = 0;

  // Previous zigzag state for drawing
  let prev_zz_val = -1;
  let prev_zz_bar = -1;
  let prev_zz2_val = -1;
  let prev_zz2_bar = -1;

  // ========== BAR-BY-BAR LOOP ==========
  for (let i = 0; i < n; i++) {
    // Save previous frame
    const old_dir = dir;
    const old_dir2 = dir2;
    const old_zz_0 = zigzag.length >= 2 ? zigzag[0] : -1;
    const old_zz_1 = zigzag.length >= 2 ? zigzag[1] : -1;
    const old_zz_2 = zigzag.length >= 4 ? zigzag[2] : -1;
    const old_zz_3 = zigzag.length >= 4 ? zigzag[3] : -1;
    const old_zz2_0 = zigzag2.length >= 2 ? zigzag2[0] : -1;
    const old_zz2_1 = zigzag2.length >= 2 ? zigzag2[1] : -1;
    const old_zz2_2 = zigzag2.length >= 4 ? zigzag2[2] : -1;
    const old_zz2_3 = zigzag2.length >= 4 ? zigzag2[3] : -1;

    // === ta.pivothigh / ta.pivotlow  ===
    // Pine'da ta.pivothigh(high, prd, 1) bar[1]'de hesaplanır (1 bar gecikme)
    // Yani i'deki ph aslında i-1 bar'ın pivot olup olmadığını kontrol eder
    const ph = (i >= 1) ? pivotHigh(highs, i - 1, config.prd) : null;
    const pl = (i >= 1) ? pivotLow(lows, i - 1, config.prd) : null;

    // dir güncelle
    if (ph !== null && pl === null) dir = 1;
    else if (pl !== null && ph === null) dir = -1;

    // === ZIGZAG 2: highestbars / lowestbars ===
    const ph2 = highestBarHigh(highs, i, config.prd2);
    const pl2 = lowestBarLow(lows, i, config.prd2);

    if (ph2 !== null && pl2 === null) dir2 = 1;
    else if (pl2 !== null && ph2 === null) dir2 = -1;

    // === ZIGZAG 1 LOGIC ===
    const dirchanged = dir !== old_dir && old_dir !== 0;

    if (ph !== null || pl !== null) {
      if (dirchanged) {
        // Clear fib maps
        fib_start_points_B.clear(); fib_end_points_B.clear();
        fib_start_points_A.clear(); fib_end_points_A.clear();
        labels_to_watch_B.clear(); highs_to_break_B.clear();
        labels_to_watch_A.clear(); lows_to_break_A.clear();

        // Recategorize counts (simplified - non-adaptive mode)
        fib_counts_A.clear(); fib_counts_B.clear();
        star_counts_A.clear(); star_counts_B.clear();
        total_fibs_A = 0; total_fibs_B = 0;
        total_stars_A = 0; total_stars_B = 0;

        // Recalculate adaptive zones from accumulated data
        if (config.adaptiveFibLevels) {
          if (all_fib_values_A.length > 0) {
            adaptive_zones_A = calculateAdaptiveZones(all_fib_values_A, config);
          }
          if (all_fib_values_B.length > 0) {
            adaptive_zones_B = calculateAdaptiveZones(all_fib_values_B, config);
          }
        }

        // Re-categorize historical fib data
        for (const fv of all_fib_values_A) {
          if (fv >= 0 && fv <= 1) {
            const key = getFibLookupKey(fv, fib_ratios_from_input, config.adaptiveFibLevels ? adaptive_zones_A : undefined);
            fib_counts_A.set(key, (fib_counts_A.get(key) ?? 0) + 1);
            total_fibs_A++;
          }
        }
        for (const fv of all_fib_values_B) {
          if (fv >= 0 && fv <= 1) {
            const key = getFibLookupKey(fv, fib_ratios_from_input, config.adaptiveFibLevels ? adaptive_zones_B : undefined);
            fib_counts_B.set(key, (fib_counts_B.get(key) ?? 0) + 1);
            total_fibs_B++;
          }
        }

        // Create big pivot label
        if (zigzag.length >= 2) {
          const prev_price = zigzag[0];
          const prev_bar = Math.round(zigzag[1]);

          if (old_dir === 1) {
            // Was uptrend → now downtrend: this is a HIGH pivot → A-series
            ph_counter++;
            last_big_label = 'A-' + ph_counter;
            if (config.showPivotLabels) {
              pivotLabels.push({
                barIndex: prev_bar, price: prev_price,
                text: last_big_label, style: 'down',
                color: 'rgba(68,68,255,0.8)', textColor: '#ffffff', size: 'small',
              });
            }
            fib_start_points_A.set(last_big_label, prev_price);
            fib_end_points_A.set(last_big_label, null);
          } else {
            // Was downtrend → now uptrend: this is a LOW pivot → B-series
            pl_counter++;
            last_big_label = 'B-' + pl_counter;
            if (config.showPivotLabels) {
              pivotLabels.push({
                barIndex: prev_bar, price: prev_price,
                text: last_big_label, style: 'up',
                color: 'rgba(68,68,255,0.8)', textColor: '#ffffff', size: 'small',
              });
            }
            fib_start_points_B.set(last_big_label, prev_price);
            fib_end_points_B.set(last_big_label, null);
          }
        }

        small_ph_counter = 0;
        small_pl_counter = 0;

        // Dynamic fib: save completed pivot
        if (zigzag.length >= 4) {
          last_completed_pivot = zigzag[2];
          last_completed_bar = Math.round(zigzag[3]);
        }

        // add_to_zigzag
        const val = dir === 1 ? (ph ?? highs[i]) : (pl ?? lows[i]);
        zigzag.unshift(i, val);
        // Array format: [value, barIndex, value, barIndex, ...] — wait Pine does unshift(bindex) then unshift(value)
        // Pine: array.unshift(zigzag, bindex) then array.unshift(zigzag, value)
        // So zigzag = [value, bindex, prev_value, prev_bindex, ...]
        // Let me redo this correctly
        zigzag = [val, i, ...zigzag];
        if (zigzag.length > MAX_ARRAY_SIZE * 2) {
          zigzag = zigzag.slice(0, MAX_ARRAY_SIZE * 2);
        }
      } else {
        // update_zigzag
        const val = dir === 1 ? (ph ?? highs[i]) : (pl ?? lows[i]);
        if (zigzag.length === 0) {
          zigzag = [val, i];
        } else {
          if ((dir === 1 && val > zigzag[0]) || (dir === -1 && val < zigzag[0])) {
            zigzag[0] = val;
            zigzag[1] = i;
          }
        }
      }
    }

    // === ZIGZAG 1 DRAWING ===
    if (config.showZigzag && zigzag.length >= 4) {
      if (zigzag[0] !== old_zz_0 || zigzag[1] !== old_zz_1) {
        // New or updated line
        zigzagLines.push({
          x1: Math.round(zigzag[1]), y1: zigzag[0],
          x2: Math.round(zigzag[3]), y2: zigzag[2],
          color: dir === 1 ? config.upcol : config.dncol,
          width: 2,
        });
      }
    }

    // === ZIGZAG 2 LOGIC ===
    const dirchanged2 = dir2 !== old_dir2 && old_dir2 !== 0;

    if (ph2 !== null || pl2 !== null) {
      if (dirchanged2) {
        if (zigzag2.length >= 2) {
          const prev_price2 = zigzag2[0];
          const prev_bar2 = Math.round(zigzag2[1]);

          if (old_dir2 === 1) {
            // Small pivot HIGH
            small_ph_counter++;
            let label_text = last_big_label + '-A-' + small_ph_counter;

            if (last_big_label.startsWith('B')) {
              // Check star for B-series
              const high_to_break = highs_to_break_B.get(last_big_label);
              if (high_to_break !== undefined && prev_price2 > high_to_break) {
                const watchIdx = labels_to_watch_B.get(last_big_label);
                if (watchIdx !== undefined && pivotLabels[watchIdx]) {
                  pivotLabels[watchIdx].text += ' ★';

                  // Record starred fib
                  const fd = label_fib_data.get(watchIdx);
                  if (fd && fd.series === 'B') {
                    const fStart = fd.fibStart;
                    const fEnd = fd.fibEnd;
                    if (fEnd > fStart) {
                      const starFib = (fEnd - fd.price) / (fEnd - fStart);
                      if (starFib >= 0 && starFib <= 1) {
                        const sKey = getFibLookupKey(starFib, fib_ratios_from_input, config.adaptiveFibLevels ? adaptive_zones_B : undefined);
                        star_counts_B.set(sKey, (star_counts_B.get(sKey) ?? 0) + 1);
                        total_stars_B++;
                      }
                    }
                  }
                }
                highs_to_break_B.delete(last_big_label);
                labels_to_watch_B.delete(last_big_label);
              }

              // Update fib_end (highest high)
              const cur = fib_end_points_B.get(last_big_label);
              if (cur === null || cur === undefined || prev_price2 > cur) {
                fib_end_points_B.set(last_big_label, prev_price2);
              }

              if (config.showPivotLabels) {
                pivotLabels.push({
                  barIndex: prev_bar2, price: prev_price2,
                  text: label_text, style: 'down',
                  color: 'rgba(255,68,68,0.8)', textColor: '#ffffff', size: 'small',
                });
              }

            } else if (last_big_label.startsWith('A')) {
              // A-series: calculate retracement
              const fib_start = fib_start_points_A.get(last_big_label);
              const fib_end = fib_end_points_A.get(last_big_label);

              if (fib_start !== undefined && fib_end !== undefined && fib_end !== null && fib_start > fib_end) {
                const fib_range_val = fib_start - fib_end;
                const retracement_level = (prev_price2 - fib_end) / fib_range_val;

                all_fib_values_A.push(retracement_level);

                const azA = config.adaptiveFibLevels ? adaptive_zones_A : undefined;
                const fib_range_str = getFibRangeText(retracement_level, fib_ratios_from_input, azA);
                label_text += ' - Fib: ' + fib_range_str;

                const count_key = getFibLookupKey(retracement_level, fib_ratios_from_input, azA);
                fib_counts_A.set(count_key, (fib_counts_A.get(count_key) ?? 0) + 1);
                total_fibs_A++;

                const labelIdx = pivotLabels.length;
                pivotLabels.push({
                  barIndex: prev_bar2, price: prev_price2,
                  text: label_text, style: 'down',
                  color: config.showPivotLabels ? 'rgba(255,68,68,0.8)' : 'transparent',
                  textColor: config.showPivotLabels ? '#ffffff' : 'transparent', size: 'small',
                });
                labels_to_watch_A.set(last_big_label, labelIdx);
                lows_to_break_A.set(last_big_label, fib_end);
                label_fib_data.set(labelIdx, { fibStart: fib_start, fibEnd: fib_end, price: prev_price2, series: 'A' });
              } else {
                if (config.showPivotLabels) {
                  pivotLabels.push({
                    barIndex: prev_bar2, price: prev_price2,
                    text: label_text, style: 'down',
                    color: 'rgba(255,68,68,0.8)', textColor: '#ffffff', size: 'small',
                  });
                }
              }
            } else {
              if (config.showPivotLabels) {
                pivotLabels.push({
                  barIndex: prev_bar2, price: prev_price2,
                  text: label_text, style: 'down',
                  color: 'rgba(255,68,68,0.8)', textColor: '#ffffff', size: 'small',
                });
              }
            }

          } else {
            // Small pivot LOW
            small_pl_counter++;
            let label_text = last_big_label + '-B-' + small_pl_counter;

            if (last_big_label.startsWith('A')) {
              // Check star for A-series
              const low_to_break = lows_to_break_A.get(last_big_label);
              if (low_to_break !== undefined && prev_price2 < low_to_break) {
                const watchIdx = labels_to_watch_A.get(last_big_label);
                if (watchIdx !== undefined && pivotLabels[watchIdx]) {
                  pivotLabels[watchIdx].text += ' ★';

                  const fd = label_fib_data.get(watchIdx);
                  if (fd && fd.series === 'A') {
                    const fStart = fd.fibStart;
                    const fEnd = fd.fibEnd;
                    if (fStart > fEnd) {
                      const starFib = (fd.price - fEnd) / (fStart - fEnd);
                      if (starFib >= 0 && starFib <= 1) {
                        const sKey = getFibLookupKey(starFib, fib_ratios_from_input, config.adaptiveFibLevels ? adaptive_zones_A : undefined);
                        star_counts_A.set(sKey, (star_counts_A.get(sKey) ?? 0) + 1);
                        total_stars_A++;
                      }
                    }
                  }
                }
                lows_to_break_A.delete(last_big_label);
                labels_to_watch_A.delete(last_big_label);
              }

              // Update fib_end (lowest low)
              const cur = fib_end_points_A.get(last_big_label);
              if (cur === null || cur === undefined || prev_price2 < cur) {
                fib_end_points_A.set(last_big_label, prev_price2);
              }

              if (config.showPivotLabels) {
                pivotLabels.push({
                  barIndex: prev_bar2, price: prev_price2,
                  text: label_text, style: 'up',
                  color: 'rgba(255,68,68,0.8)', textColor: '#ffffff', size: 'small',
                });
              }

            } else if (last_big_label.startsWith('B')) {
              // B-series: calculate retracement
              const fib_start = fib_start_points_B.get(last_big_label);
              const fib_end = fib_end_points_B.get(last_big_label);

              if (fib_start !== undefined && fib_end !== undefined && fib_end !== null && fib_end > fib_start) {
                const fib_range_val = fib_end - fib_start;
                const retracement_level = (fib_end - prev_price2) / fib_range_val;

                all_fib_values_B.push(retracement_level);

                const azB = config.adaptiveFibLevels ? adaptive_zones_B : undefined;
                const fib_range_str = getFibRangeText(retracement_level, fib_ratios_from_input, azB);
                label_text += ' - Fib: ' + fib_range_str;

                const count_key = getFibLookupKey(retracement_level, fib_ratios_from_input, azB);
                fib_counts_B.set(count_key, (fib_counts_B.get(count_key) ?? 0) + 1);
                total_fibs_B++;

                const labelIdx = pivotLabels.length;
                pivotLabels.push({
                  barIndex: prev_bar2, price: prev_price2,
                  text: label_text, style: 'up',
                  color: config.showPivotLabels ? 'rgba(255,68,68,0.8)' : 'transparent',
                  textColor: config.showPivotLabels ? '#ffffff' : 'transparent', size: 'small',
                });
                labels_to_watch_B.set(last_big_label, labelIdx);
                highs_to_break_B.set(last_big_label, fib_end);
                label_fib_data.set(labelIdx, { fibStart: fib_start, fibEnd: fib_end, price: prev_price2, series: 'B' });
              } else {
                if (config.showPivotLabels) {
                  pivotLabels.push({
                    barIndex: prev_bar2, price: prev_price2,
                    text: label_text, style: 'up',
                    color: 'rgba(255,68,68,0.8)', textColor: '#ffffff', size: 'small',
                  });
                }
              }
            } else {
              if (config.showPivotLabels) {
                pivotLabels.push({
                  barIndex: prev_bar2, price: prev_price2,
                  text: label_text, style: 'up',
                  color: 'rgba(255,68,68,0.8)', textColor: '#ffffff', size: 'small',
                });
              }
            }
          }
        }

        // add_to_zigzag2
        const val2 = dir2 === 1 ? (ph2 ?? highs[i]) : (pl2 ?? lows[i]);
        zigzag2 = [val2, i, ...zigzag2];
        if (zigzag2.length > MAX_ARRAY_SIZE * 2) {
          zigzag2 = zigzag2.slice(0, MAX_ARRAY_SIZE * 2);
        }
      } else {
        // update_zigzag2
        const val2 = dir2 === 1 ? (ph2 ?? highs[i]) : (pl2 ?? lows[i]);
        if (zigzag2.length === 0) {
          zigzag2 = [val2, i];
        } else {
          if ((dir2 === 1 && val2 > zigzag2[0]) || (dir2 === -1 && val2 < zigzag2[0])) {
            zigzag2[0] = val2;
            zigzag2[1] = i;
          }
        }
      }
    }

    // === ZIGZAG 2 DRAWING ===
    if (config.showZigzag2 && zigzag2.length >= 4) {
      if (zigzag2[0] !== old_zz2_0 || zigzag2[1] !== old_zz2_1) {
        zigzag2Lines.push({
          x1: Math.round(zigzag2[1]), y1: zigzag2[0],
          x2: Math.round(zigzag2[3]), y2: zigzag2[2],
          color: dir2 === 1 ? config.upcol2 : config.dncol2,
          width: 2,
        });
      }
    }

    prev_dir = dir;
    prev_dir2 = dir2;
  }

  // === CURRENT PIVOT (ongoing) ===
  let current_pivot: number | null = null;
  let current_pivot_bar: number | null = null;
  if (zigzag.length >= 2) {
    current_pivot = zigzag[0];
    current_pivot_bar = Math.round(zigzag[1]);
  }

  // If no completed pivot from direction change, try from zigzag
  if (last_completed_pivot === null && zigzag.length >= 4) {
    last_completed_pivot = zigzag[2];
    last_completed_bar = Math.round(zigzag[3]);
  }

  // === DYNAMIC FIBONACCI LEVELS ===
  const fibLines: FibLine[] = [];
  const fibBoxes: FibBoxData[] = [];
  let fibRangeStartBar = 0;
  let fibRangeEndBar = n - 1;

  if (config.showFibs && last_completed_pivot !== null && current_pivot !== null &&
      last_completed_bar !== null && current_pivot_bar !== null) {
    
    fibRangeStartBar = last_completed_bar;
    fibRangeEndBar = current_pivot_bar;

    const price_diff = current_pivot - last_completed_pivot;
    const is_downtrend = current_pivot < last_completed_pivot;

    // Build fib prices - adaptive or fixed
    const fibPrices: { price: number; color: string; ratio: number }[] = [];

    if (config.adaptiveFibLevels) {
      const zones = is_downtrend ? adaptive_zones_A : adaptive_zones_B;
      if (zones.length >= 6) {
        for (let zi = 0; zi < zones.length; zi++) {
          const zoneLevel = zones[zi];
          fibPrices.push({
            price: current_pivot - price_diff * zoneLevel,
            color: getAdaptiveZoneColor(zi),
            ratio: zoneLevel,
          });
          fibLines.push({
            price: current_pivot - price_diff * zoneLevel,
            color: getAdaptiveZoneColor(zi),
            ratio: zoneLevel,
          });
        }
      } else {
        // Fallback to fixed fib levels
        for (const fl of config.fibLevels) {
          if (fl.show) {
            fibPrices.push({ price: current_pivot - price_diff * fl.ratio, color: fl.color, ratio: fl.ratio });
            fibLines.push({ price: current_pivot - price_diff * fl.ratio, color: fl.color, ratio: fl.ratio });
          }
        }
      }
    } else {
      for (const fl of config.fibLevels) {
        if (fl.show) {
          fibPrices.push({ price: current_pivot - price_diff * fl.ratio, color: fl.color, ratio: fl.ratio });
          fibLines.push({ price: current_pivot - price_diff * fl.ratio, color: fl.color, ratio: fl.ratio });
        }
      }
    }

    // Build fib boxes
    if (config.showFibBoxes && fibPrices.length > 1) {
      // Sort by price
      const sorted = [...fibPrices].sort((a, b) => a.price - b.price);

      for (let i = 0; i < sorted.length - 1; i++) {
        const bottom = sorted[i];
        const top = sorted[i + 1];

        if (Math.abs(top.price - bottom.price) / Math.max(top.price, 1) < 0.00001) continue;

        const minRatio = Math.min(bottom.ratio, top.ratio);
        const maxRatio = Math.max(bottom.ratio, top.ratio);

        // Determine range text and lookup key based on adaptive or fixed mode
        let range_text: string;
        let lookup_key: string;

        if (config.adaptiveFibLevels) {
          const zones = is_downtrend ? adaptive_zones_A : adaptive_zones_B;
          if (zones.length >= 6) {
            const avgRatio = (minRatio + maxRatio) / 2;
            const nz1End = zones[1], cz1End = zones[2], cz2End = zones[3], nz2Start = zones[4];
            let zoneName: string;
            if (avgRatio < nz1End) zoneName = 'NZ1';
            else if (avgRatio < cz1End) zoneName = 'CZ1';
            else if (avgRatio < cz2End) zoneName = 'CZ2';
            else if (avgRatio < nz2Start) zoneName = 'CZ3';
            else zoneName = 'NZ2';
            range_text = zoneName + ': ' + minRatio.toFixed(3) + ' - ' + maxRatio.toFixed(3);
            lookup_key = zoneName;
          } else {
            range_text = minRatio.toFixed(3) + ' - ' + maxRatio.toFixed(3);
            lookup_key = minRatio.toFixed(3) + '-' + maxRatio.toFixed(3);
          }
        } else {
          range_text = minRatio.toFixed(3) + ' - ' + maxRatio.toFixed(3);
          lookup_key = minRatio.toFixed(3) + '-' + maxRatio.toFixed(3);
        }

        // Get counts
        let count_val = 0;
        let star_count = 0;
        let confidence_pct = 0;
        let star_conf_pct = 0;
        let starred_only_pct = 0;

        if (last_big_label.startsWith('A')) {
          count_val = fib_counts_A.get(lookup_key) ?? 0;
          star_count = star_counts_A.get(lookup_key) ?? 0;
          if (total_fibs_A > 0) confidence_pct = (count_val / total_fibs_A) * 100;
          if (total_stars_A > 0) starred_only_pct = (star_count / total_stars_A) * 100;
        } else if (last_big_label.startsWith('B')) {
          count_val = fib_counts_B.get(lookup_key) ?? 0;
          star_count = star_counts_B.get(lookup_key) ?? 0;
          if (total_fibs_B > 0) confidence_pct = (count_val / total_fibs_B) * 100;
          if (total_stars_B > 0) starred_only_pct = (star_count / total_stars_B) * 100;
        }

        if (count_val > 0) {
          star_conf_pct = (star_count / count_val) * 100;
        }

        let labelText = range_text;
        if (count_val > 0) labelText += '\nTotal: ' + count_val;
        if (confidence_pct > 0) labelText += '\nConf: ' + confidence_pct.toFixed(1) + '%';
        if (star_conf_pct > 0) labelText += '\n★ Conf: ' + star_conf_pct.toFixed(1) + '%';
        if (starred_only_pct > 0) labelText += '\n★ Only: ' + starred_only_pct.toFixed(1) + '%';

        fibBoxes.push({
          left: last_completed_bar,
          right: n - 1,
          top: top.price,
          bottom: bottom.price,
          bgColor: bottom.color + '15',
          borderColor: bottom.color + '40',
          labelText,
        });
      }
    }
  }

  // === MARKET PRESSURE GAUGE ===
  let gauge: GaugeData | null = null;
  if (config.showMarketPressureGauge && zigzag.length >= 4) {
    // Dynamic gauge length from zigzag2
    let dynamic_gauge_length = 50;
    if (zigzag2.length >= 4) {
      const d = Math.round(zigzag2[1]) - Math.round(zigzag2[3]);
      dynamic_gauge_length = Math.max(10, Math.min(1000, d));
    }

    // Calculate INT/INTSUM
    const intValues: number[] = [];
    for (let i = 0; i < n; i++) {
      const k1 = (2 * closes[i] - highs[i] - lows[i]) * volumes[i];
      const k2 = highs[i] !== lows[i] ? highs[i] - lows[i] : 1;
      intValues.push(k1 / k2);
    }

    const lastBar = n - 1;
    let intsum = 0;
    const start = Math.max(0, lastBar - dynamic_gauge_length + 1);
    for (let j = start; j <= lastBar; j++) intsum += intValues[j];

    // Highest/lowest pressure in period
    let hPressure = -Infinity, lPressure = Infinity;
    for (let j = start; j <= lastBar; j++) {
      let sum = 0;
      const s2 = Math.max(0, j - dynamic_gauge_length + 1);
      for (let k = s2; k <= j; k++) sum += intValues[k];
      if (sum > hPressure) hPressure = sum;
      if (sum < lPressure) lPressure = sum;
    }

    if (hPressure !== lPressure) {
      // Bounds from zigzag1
      let topBound: number, bottomBound: number;
      const completedPivot = zigzag.length >= 4 ? zigzag[2] : zigzag[0];
      const ongoingPivot = zigzag[0];

      if (dir === 1) {
        bottomBound = completedPivot;
        topBound = ongoingPivot;
      } else {
        topBound = completedPivot;
        bottomBound = ongoingPivot;
      }
      if (topBound < bottomBound) [topBound, bottomBound] = [bottomBound, topBound];

      const gaugeHeight = topBound - bottomBound;
      if (gaugeHeight > 0) {
        const SEGMENTS = 21;
        const segLen = gaugeHeight / SEGMENTS;
        const segments: GaugeData['segments'] = [];

        for (let s = 0; s < SEGMENTS; s++) {
          const y1 = topBound - s * segLen;
          const y2 = topBound - (s + 1) * segLen;
          const ratio = (y1 - bottomBound) / gaugeHeight;
          segments.push({ y1, y2, color: interpolateColor(config.bearishColor, config.bullishColor, ratio) });
        }

        const pressurePct = Math.max(-100, Math.min(100,
          -100 * 2 * ((intsum - lPressure) / (hPressure - lPressure) - 0.5)
        ));
        const pointerY = topBound - ((pressurePct + 100) / 200) * gaugeHeight;

        gauge = {
          segments, pointerY, topBound, bottomBound,
          barIndex: lastBar, offset: config.gaugeOffset,
        };
      }
    }
  }

  return {
    zigzagLines: dedupeZigzagLines(zigzagLines),
    zigzag2Lines: dedupeZigzagLines(zigzag2Lines),
    pivotLabels,
    fibLines,
    fibBoxes,
    gauge,
    fibRangeStartBar,
    fibRangeEndBar,
  };
}

// ============= HELPERS =============

function getFibRangeText(level: number, ratios: number[], adaptiveZones?: number[]): string {
  // If adaptive zones available, use zone names
  if (adaptiveZones && adaptiveZones.length >= 6) {
    const zone = getAdaptiveZoneName(level, adaptiveZones);
    if (zone) {
      return zone.name + ': ' + zone.lower.toFixed(3) + '-' + zone.upper.toFixed(3);
    }
  }
  // Fallback to fixed ratios
  if (ratios.length > 1) {
    if (level < ratios[0]) return '< ' + ratios[0].toFixed(3);
    for (let i = 1; i < ratios.length; i++) {
      if (level >= ratios[i - 1] && level < ratios[i]) {
        return ratios[i - 1].toFixed(3) + '-' + ratios[i].toFixed(3);
      }
    }
    if (level >= ratios[ratios.length - 1]) {
      return '>= ' + ratios[ratios.length - 1].toFixed(3);
    }
  }
  return level.toFixed(3);
}

/** Get lookup key for counting (zone name for adaptive, ratio range for fixed) */
function getFibLookupKey(level: number, ratios: number[], adaptiveZones?: number[]): string {
  if (adaptiveZones && adaptiveZones.length >= 6) {
    const zone = getAdaptiveZoneName(level, adaptiveZones);
    if (zone) return zone.name;
  }
  if (ratios.length > 1) {
    if (level < ratios[0]) return '< ' + ratios[0].toFixed(3);
    for (let i = 1; i < ratios.length; i++) {
      if (level >= ratios[i - 1] && level < ratios[i]) {
        return ratios[i - 1].toFixed(3) + '-' + ratios[i].toFixed(3);
      }
    }
    if (level >= ratios[ratios.length - 1]) {
      return '>= ' + ratios[ratios.length - 1].toFixed(3);
    }
  }
  return level.toFixed(3);
}

/** Remove duplicate zigzag lines (Pine deletes & redraws — we keep only final) */
function dedupeZigzagLines(lines: ZigZagLine[]): ZigZagLine[] {
  // Pine Script deletes the old line when the same segment updates
  // We keep only the last line for each x2 endpoint
  const map = new Map<string, ZigZagLine>();
  for (const line of lines) {
    const key = `${line.x2}-${line.y2}`;
    map.set(key, line);
  }
  return Array.from(map.values()).sort((a, b) => a.x1 - b.x1);
}
