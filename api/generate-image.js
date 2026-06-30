// /api/generate-image.js — Vercel Serverless Function
export const maxDuration = 60;
 
export default async function handler(req, res) {
  if (req.method !== 'POST') { res.status(405).json({ error: 'POST only' }); return; }
 
  const key = process.env.OPENAI_API_KEY;
  if (!key) { res.status(500).json({ error: 'OPENAI_API_KEY 미설정' }); return; }
 
  let body = {};
  try { body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {}); } catch (e) {}
 
  const { site = '산업 현장', coreAI = [], color = '#E6007E', extra = '' } = body;
  const ai = Array.isArray(coreAI) ? coreAI.filter(Boolean).join(', ') : String(coreAI || '');
 
  const prompt =
`Clean modern 3D isometric ILLUSTRATION for an enterprise "AI CCTV" proposal cover — NOT a photograph.
Scene: a bright, light-colored ${site} interior, soft stylized 3D illustration, light gray/white walls and floor, pastel tones, airy with lots of white negative space. A few workers in magenta/pink safety vests and white hard hats operate clean stylized machinery.
Subtle ${color} AI-detection bounding boxes highlight a worker (safety) and a machine with a small flame icon (fire)${ai ? ', reflecting: ' + ai : ''}.
Single accent color ${color}, mostly white/light background. No readable text, no logos, no watermark. 16:9.${extra ? '\nAlso: ' + extra : ''}`;
 
  try {
    const r = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + key },
      body: JSON.stringify({ model: 'dall-e-3', prompt, size: '1792x1024', n: 1 })
    });
    if (!r.ok) {
      const t = await r.text().catch(() => '');
      res.status(500).json({ error: 'OpenAI ' + r.status + ' ' + t });
      return;
    }
    const d = await r.json();
    const url = d.data && d.data[0] && d.data[0].url;
    const b64 = d.data && d.data[0] && d.data[0].b64_json;
    if (url) { res.status(200).json({ url }); return; }
    if (b64) { res.status(200).json({ image: 'data:image/png;base64,' + b64 }); return; }
    res.status(500).json({ error: 'no image returned' });
  } catch (e) {
    res.status(500).json({ error: String(e && e.message || e) });
  }
}
