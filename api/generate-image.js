// build v4 — gpt-image-1 / 현장유형·고객사명으로 장소 추측
// /api/generate-image.js — Vercel Serverless Function (Node 18+)
// HTML의 STEP6 "🪄 AI로 표지 이미지 생성"이 호출하는 엔드포인트.
// 필요한 환경변수: OPENAI_API_KEY
//
// 입력(JSON): { site, coreAI:[], color }   ← color 는 선택한 템플릿 색(HEX)
// 출력(JSON): { image }  (data:image/png;base64,...)  또는  { url }

// 이미지 생성은 20~40초 걸림 → Vercel 기본 10초를 넘어서 60초로 늘림
export const maxDuration = 60;

export default async function handler(req, res) {
  if (req.method !== 'POST') { res.status(405).json({ error: 'POST only' }); return; }

  const key = process.env.OPENAI_API_KEY;
  if (!key) { res.status(500).json({ error: 'OPENAI_API_KEY 미설정' }); return; }

  let body = {};
  try { body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {}); } catch (e) {}

  const { site = '산업 현장', coreAI = [], color = '#E6007E', extra = '', cust = '', project = '' } = body;
  const ai = Array.isArray(coreAI) ? coreAI.filter(Boolean).join(', ') : String(coreAI || '');
  const hint = [site, cust, project].filter(Boolean).join(' / ');

  const prompt =
`Clean modern 3D isometric illustration for an enterprise "AI CCTV" proposal cover — NOT a photograph, no photorealism.
Context clues about the place: "${hint}". Read these Korean words and infer the EXACT real-world setting — e.g. 어린이집→a bright daycare with young children and a teacher; 병원→hospital ward; 물류/창고→warehouse with shelving and forklifts; 학교→school classroom; 매장/리테일/백화점→retail store; 제조/공장/생산→factory line; 건설→construction site; 항만→port. The scene MUST clearly match that place. Do NOT default to a factory or construction site unless the clues actually indicate one.
Composition: wide 16:9 banner. The LEFT ~40% is soft empty light negative space (for text overlay later); the main scene sits on the RIGHT ~60%, monitored by one or two small stylized CCTV cameras on the ceiling or wall.
Bright, light background with a very subtle ${color} tint. Single accent color ${color}. Soft, minimal, friendly high-end corporate 3D illustration.${ai ? '\nSafety focus (subtle, no text): ' + ai + '.' : ''}
ABSOLUTELY NO text, NO written words, NO labels, NO detection boxes, NO warning icons, NO logos, NO watermark — keep the whole image completely clean.${extra ? '\nAlso: ' + extra : ''}`;

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
