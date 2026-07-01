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
 
// build v2 — 뉴스: 실제 웹검색(gpt-4o-mini-search-preview) / 문구: 디테일 강화

export const maxDuration = 60;
 
export default async function handler(req, res) {

  if (req.method !== 'POST') { res.status(405).json({ error: 'POST only' }); return; }
 
  const key = process.env.OPENAI_API_KEY;

  if (!key) { res.status(500).json({ error: 'OPENAI_API_KEY 미설정 (Vercel 환경변수 확인)' }); return; }
 
  let body = {};

  try { body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {}); } catch (e) { body = {}; }
 
  const { mode, cust = '고객사', site = '현장', coreAI = [], newsRisk = '' } = body;

  const MODEL = 'gpt-4o-mini';
 
  // ── 모드 1) 최근 사고·뉴스 : 고객사명 기반 실제 웹검색 ──

  if (mode === 'news') {

    const q =

`"${cust}"(업종/현장: ${site})와 관련해, 웹에서 최근(가급적 최근 1~2년) 실제 보도된 안전사고·산업재해·화재·보안 사고 뉴스를 찾아라.

그중 AI CCTV(영상분석)로 '사전 예방·조기 감지·즉시 대응'이 가능한 유형을 골라, 제안서 도입근거로 쓸 한국어 한 문장(80~110자)으로 요약하라.

규칙:

- 실제 보도 기반으로만. 사건·수치를 지어내지 말 것.

- "${cust}" 직접 사례가 없으면 같은 업종(${site})의 최근 실제 사고 사례로.

- 문장만 출력(따옴표·링크·출처표기·각주 없이).`;

    try {

      let out = '';

      try {

        out = await callSearch(key, q);

      } catch (e) {

        out = await callOpenAI(key, MODEL,

          '당신은 B2B 안전솔루션 제안서 카피라이터입니다. 사실 기반, 한 문장.',

          `${site} 현장에서 최근 사회적으로 부각된 안전·보안 위험 경향을 근거로 AI CCTV 도입 필요성을 한 문장(80자 내외)으로. 특정 사건·수치·연도는 지어내지 말 것. 문장만.`,

          false);

      }

      res.status(200).json({ news: cleanText(out) });

    } catch (e) {

      res.status(500).json({ error: String(e && e.message || e) });

    }

    return;

  }
 
  // ── 모드 2) 제안서 생성형 문구 (디테일 강화) ──

  const aiList = Array.isArray(coreAI) ? coreAI.filter(Boolean).join(', ') : String(coreAI || '');
 
  const sys =

`당신은 LG U+ 기업영업의 시니어 제안 컨설턴트입니다. AI CCTV(영상분석) 제안서 문구를 한국어로 작성합니다.

원칙:

- 사실 기반. 수치·법규·연도·사건명을 임의로 지어내지 말 것(주어진 newsRisk만 활용).

- 제안서 톤(명사형/단정형). 과장·감탄·이모지 금지.

- 추상적 표현 대신 현장유형·AI기능에 '밀착한 구체적' 표현을 쓸 것.

- 핵심 키워드: "사후 대응 → 사전 예방", "사고 전 조기 감지", "발생 시 즉시 초동 대응".

- 반드시 지정한 JSON 키만 채운 순수 JSON으로만 답할 것.`;
 
  const user =

`[입력]

고객사: ${cust}

현장유형: ${site}

핵심·추천 AI 기능: ${aiList || '화재/재난 감지, 작업자 안전 감지'}

최근 사고/뉴스 근거: ${newsRisk || '(없음 — 현장유형 일반 위험 트렌드 사용)'}
 
[작성 항목 — 현장유형과 AI기능에 밀착해서 구체적으로]

- sub    : 표지 서브카피 한 줄. "${site} 현장의 위험을 사고 전에 감지하고, 발생 시 즉시 대응하는 …" 형태. 70~100자.

- asis   : '제안 배경' 리드 문단. 막연한 표현 대신 ${site} 현장의 '구체적' 위험(현장유형에 맞는 끼임·추락·화재·충돌·침입 등)과 선택 AI기능이 짚어내는 지점을 디테일하게, newsRisk를 자연스럽게 녹여서. 단 길게 늘이지 말고 2문장 내외로 간결하게.

- effects: '기대 효과' 정확히 4개 카드 [{ "t": 제목, "d": 설명 }].

           t = 제목(8~16자, 핵심 효과). d = 설명(35~60자, "어떤 AI기능이 → 어떻게 감지·대응 → 어떤 효과"를 구체적이되 간결하게).

           선택한 AI 기능 각각에 대응되게 작성.
 
[출력] 아래 JSON 하나만:

{"sub":"","asis":"","effects":[{"t":"","d":""},{"t":"","d":""},{"t":"","d":""},{"t":"","d":""}]}`;
 
  try {

    const raw = await callOpenAI(key, MODEL, sys, user, true);

    let out = {};

    try { out = JSON.parse(raw); } catch (e) { out = {}; }

    ['sub', 'asis'].forEach(k => { if (typeof out[k] !== 'string') out[k] = out[k] != null ? String(out[k]) : ''; });

    if (!Array.isArray(out.effects)) out.effects = [];

    out.effects = out.effects.slice(0, 4).map(e => ({ t: (e && e.t) ? String(e.t) : '', d: (e && e.d) ? String(e.d) : '' }));

    res.status(200).json(out);

  } catch (e) {

    res.status(500).json({ error: String(e && e.message || e) });

  }

}
 
function cleanText(s) {

  return String(s || '')

    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')

    .replace(/【[^】]*】/g, '')

    .replace(/\(https?:\/\/[^)]+\)/g, '')

    .replace(/https?:\/\/\S+/g, '')

    .replace(/\s+/g, ' ')

    .replace(/^["'\s]+|["'\s]+$/g, '')

    .trim();

}
 
async function callSearch(key, user) {

  const r = await fetch('https://api.openai.com/v1/chat/completions', {

    method: 'POST',

    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + key },

    body: JSON.stringify({

      model: 'gpt-4o-mini-search-preview',

      messages: [{ role: 'user', content: user }]

    })

  });

  if (!r.ok) { const t = await r.text().catch(() => ''); throw new Error('OpenAI ' + r.status + ' ' + t); }

  const d = await r.json();

  return (d.choices && d.choices[0] && d.choices[0].message && d.choices[0].message.content) || '';

}
 
async function callOpenAI(key, model, sys, user, jsonMode) {

  const r = await fetch('https://api.openai.com/v1/chat/completions', {

    method: 'POST',

    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + key },

    body: JSON.stringify({

      model, temperature: 0.5,

      ...(jsonMode ? { response_format: { type: 'json_object' } } : {}),

      messages: [{ role: 'system', content: sys }, { role: 'user', content: user }]

    })

  });

  if (!r.ok) { const t = await r.text().catch(() => ''); throw new Error('OpenAI ' + r.status + ' ' + t); }

  const d = await r.json();

  return (d.choices && d.choices[0] && d.choices[0].message && d.choices[0].message.content) || '';

}
 
