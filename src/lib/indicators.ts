
export interface Candle {
  t: number; // timestamp
  o: number; // open
  h: number; // high
  l: number; // low
  c: number; // close
  v: number; // volume
}

export function calculateSMA(data: Candle[], period: number) {
  const result = [];
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      result.push({ time: data[i].t / 1000, value: NaN });
      continue;
    }
    let sum = 0;
    for (let j = 0; j < period; j++) {
      sum += data[i - j].c;
    }
    result.push({ time: data[i].t / 1000, value: sum / period });
  }
  return result.filter(r => !isNaN(r.value));
}

export function calculateEMA(data: Candle[], period: number) {
  const result = [];
  const k = 2 / (period + 1);
  let ema = data[0].c;
  
  for (let i = 0; i < data.length; i++) {
    if (i === 0) {
      result.push({ time: data[i].t / 1000, value: ema });
      continue;
    }
    ema = data[i].c * k + ema * (1 - k);
    result.push({ time: data[i].t / 1000, value: ema });
  }
  return result;
}

export function calculateRSI(data: Candle[], period: number = 14) {
  const result = [];
  let gains = 0;
  let losses = 0;

  for (let i = 1; i < data.length; i++) {
    const change = data[i].c - data[i - 1].c;
    if (i <= period) {
      if (change > 0) gains += change;
      else losses -= change;
      
      if (i === period) {
        let avgGain = gains / period;
        let avgLoss = losses / period;
        let rs = avgGain / avgLoss;
        let rsi = 100 - (100 / (1 + rs));
        result.push({ time: data[i].t / 1000, value: rsi, avgGain, avgLoss });
      } else {
        result.push({ time: data[i].t / 1000, value: NaN });
      }
      continue;
    }

    const prev = result[result.length - 1];
    const change_pos = change > 0 ? change : 0;
    const change_neg = change < 0 ? -change : 0;

    const avgGain = (prev.avgGain * (period - 1) + change_pos) / period;
    const avgLoss = (prev.avgLoss * (period - 1) + change_neg) / period;
    const rs = avgGain / avgLoss;
    const rsi = 100 - (100 / (1 + rs));
    result.push({ time: data[i].t / 1000, value: rsi, avgGain, avgLoss });
  }
  return result.filter(r => !isNaN(r.value)).map(({ time, value }) => ({ time, value }));
}

export function calculateMACD(data: Candle[], fastPeriod: number = 12, slowPeriod: number = 26, signalPeriod: number = 9) {
  const fastEMA = calculateEMA(data, fastPeriod);
  const slowEMA = calculateEMA(data, slowPeriod);
  
  const macdLine = [];
  for (let i = 0; i < data.length; i++) {
    const f = fastEMA.find(e => e.time === data[i].t / 1000);
    const s = slowEMA.find(e => e.time === data[i].t / 1000);
    if (f && s) {
      macdLine.push({ time: data[i].t / 1000, value: f.value - s.value });
    }
  }

  // Signal line is EMA of MACD line
  const k = 2 / (signalPeriod + 1);
  let signalEMA = macdLine[0]?.value || 0;
  const signalLine = [];
  const histogram = [];

  for (let i = 0; i < macdLine.length; i++) {
    if (i === 0) {
      signalLine.push({ time: macdLine[i].time, value: signalEMA });
    } else {
      signalEMA = macdLine[i].value * k + signalEMA * (1 - k);
      signalLine.push({ time: macdLine[i].time, value: signalEMA });
    }
    histogram.push({ 
      time: macdLine[i].time, 
      value: macdLine[i].value - signalEMA,
      color: macdLine[i].value - signalEMA >= 0 ? '#26a69a' : '#ef5350'
    });
  }

  return { macdLine, signalLine, histogram };
}
