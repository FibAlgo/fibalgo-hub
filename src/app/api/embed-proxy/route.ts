import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const targetUrl = request.nextUrl.searchParams.get('url') || 'https://www.youtube.com';

  try {
    const res = await fetch(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      },
    });

    const contentType = res.headers.get('content-type') || 'text/html';
    const body = await res.arrayBuffer();

    return new NextResponse(body, {
      status: res.status,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=60, s-maxage=120',
      },
    });
  } catch {
    return NextResponse.json({ error: 'Failed to load' }, { status: 500 });
  }
}
