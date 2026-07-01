// build v3 — gpt-image-1, 깨끗한 일러스트(글자·아이콘 없이) + 왼쪽 비움
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
Composition: wide 16:9 banner. The LEFT ~40% is soft empty negative space (bright, light, gently fading out). The ${site} scene sits on the RIGHT ~60%: one worker in a ${color} safety vest and white hard hat near the center-right, plus clean stylized machinery/equipment on the far right.
Bright light background with a very subtle ${color} tint. Single accent color ${color}. Soft, minimal, high-end corporate 3D illustration.
ABSOLUTELY NO text, NO labels, NO detection boxes, NO flame or warning icons, NO UI overlays, NO logos, NO watermark — keep the whole image completely clean.${ai ? ' (site AI focus: ' + ai + ')' : ''}${extra ? '\nAlso: ' + extra : ''}`;
 
  try {
    const r = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + key },
      body: JSON.stringify({ model: 'gpt-image-1', prompt, size: '1536x1024', quality: 'medium', n: 1 })
    });
    if (!r.ok) {
      const t = await r.text().catch(() => '');
      res.status(500).json({ error: 'OpenAI ' + r.status + ' ' + t });
      return;
    }
    const d = await r.json();
    const b64 = d.data && d.data[0] && d.data[0].b64_json;
    const url = d.data && d.data[0] && d.data[0].url;
    if (b64) { res.status(200).json({ image: 'data:image/png;base64,' + b64 }); return; }
    if (url) { res.status(200).json({ url }); return; }
    res.status(500).json({ error: 'no image returned' });
  } catch (e) {
    res.status(500).json({ error: String(e && e.message || e) });
  }
}
