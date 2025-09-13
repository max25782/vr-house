export async function GET() {
  return new Response(JSON.stringify({ message: 'API s3 presign endpoint' }), {
    headers: { 'Content-Type': 'application/json' },
  });
}

