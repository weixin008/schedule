import { connectToDatabase } from './_db';
import bcrypt from 'bcryptjs';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  const { username, password, inviteCode } = req.body;
  if (inviteCode !== 'zhineng2025') return res.status(400).json({ error: '邀请码无效' });
  const { db } = await connectToDatabase();
  const exists = await db.collection('users').findOne({ username });
  if (exists) return res.status(400).json({ error: '用户名已存在' });
  const hash = await bcrypt.hash(password, 10);
  await db.collection('users').insertOne({ username, password: hash, role: 'user', createdAt: new Date() });
  res.status(200).json({ success: true });
} 