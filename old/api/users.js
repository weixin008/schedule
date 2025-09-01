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

// 获取所有用户
router.get('/', async (req, res) => {
  try {
    const client = await connectToDatabase();
    const db = client.db(DB_NAME);
    const collection = db.collection('users');
    const users = await collection.find({}).toArray();
    res.status(200).json(users);
  } catch (error) {
    console.error('获取用户错误:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

// 创建新用户
router.post('/', async (req, res) => {
  try {
    const client = await connectToDatabase();
    const db = client.db(DB_NAME);
    const collection = db.collection('users');
    
    const newUser = {
      ...req.body,
      createTime: new Date().toISOString(),
      lastLoginTime: null,
      status: 'active'
    };
    
    // 检查用户名是否已存在
    const existingUser = await collection.findOne({ username: newUser.username });
    if (existingUser) {
      res.status(400).json({ error: '用户名已存在' });
      return;
    }

    const result = await collection.insertOne(newUser);
    res.status(201).json({ ...newUser, _id: result.insertedId });
  } catch (error) {
    console.error('创建用户错误:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

// 更新用户
router.put('/:id', async (req, res) => {
  try {
    const client = await connectToDatabase();
    const db = client.db(DB_NAME);
    const collection = db.collection('users');
    
    const { id } = req.params;
    const updateData = req.body;
    
    const updateResult = await collection.updateOne(
      { _id: id },
      { $set: { ...updateData, updateTime: new Date().toISOString() } }
    );
    res.status(200).json({ success: updateResult.modifiedCount > 0 });
  } catch (error) {
    console.error('更新用户错误:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

// 删除用户
router.delete('/:id', async (req, res) => {
  try {
    const client = await connectToDatabase();
    const db = client.db(DB_NAME);
    const collection = db.collection('users');
    
    const { id } = req.params;
    const deleteResult = await collection.deleteOne({ _id: id });
    res.status(200).json({ success: deleteResult.deletedCount > 0 });
  } catch (error) {
    console.error('删除用户错误:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

module.exports = router; 