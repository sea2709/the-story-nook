const { GoogleGenAI } = require('@google/genai');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const UPLOADS_DIR = path.join(__dirname, '../public/uploads');

const MODEL = 'gemini-3.1-pro-preview';

const STYLE_NAMES = {
  watercolor: 'soft watercolor painting',
  cartoon:    'bold flat cartoon',
  sketch:     'pencil sketch',
  digital:    'vibrant digital illustration',
};

const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_API_KEY });

async function generateBookText(title, style, imagePaths = [], size = 'portrait') {

  const styleName = STYLE_NAMES[style] || style;
  const spreadCount = Math.max(2, Math.ceil(Math.max(imagePaths.length, 1) / 2));
  const sizePart = size === 'landscape' ? ' Illustrations are wide landscape format (16:9).' : ' Illustrations are portrait format (3:4).';

  const instruction = `Picture book titled "${title}".${sizePart} Generate ${spreadCount} spreads with short, child-friendly sentences for ages 4–8. Style: ${styleName}. Respond ONLY as a JSON array:\n[{"leftText":"...","rightText":"..."},...]`;

  const parts = imagePaths.length > 0
    ? [
        { text: `Describe what you see in each of these images, then use those visual descriptions to craft a cohesive story. ${instruction}` },
        ...imagePaths.map(p => {
          const ext = p.split('.').pop().toLowerCase();
          const mimeType = ext === 'png' ? 'image/png' : ext === 'gif' ? 'image/gif' : ext === 'webp' ? 'image/webp' : 'image/jpeg';
          return { inlineData: { mimeType, data: fs.readFileSync(p).toString('base64') } };
        }),
      ]
    : instruction;

  const response = await ai.models.generateContent({
    model: MODEL,
    contents: parts,
    config: { responseMimeType: 'application/json' },
  });

  return JSON.parse(response.text);
}

async function generateFeedback(bookTitle, spread, feedback, style) {

  const prompt = `Reviewing picture book "${bookTitle}". Spread: left="${spread.lt}" right="${spread.rt}" style=${style}. Admin feedback: "${feedback}". Give 1–2 sentences of concrete suggestions. Be concise.`;
  const response = await ai.models.generateContent({
    model: MODEL,
    contents: prompt,
  });
  return response.text.trim() || 'Noted.';
}

async function generateRegenDescription(bookTitle, pageText, prompt, style) {

  const styleName = STYLE_NAMES[style] || style;
  const p = `Picture book "${bookTitle}". Page text: "${pageText}". Style: ${styleName}. Admin prompt: "${prompt}". In 1–2 sentences describe what the new illustration shows. Confirm warmly.`;
  const response = await ai.models.generateContent({
    model: MODEL,
    contents: p,
    config: { maxOutputTokens: 160 },
  });
  return response.text.trim() || 'New illustration applied.';
}

async function generateImage(bookTitle, pageText, description, style, size) {

  const styleName = STYLE_NAMES[style] || style;
  const aspectRatio = size === 'landscape' ? '16:9' : '3:4';

  const prompt = [
    description ? `Theme: ${description}. ` : '',
    `Children's picture book illustration for "${bookTitle}". `,
    `Scene: ${pageText}. `,
    `Art style: ${styleName}, warm and child-friendly. No text, letters, words, or numbers in the image.`,
  ].join('');

  const response = await ai.models.generateImages({
    model: 'imagen-4.0-generate-001',
    prompt,
    config: { numberOfImages: 1, aspectRatio, outputMimeType: 'image/jpeg' },
  });

  const imageBytes = response.generatedImages[0].image.imageBytes;
  const filename = `gen-${uuidv4()}.jpg`;
  fs.writeFileSync(path.join(UPLOADS_DIR, filename), Buffer.from(imageBytes, 'base64'));
  return `/uploads/${filename}`;
}

module.exports = { generateBookText, generateFeedback, generateRegenDescription, generateImage };
