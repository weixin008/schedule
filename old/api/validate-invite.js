export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  const { inviteCode } = req.body;
  // 只允许邀请码为"zhineng2025"
  res.status(200).json({ valid: inviteCode === 'zhineng2025' });
} 