const express = require('express');
const { MongoClient } = require('mongodb');

const router = express.Router();
const MONGODB_URI = process.env.MONGODB_URI;
const DB_NAME = 'paiban_system';

let cachedClient = null;

async function connectToDatabase() {
  if (cachedClient) {
    return cachedClient;
  }

  const client = await MongoClient.connect(MONGODB_URI);
  cachedClient = client;
  return client;
}

router.post('/', async (req, res) => {
  // 设置CORS头
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: '方法不允许' });
    return;
  }

  try {
    const { username, password } = req.body;

    if (!username || !password) {
      res.status(400).json({ error: '用户名和密码不能为空' });
      return;
    }

    const client = await connectToDatabase();
    const db = client.db(DB_NAME);
    const collection = db.collection('users');

    // 查找用户
    const user = await collection.findOne({ username, password });

    if (user && user.status === 'active') {
      // 更新最后登录时间
      await collection.updateOne(
        { _id: user._id },
        { $set: { lastLoginTime: new Date().toISOString() } }
      );

      // 返回用户信息（不包含密码）
      const { password: _, ...userInfo } = user;
      res.status(200).json({ 
        success: true, 
        user: userInfo,
        message: '登录成功'
      });
    } else {
      res.status(401).json({ 
        success: false, 
        message: '用户名或密码错误' 
      });
    }
  } catch (error) {
    console.error('认证错误:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

module.exports = router; 