export async function GET() {
  return new Response(JSON.stringify({ message: 'API tunnel endpoint' }), {
    headers: { 'Content-Type': 'application/json' },
  });
}

