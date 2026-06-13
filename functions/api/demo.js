/**
 * Cloudflare Pages Function
 * Route: /api/demo  (POST)
 * 
 * Receives: { firstName, city }
 * Returns:  { message }  — the AI-generated lead response
 *
 * SETUP: Add ANTHROPIC_API_KEY to your Cloudflare Pages project
 *   Dashboard → alto-systems-site → Settings → Environment Variables → Add
 *   Variable name: ANTHROPIC_API_KEY
 *   Value: your Anthropic API key
 *   Encrypt: YES
 */

export async function onRequestPost(context) {
  try {
    const body = await context.request.json();

    // Sanitize inputs
    const firstName = String(body.firstName || '').trim().slice(0, 40);
    const city      = String(body.city      || '').trim().slice(0, 60);

    if (!firstName || !city || firstName.length < 2 || city.length < 2) {
      return json({ error: 'Missing or invalid fields.' }, 400);
    }

    const apiKey = context.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      console.error('ANTHROPIC_API_KEY not set in Cloudflare Pages environment variables.');
      return json({ error: 'Service not configured.' }, 500);
    }

    // ── Prompt ──
    // We're generating what the AGENT'S lead would receive.
    // Tone: warm, human, fast — like a great agent's assistant texted them.
    const prompt = `A lead named ${firstName} just submitted their contact info on a real estate agent's website. They're based in ${city}. The agent uses an AI system that responds within 60 seconds.

Write the follow-up text message the AI sends ${firstName} right now.

Rules:
- Start with their name (e.g. "Hey ${firstName}," or "${firstName}!")
- Mention ${city} naturally — don't force it if it sounds awkward
- Sound like a real person: warm, direct, genuinely helpful
- 3 sentences max
- End with one simple question that invites a reply (e.g. "When's a good time for a quick call?")
- No corporate language, no "I hope this finds you well", no "As an AI"
- Do not include a sign-off or signature

Reply ONLY with the message text. Nothing else.`;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method:  'POST',
      headers: {
        'Content-Type':      'application/json',
        'x-api-key':         apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model:      'claude-sonnet-4-6',  // Quality matters for a sales demo
        max_tokens: 180,
        messages:   [{ role: 'user', content: prompt }],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('Anthropic API error:', response.status, errText);
      return json({ error: 'AI service error. Please try again.' }, 502);
    }

    const data    = await response.json();
    const message = (data.content?.[0]?.text || '').trim();

    if (!message) {
      return json({ error: 'Empty response from AI. Please try again.' }, 502);
    }

    return json({ message });

  } catch (err) {
    console.error('Demo function error:', err);
    return json({ error: 'Unexpected error. Please try again.' }, 500);
  }
}

// Helper
function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
