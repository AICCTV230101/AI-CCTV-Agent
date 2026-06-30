// /api/generate-image.js — Vercel Serverless Function (Node 18+)
// HTML의 STEP6 "🪄 AI로 표지 이미지 생성"이 호출하는 엔드포인트.
// 필요한 환경변수: OPENAI_API_KEY
//
// 입력(JSON): { site, coreAI:[], color }   ← color 는 선택한 템플릿 색(HEX)
// 출력(JSON): { image }  (data:image/png;base64,...)  또는  { url }

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
`Clean modern 3D isometric ILLUSTRATION for an enterprise "AI CCTV" proposal cover — NOT a photograph, no photorealism.
Scene: a bright, light-colored ${site} interior in a soft stylized 3D illustration style — light gray/white walls and floor, pastel tones, soft ambient shadows, airy with lots of light negative space. A few workers wearing magenta/pink safety vests and white hard hats operate clean stylized machinery and conveyor lines.
Subtle ${color} AI-detection bounding boxes highlight a worker (safety detection) and a machine with a small flame icon (fire detection)${ai ? ', reflecting: ' + ai : ''}.
Style: friendly high-end corporate 3D illustration, single accent color ${color}, mostly white/light background. No readable text, no captions, no logos, no watermark. 16:9 composition.${extra ? '\nAdditional user request (follow this): ' + extra : ''}`;

  try {
    const r = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + key },
      // dall-e-3: 조직 인증 없이 크레딧만으로 동작. (gpt-image-1로 바꾸려면 OpenAI 조직 인증 후 model만 교체)
      body: JSON.stringify({ model: 'dall-e-3', prompt, size: '1792x1024', n: 1 })
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
