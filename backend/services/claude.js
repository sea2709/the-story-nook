const Anthropic = require('@anthropic-ai/sdk');
const fs = require('fs');

const STYLE_NAMES = {
  watercolor: 'soft watercolor painting',
  cartoon: 'bold flat cartoon',
  sketch: 'pencil sketch',
  digital: 'vibrant digital illustration',
};

function getClient() {
  return new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
}

async function generateBookText(title, style, imagePaths = []) {
  const client = getClient();
  const styleName = STYLE_NAMES[style] || style;
  const spreadCount = Math.max(2, Math.ceil(Math.max(imagePaths.length, 1) / 2));

  const instruction = `Picture book titled "${title}". Generate ${spreadCount} spreads with short, child-friendly sentences for ages 4–8. Style: ${styleName}. Respond ONLY as a JSON array, no markdown fences:\n[{"leftText":"...","rightText":"..."},...]`;

  let content;
  if (imagePaths.length > 0) {
    content = [{ type: 'text', text: `Extract any visible text from these page photos, then craft a cohesive story. ${instruction}` }];
    for (const p of imagePaths) {
      const ext = p.split('.').pop().toLowerCase();
      const mediaType = ext === 'png' ? 'image/png' : ext === 'gif' ? 'image/gif' : ext === 'webp' ? 'image/webp' : 'image/jpeg';
      content.push({ type: 'image', source: { type: 'base64', media_type: mediaType, data: fs.readFileSync(p).toString('base64') } });
    }
  } else {
    content = instruction;
  }

  const response = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1200,
    messages: [{ role: 'user', content }],
  });

  const raw = response.content.map(c => c.text || '').join('').replace(/```json|```/g, '').trim();
  return JSON.parse(raw);
}

async function generateFeedback(bookTitle, spread, feedback, style) {
  const client = getClient();
  const prompt = `Reviewing picture book "${bookTitle}". Spread: left="${spread.lt}" right="${spread.rt}" style=${style}. Admin feedback: "${feedback}". Give 1–2 sentences of concrete suggestions. Be concise.`;
  const response = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 200,
    messages: [{ role: 'user', content: prompt }],
  });
  return response.content.map(c => c.text || '').join('') || 'Noted.';
}

async function generateRegenDescription(bookTitle, pageText, prompt, style) {
  const client = getClient();
  const styleName = STYLE_NAMES[style] || style;
  const p = `Picture book "${bookTitle}". Page text: "${pageText}". Style: ${styleName}. Admin prompt: "${prompt}". In 1–2 sentences describe what the new illustration shows. Confirm warmly.`;
  const response = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 160,
    messages: [{ role: 'user', content: p }],
  });
  return response.content.map(c => c.text || '').join('') || 'New illustration applied.';
}

module.exports = { generateBookText, generateFeedback, generateRegenDescription };
