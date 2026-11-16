/**
 * Health check endpoint — public, no auth required
 * Used by CI and monitoring to verify the application is running
 */
export async function GET() {
  return Response.json({
    status: 'ok',
    service: 'pokevault-web',
    timestamp: new Date().toISOString(),
  })
}

