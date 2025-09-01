import { connectToDatabase } from './_db';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const ADMIN_USERNAME = 'admin';
const ADMIN_PASSWORD = 'admin123'; // 可自定义

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  const { username, password } = req.body;
  const { db } = await connectToDatabase();

  // admin账号特殊处理
  if (username === ADMIN_USERNAME) {
    if (password !== ADMIN_PASSWORD) return res.status(400).json({ error: '密码错误' });
    const token = jwt.sign({ username, role: 'admin' }, process.env.JWT_SECRET, { expiresIn: '7d' });
    return res.status(200).json({ token, user: { username, role: 'admin' } });
  }

  const user = await db.collection('users').findOne({ username });
  if (!user) return res.status(400).json({ error: '用户不存在' });
  const valid = await bcrypt.compare(password, user.password);
  if (!valid) return res.status(400).json({ error: '密码错误' });
  const token = jwt.sign({ userId: user._id, username, role: user.role }, process.env.JWT_SECRET, { expiresIn: '7d' });
  res.status(200).json({ token, user: { username, role: user.role } });
} 