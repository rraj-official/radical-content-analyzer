import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  // Block access to bulk-analysis route
  if (request.nextUrl.pathname.startsWith('/bulk-analysis')) {
    return new NextResponse('Access to this route is currently disabled.', {
      status: 403,
      statusText: 'Forbidden'
    })
  }

  return NextResponse.next()
}

export const config = {
  matcher: '/bulk-analysis/:path*'
} 