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
    const positions = await db.collection('positions').find({}).toArray();
    return res.status(200).json(positions);
  }
  if (req.method === 'POST') {
    const position = req.body;
    await db.collection('positions').insertOne(position);
    return res.status(200).json({ success: true });
  }
  if (req.method === 'PUT') {
    const { id, ...position } = req.body;
    await db.collection('positions').updateOne({ id }, { $set: position });
    return res.status(200).json({ success: true });
  }
  if (req.method === 'DELETE') {
    const { id } = req.query;
    await db.collection('positions').deleteOne({ id });
    return res.status(200).json({ success: true });
  }
  res.status(405).end();
} 