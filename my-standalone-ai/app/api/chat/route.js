import { GAURAV_KNOWLEDGE_BASE } from './knowledgeBase';

// ─── Rate Limiting ────────────────────────────────────────────────────────────
const rateLimitMap = new Map();
const RATE_LIMIT = 20;
const RATE_WINDOW = 60 * 1000;

function checkRateLimit(ip) {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now - entry.windowStart > RATE_WINDOW) {
    rateLimitMap.set(ip, { count: 1, windowStart: now });
    return true;
  }
  if (entry.count >= RATE_LIMIT) return false;
  entry.count += 1;
  return true;
}

// ─── OpenAI Handler ──────────────────────────────────────────────────────────
async function callOpenAI(messages, userMessage) {
  const OpenAI = (await import('openai')).default;
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const conversation = [
    { role: 'system', content: GAURAV_KNOWLEDGE_BASE },
    ...messages.map((m) => ({ role: m.role, content: m.content })),
    { role: 'user', content: userMessage },
  ];
  const stream = await client.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: conversation,
    max_tokens: 300,
    temperature: 0.75,
    stream: true,
  });
  const encoder = new TextEncoder();
  return new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of stream) {
          const text = chunk.choices[0]?.delta?.content || '';
          if (text) controller.enqueue(encoder.encode(text));
        }
      } finally {
        controller.close();
      }
    },
  });
}

// ─── Gemini Handler (REST API – free tier compatible) ────────────────────────
async function callGemini(messages, userMessage) {
  const apiKey = process.env.GOOGLE_GEMINI_API_KEY;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

  // Build history (Gemini requires alternating user/model)
  const contents = [];
  for (const msg of messages) {
    const role = msg.role === 'assistant' ? 'model' : 'user';
    if (contents.length === 0 && role !== 'user') continue;
    if (contents.length > 0 && contents[contents.length - 1].role === role) continue;
    contents.push({ role, parts: [{ text: msg.content || ' ' }] });
  }
  contents.push({ role: 'user', parts: [{ text: userMessage }] });

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents,
      systemInstruction: { parts: [{ text: GAURAV_KNOWLEDGE_BASE }] },
      generationConfig: { maxOutputTokens: 350, temperature: 0.75 },
    }),
  });

  if (!res.ok) {
    const errBody = await res.text();
    const errMsg = errBody.includes('API key not valid')
      ? 'Your Gemini API key is invalid. Please generate a new one at https://aistudio.google.com/app/apikey'
      : `Gemini API error (${res.status})`;
    throw new Error(errMsg);
  }

  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';

  // Return a ReadableStream from the text (non-streaming but compatible)
  const encoder = new TextEncoder();
  return new ReadableStream({
    start(controller) {
      controller.enqueue(encoder.encode(text));
      controller.close();
    },
  });
}

// ─── Gemini Streaming Handler ────────────────────────────────────────────────
async function callGeminiStream(messages, userMessage) {
  const apiKey = process.env.GOOGLE_GEMINI_API_KEY;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:streamGenerateContent?alt=sse&key=${apiKey}`;

  const contents = [];
  for (const msg of messages) {
    const role = msg.role === 'assistant' ? 'model' : 'user';
    if (contents.length === 0 && role !== 'user') continue;
    if (contents.length > 0 && contents[contents.length - 1].role === role) continue;
    contents.push({ role, parts: [{ text: msg.content || ' ' }] });
  }
  contents.push({ role: 'user', parts: [{ text: userMessage }] });

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents,
      systemInstruction: { parts: [{ text: GAURAV_KNOWLEDGE_BASE }] },
      generationConfig: { maxOutputTokens: 350, temperature: 0.75 },
    }),
  });

  if (!res.ok) {
    const errBody = await res.text();
    if (errBody.includes('API key not valid')) {
      throw new Error('Invalid Gemini API key. Get a new one at https://aistudio.google.com/app/apikey');
    }
    throw new Error(`Gemini API error ${res.status}`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();

  return new ReadableStream({
    async start(controller) {
      let buffer = '';
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';
          for (const line of lines) {
            if (!line.startsWith('data: ')) continue;
            const raw = line.slice(6).trim();
            if (!raw || raw === '[DONE]') continue;
            try {
              const json = JSON.parse(raw);
              const t = json?.candidates?.[0]?.content?.parts?.[0]?.text;
              if (t) controller.enqueue(encoder.encode(t));
            } catch { /* skip bad chunk */ }
          }
        }
      } finally {
        controller.close();
      }
    },
    cancel() { reader.cancel(); },
  });
}

// ─── Main Route ───────────────────────────────────────────────────────────────
export async function POST(req) {
  try {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    if (!checkRateLimit(ip)) {
      return Response.json({ error: 'Too many requests. Please wait a moment.' }, { status: 429 });
    }

    const { messages = [], userMessage } = await req.json();
    if (!userMessage?.trim()) {
      return Response.json({ error: 'Message is required.' }, { status: 400 });
    }
    if (userMessage.trim().length > 500) {
      return Response.json({ error: 'Message too long (max 500 characters).' }, { status: 400 });
    }

    const openaiKey = (process.env.OPENAI_API_KEY || '').trim();
    const geminiKey = (process.env.GOOGLE_GEMINI_API_KEY || '').trim();
    const hasOpenAI = openaiKey.length > 10 && openaiKey.startsWith('sk-');
    const hasGemini = geminiKey.length > 10;

    if (!hasOpenAI && !hasGemini) {
      return Response.json(
        { error: 'No AI API key configured. Add OPENAI_API_KEY or GOOGLE_GEMINI_API_KEY to .env.local' },
        { status: 503 }
      );
    }

    let stream;
    let provider = hasOpenAI ? 'openai' : 'gemini';

    try {
      if (hasOpenAI) {
        stream = await callOpenAI(messages, userMessage.trim());
      } else {
        // Try streaming first, fall back to non-streaming
        try {
          stream = await callGeminiStream(messages, userMessage.trim());
        } catch {
          stream = await callGemini(messages, userMessage.trim());
        }
      }
    } catch (primaryErr) {
      console.error(`[AI Chat] ${provider} failed:`, primaryErr.message);
      // Fallback: OpenAI failed → try Gemini
      if (provider === 'openai' && hasGemini) {
        try {
          stream = await callGeminiStream(messages, userMessage.trim());
        } catch {
          stream = await callGemini(messages, userMessage.trim());
        }
        provider = 'gemini-fallback';
      } else {
        throw primaryErr;
      }
    }

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache',
        'X-AI-Provider': provider,
      },
    });
  } catch (err) {
    console.error('[AI Chat Error]', err.message);
    const userMsg = err.message.includes('API key')
      ? err.message
      : 'Something went wrong. Try again in a moment!';
    return Response.json({ error: userMsg }, { status: 500 });
  }
}
