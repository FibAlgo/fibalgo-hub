/**
 * IndexNow Key Verification
 * GET /api/indexnow-key → serves the key as plain text
 * Bing/Yandex/Seznam/Naver verify this to accept IndexNow submissions.
 */
export function GET() {
  return new Response('be7fb56cfe924b0ab6c97b4971af199e', {
    headers: { 'Content-Type': 'text/plain' },
  });
}
