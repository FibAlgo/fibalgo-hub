/**
 * IndexNow Key Verification
 * GET /api/indexnow-key → serves the key as plain text
 * Bing/Yandex/Seznam/Naver verify this to accept IndexNow submissions.
 */
export function GET() {
  return new Response('c811ab2aabd446b5aa6293efccaf0f14', {
    headers: { 'Content-Type': 'text/plain' },
  });
}
