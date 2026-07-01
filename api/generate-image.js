// build v4 — 현장유형에 맞는 장면 (공장 강제 X) / gpt-image-1
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
`Clean modern 3D isometric illustration for an enterprise "AI CCTV" proposal cover — NOT a photograph, no photorealism.
Composition: wide 16:9 banner. The LEFT ~40% is soft empty light negative space (for text overlay later); the main scene sits on the RIGHT ~60%.
Scene: a realistic, recognizable "${site}" environment showing the people and objects that are actually typical of a real "${site}"${ai ? ' (safety focus: ' + ai + ')' : ''} — it must clearly look like a "${site}", NOT a factory or construction site unless "${site}" actually is one — being monitored by one or two small stylized CCTV cameras mounted on the ceiling or wall.
Bright, light background with a very subtle ${color} tint. Single accent color ${color}. Soft, minimal, friendly high-end corporate 3D illustration.
ABSOLUTELY NO text, NO labels, NO detection boxes, NO warning icons, NO UI overlays, NO logos, NO watermark — keep the whole image completely clean.${extra ? '\nAlso: ' + extra : ''}`;
 
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
