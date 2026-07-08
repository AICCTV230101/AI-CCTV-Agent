// Vercel Serverless · OTP 발송
// Body: { email }
// Response: { ok: true } 또는 { error }
 
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
 
  try {
    const { email } = req.body || {};
    const norm = String(email || '').trim().toLowerCase();
 
    // 1. 도메인 체크
    if (!norm.endsWith('@lguplus.co.kr')) {
      return res.status(403).json({ error: 'LG U+ 업무용 이메일만 이용 가능합니다.' });
    }
 
    // 2. 6자리 인증번호 생성
    const code = String(Math.floor(100000 + Math.random() * 900000));
 
    // 3. Upstash Redis에 저장 (10분 만료)
    const upstashUrl = process.env.UPSTASH_REDIS_REST_URL;
    const upstashToken = process.env.UPSTASH_REDIS_REST_TOKEN;
 
    const setResp = await fetch(`${upstashUrl}/set/otp:${encodeURIComponent(norm)}/${code}?EX=600`, {
      headers: { Authorization: `Bearer ${upstashToken}` }
    });
 
    if (!setResp.ok) {
      const t = await setResp.text().catch(() => '');
      return res.status(500).json({ error: 'OTP 저장 실패', detail: t });
    }
 
    // 4. Resend로 메일 발송
    const from = process.env.OTP_FROM_EMAIL || 'AI CCTV Squad <onboarding@resend.dev>';
 
    const mailResp = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`
      },
      body: JSON.stringify({
        from,
        to: [norm],
        subject: '[AI CCTV Agent] 접속 인증번호 안내',
        html: `
          <div style="font-family:'Malgun Gothic',sans-serif;max-width:520px;margin:0 auto;padding:32px 28px;background:#fff;border:1px solid #eee;border-radius:16px">
            <div style="font-size:12px;font-weight:900;color:#B80064;letter-spacing:1px;margin-bottom:8px">LG U+ SMB사업트라이브 AI CCTV스쿼드</div>
            <div style="font-size:20px;font-weight:900;color:#1a1a1f;margin-bottom:14px">AI CCTV Sales Materials Agent 접속 인증번호</div>
            <div style="font-size:14px;color:#5b5b66;line-height:1.7;margin-bottom:22px">
              아래 인증번호를 <b>10분 이내</b>에 입력해 주세요.<br>
              본인이 요청하지 않은 경우 이 메일을 무시하셔도 됩니다.
            </div>
            <div style="font-size:36px;font-weight:900;letter-spacing:8px;text-align:center;padding:20px;background:#FFE4F1;color:#B80064;border-radius:12px">
              ${code}
            </div>
            <div style="font-size:12px;color:#a3a3b0;margin-top:22px;line-height:1.6">
              문의: aicctvsquad@lguplus.co.kr / jamielee@lguplus.co.kr<br>
              본 메일은 발신전용이며, 답장은 확인되지 않습니다.
            </div>
          </div>
        `
      })
    });
 
    if (!mailResp.ok) {
      const t = await mailResp.text().catch(() => '');
      return res.status(500).json({ error: '메일 발송 실패', detail: t });
    }
 
    return res.status(200).json({ ok: true });
  } catch (e) {
    return res.status(500).json({ error: 'send-otp error', detail: String(e && e.message || e) });
  }
}
