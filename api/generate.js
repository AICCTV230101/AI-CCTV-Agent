// /api/generate.js — Vercel Serverless Function (Node 18+)
// HTML의 STEP6 "🪄 GPT로 문구 생성"과 "🔍 찾기(뉴스)"가 호출하는 엔드포인트.
// 필요한 환경변수: OPENAI_API_KEY  (Vercel > Project > Settings > Environment Variables)
//
// 입력(JSON):
//   - 문구 모드: { cust, site, coreAI:[], newsRisk }
//   - 뉴스 모드:     { mode:"news", cust, site }
// 출력(JSON):
//   - 문구 모드: { sub, asis, effects:[{t,d}×4] }
//   - 뉴스 모드:     { news }

export default async function handler(req, res) {
  if (req.method !== 'POST') { res.status(405).json({ error: 'POST only' }); return; }

  const key = process.env.OPENAI_API_KEY;
  if (!key) { res.status(500).json({ error: 'OPENAI_API_KEY 미설정 (Vercel 환경변수를 확인하세요)' }); return; }

  let body = {};
  try { body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {}); } catch (e) { body = {}; }

  const {
    mode,
    cust = '고객사',
    site = '현장',
    coreAI = [],
    newsRisk = ''
  } = body;

  const MODEL = 'gpt-4o-mini'; // 비용/속도 균형. 품질을 더 올리려면 'gpt-4o'로 변경.

  // ─────────────────────────────────────────────
  // 모드 1) 최근 사고·뉴스 기반 "도입 근거 한 줄"
  // ─────────────────────────────────────────────
  if (mode === 'news') {
    const sys = '당신은 B2B 보안·안전 솔루션 제안서를 쓰는 한국어 카피라이터입니다. 과장 없이 사실 기반으로, 한 문장으로만 답합니다.';
    const user =
`고객사: ${cust}
현장유형: ${site}

위 현장유형에서 최근 사회적으로 이슈가 된 사고·안전 트렌드를 근거로,
"${site} 현장에 AI CCTV 도입이 필요한 이유"를 제안서 도입부에 넣을 한 문장으로 작성하세요.

규칙:
- 통계 수치, 특정 연도, 특정 사건명을 임의로 지어내지 말 것. 일반적으로 알려진 위험 경향만 사용.
- 명사형/단정형 제안서 톤. 감탄·과장 금지.
- 한 문장, 80자 내외. 따옴표 없이 문장만 출력.`;
    try {
      const out = await callOpenAI(key, MODEL, sys, user, false);
      res.status(200).json({ news: (out || '').trim() });
    } catch (e) {
      res.status(500).json({ error: String(e && e.message || e) });
    }
    return;
  }

  // ─────────────────────────────────────────────
  // 모드 2) 제안서 "생성형 문구 6종"
  // ─────────────────────────────────────────────
  const aiList = Array.isArray(coreAI) ? coreAI.filter(Boolean).join(', ') : String(coreAI || '');

  const sys =
`당신은 LG U+ 기업영업의 시니어 제안 컨설턴트입니다.
AI CCTV(영상분석) 솔루션 제안서에 들어갈 문구를 한국어로 작성합니다.

원칙:
- 철저히 사실 기반. 수치·법규·연도·사건명을 임의로 지어내지 말 것 (주어진 newsRisk만 활용).
- 군더더기 없는 제안서 톤(명사형/단정형). 과장·감탄·이모지 금지.
- 핵심 키워드: "사후 대응 → 사전 예방", "위험 사고 전 조기 감지", "발생 시 즉시 초동 대응".
- 반드시 지정한 JSON 키만 채운 '순수 JSON' 으로만 답할 것. 다른 설명 문장 금지.`;

  const user =
`[입력]
고객사: ${cust}
현장유형: ${site}
핵심·추천 AI 기능: ${aiList || '화재/재난 감지, 작업자 안전 감지'}
최근 사고/뉴스 근거(있으면 그대로 활용): ${newsRisk || '(없음 — 현장유형의 일반 위험 트렌드를 사용)'}

[작성할 항목 — 각 키의 '쓰이는 위치'와 의미를 정확히 지킬 것]
- sub      : 표지 한 줄 서브카피. "${site} 현장의 위험을 사고 전에 감지하고, 발생 시 즉시 대응하는 …" 형태. 60~90자.
- asis     : '제안 배경' 설명문구. 제목 아래 리드 박스 첫 문장. 현재 ${site} 현장의 위험·사고 리스크 상황을 newsRisk를 녹여 2~3문장.
             '사후 대응 한계'나 '~하기 어렵습니다' 류 문장은 넣지 말 것(요청으로 제거된 문구임).
- effects  : '기대 효과' 정확히 4개의 카드 배열. 각 카드는 { "t": 제목, "d": 설명 }.
             t = 제목(8~16자, 핵심 효과를 압축), d = 하단 설명(30~55자, 어떻게 그 효과를 내는지).
             선택한 AI 기능·목적에 맞춰 구체적으로.
             예: { "t": "중대재해 예방", "d": "안전모·쓰러짐·협착 등 작업자 위험을 실시간 감지·알림해 산업안전 책임에 선제 대응합니다." }

[출력 형식] 아래 JSON 한 개만 출력:
{"sub":"","asis":"","effects":[{"t":"","d":""},{"t":"","d":""},{"t":"","d":""},{"t":"","d":""}]}`;

  try {
    const raw = await callOpenAI(key, MODEL, sys, user, true);
    let out = {};
    try { out = JSON.parse(raw); } catch (e) { out = {}; }
    // 안전장치: 키 누락 시 빈 문자열로 보정
    ['sub', 'asis'].forEach(k => { if (typeof out[k] !== 'string') out[k] = out[k] != null ? String(out[k]) : ''; });
    if (!Array.isArray(out.effects)) out.effects = [];
    out.effects = out.effects.slice(0, 4).map(e => ({ t: (e && e.t) ? String(e.t) : '', d: (e && e.d) ? String(e.d) : '' }));
    res.status(200).json(out);
  } catch (e) {
    res.status(500).json({ error: String(e && e.message || e) });
  }
}

// OpenAI Chat Completions 호출 헬퍼
async function callOpenAI(key, model, sys, user, jsonMode) {
  const r = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + key },
    body: JSON.stringify({
      model,
      temperature: 0.5,
      ...(jsonMode ? { response_format: { type: 'json_object' } } : {}),
      messages: [
        { role: 'system', content: sys },
        { role: 'user', content: user }
      ]
    })
  });
  if (!r.ok) {
    const t = await r.text().catch(() => '');
    throw new Error('OpenAI ' + r.status + ' ' + t);
  }
  const d = await r.json();
  return (d.choices && d.choices[0] && d.choices[0].message && d.choices[0].message.content) || '';
}
