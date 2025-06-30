import { connectToDatabase } from './_db';
import jwt from 'jsonwebtoken';
import { ObjectId } from 'mongodb';

export default async function handler(req, res) {
  const { authorization } = req.headers;
  if (!authorization) return res.status(401).json({ error: '未授权' });
  try {
    const token = authorization.replace('Bearer ', '');
    jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return res.status(401).json({ error: 'Token无效' });
  }

  const { db } = await connectToDatabase();

  if (req.method === 'GET') {
    const rules = await db.collection('schedule_rules').find({}).toArray();
    return res.status(200).json(rules);
  }
  if (req.method === 'POST') {
    const rule = req.body;
    await db.collection('schedule_rules').insertOne(rule);
    return res.status(200).json({ success: true });
  }
  if (req.method === 'PUT') {
    const { id, ...rule } = req.body;
    await db.collection('schedule_rules').updateOne({ id }, { $set: rule });
    return res.status(200).json({ success: true });
  }
  if (req.method === 'DELETE') {
    const { id } = req.query;
    await db.collection('schedule_rules').deleteOne({ id });
    return res.status(200).json({ success: true });
  }
  res.status(405).end();
} 