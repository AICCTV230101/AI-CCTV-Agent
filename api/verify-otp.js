// Vercel Serverless · OTP 검증
// Body: { email, code }
// Response: { ok: true } 또는 { error }
 
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
 
  try {
    const { email, code } = req.body || {};
    const normEmail = String(email || '').trim().toLowerCase();
    const normCode = String(code || '').trim();
 
    if (!normEmail.endsWith('@lguplus.co.kr')) {
      return res.status(403).json({ error: 'LG U+ 업무용 이메일만 이용 가능합니다.' });
    }
 
    if (!/^\d{6}$/.test(normCode)) {
      return res.status(400).json({ error: '인증번호 형식이 올바르지 않습니다.' });
    }
 
    const upstashUrl = process.env.UPSTASH_REDIS_REST_URL;
    const upstashToken = process.env.UPSTASH_REDIS_REST_TOKEN;
 
    // 1. Redis에서 저장된 코드 조회
    const getResp = await fetch(`${upstashUrl}/get/otp:${encodeURIComponent(normEmail)}`, {
      headers: { Authorization: `Bearer ${upstashToken}` }
    });
 
    if (!getResp.ok) {
      return res.status(500).json({ error: 'OTP 조회 실패' });
    }
 
    const getData = await getResp.json().catch(() => ({}));
    const storedCode = getData && getData.result;
 
    if (!storedCode) {
      return res.status(400).json({ error: '인증번호가 만료되었습니다. 다시 요청해 주세요.' });
    }
 
    if (String(storedCode) !== normCode) {
      return res.status(400).json({ error: '인증번호가 일치하지 않습니다.' });
    }
 
    // 2. 성공 시 코드 삭제 (재사용 방지)
    await fetch(`${upstashUrl}/del/otp:${encodeURIComponent(normEmail)}`, {
      headers: { Authorization: `Bearer ${upstashToken}` }
    });
 
    return res.status(200).json({ ok: true, email: normEmail });
  } catch (e) {
    return res.status(500).json({ error: 'verify-otp error', detail: String(e && e.message || e) });
  }
}
