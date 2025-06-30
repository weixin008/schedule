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
    const personnel = await db.collection('personnel').find({}).toArray();
    return res.status(200).json(personnel);
  }
  if (req.method === 'POST') {
    const person = req.body;
    await db.collection('personnel').insertOne(person);
    return res.status(200).json({ success: true });
  }
  if (req.method === 'PUT') {
    const { id, ...person } = req.body;
    await db.collection('personnel').updateOne({ id }, { $set: person });
    return res.status(200).json({ success: true });
  }
  if (req.method === 'DELETE') {
    const { id } = req.query;
    await db.collection('personnel').deleteOne({ id });
    return res.status(200).json({ success: true });
  }
  res.status(405).end();
} 