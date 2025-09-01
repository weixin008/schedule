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

// 用户注册
router.post('/', async (req, res) => {
  try {
    const { username, password, inviteCode } = req.body;

    // 验证邀请码
    if (inviteCode !== process.env.INVITE_CODE) {
      res.status(400).json({ error: '邀请码无效' });
      return;
    }

    // 验证用户名和密码
    if (!username || !password) {
      res.status(400).json({ error: '用户名和密码不能为空' });
      return;
    }

    const client = await connectToDatabase();
    const db = client.db(DB_NAME);
    const collection = db.collection('users');

    // 检查用户名是否已存在
    const existingUser = await collection.findOne({ username });
    if (existingUser) {
      res.status(400).json({ error: '用户名已存在' });
      return;
    }

    // 创建新用户
    const newUser = {
      username,
      password,
      createTime: new Date().toISOString(),
      lastLoginTime: null,
      status: 'active'
    };

    const result = await collection.insertOne(newUser);
    
    // 返回用户信息（不包含密码）
    const { password: _, ...userInfo } = newUser;
    res.status(201).json({ 
      success: true, 
      user: { ...userInfo, _id: result.insertedId },
      message: '注册成功'
    });
  } catch (error) {
    console.error('注册错误:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

module.exports = router; 