/**
 * Alpaca gerçek zamanlı haber WebSocket testi.
 *
 * Ne lazım:
 *   1. Ücretsiz Alpaca hesabı: https://app.alpaca.markets/signup
 *   2. Dashboard → API Keys → Key ID + Secret Key oluştur
 *   3. .env.local içine ekle:
 *        ALPACA_API_KEY_ID=xxx
 *        ALPACA_API_SECRET_KEY=xxx
 *
 * Çalıştır: node scripts/alpaca-news-ws-test.mjs
 * (İlk 5 haber gelene kadar veya 60 sn bekler, sonra çıkar.)
 */

import WebSocket from 'ws';
import fs from 'fs';
import path from 'path';

const SANDBOX_URL = 'wss://stream.data.sandbox.alpaca.markets/v1beta1/news';
const PROD_URL = 'wss://stream.data.alpaca.markets/v1beta1/news';

function getEnv() {
  let keyId = process.env.ALPACA_API_KEY_ID ?? '';
  let secret = process.env.ALPACA_API_SECRET_KEY ?? '';
  if (!keyId || !secret) {
    try {
      const envPath = path.join(process.cwd(), '.env.local');
      if (fs.existsSync(envPath)) {
        const content = fs.readFileSync(envPath, 'utf8');
        for (const line of content.split('\n')) {
          const m = line.match(/^\s*ALPACA_API_KEY_ID\s*=\s*["']?([^"'\s#]+)/);
          if (m) keyId = m[1].trim();
          const m2 = line.match(/^\s*ALPACA_API_SECRET_KEY\s*=\s*["']?([^"'\s#]+)/);
          if (m2) secret = m2[1].trim();
        }
      }
    } catch (_) {}
  }
  return { keyId, secret };
}

async function main() {
  const { keyId, secret } = getEnv();
  if (!keyId || !secret) {
    console.error('ALPACA_API_KEY_ID ve ALPACA_API_SECRET_KEY gerekli (.env.local veya env)');
    process.exit(1);
  }

  const useSandbox = process.env.ALPACA_USE_SANDBOX !== '0';
  const url = useSandbox ? SANDBOX_URL : PROD_URL;
  console.log('Bağlanıyor:', url);
  console.log('(Sandbox kapatmak için: ALPACA_USE_SANDBOX=0)\n');

  const ws = new WebSocket(url, {
    headers: {
      'APCA-API-KEY-ID': keyId,
      'APCA-API-SECRET-KEY': secret,
    },
  });

  let received = 0;
  const maxNews = 5;

  ws.on('open', () => {
    ws.send(JSON.stringify({ action: 'subscribe', news: ['*'] }));
  });

  ws.on('message', (data) => {
    try {
      const msg = JSON.parse(data.toString());
      if (msg.T === 'success') {
        console.log('[Alpaca]', msg.msg || msg);
        return;
      }
      if (msg.T === 'subscription') {
        console.log('[Alpaca] Abone olundu:', msg.news || msg);
        return;
      }
      if (msg.T === 'n') {
        received++;
        console.log('\n--- Haber', received, '---');
        console.log('Başlık:', msg.headline || '(yok)');
        console.log('Kaynak:', msg.source || '(yok)');
        console.log('Tarih:', msg.created_at || '(yok)');
        console.log('Semboller:', (msg.symbols || []).join(', ') || '(yok)');
        console.log('URL:', msg.url || '(yok)');
        if (msg.summary) console.log('Özet:', msg.summary.slice(0, 200) + (msg.summary.length > 200 ? '...' : ''));
        if (received >= maxNews) {
          console.log('\n' + maxNews + ' haber alındı, çıkılıyor.');
          ws.close();
        }
        return;
      }
      console.log('[Alpaca]', msg);
    } catch (e) {
      console.log('[Ham]', data.toString().slice(0, 200));
    }
  });

  ws.on('error', (err) => {
    console.error('WebSocket hata:', err.message);
  });

  ws.on('close', () => {
    console.log('Bağlantı kapandı.');
    process.exit(0);
  });

  setTimeout(() => {
    if (ws.readyState === WebSocket.OPEN) {
      console.log('\n60 sn doldu, kapatılıyor.');
      ws.close();
    }
  }, 60000);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
