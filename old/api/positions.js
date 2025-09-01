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

// 获取所有岗位
router.get('/', async (req, res) => {
  try {
    const client = await connectToDatabase();
    const db = client.db(DB_NAME);
    const collection = db.collection('positions');
    const positions = await collection.find({}).toArray();
    res.status(200).json(positions);
  } catch (error) {
    console.error('获取岗位错误:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

// 创建新岗位
router.post('/', async (req, res) => {
  try {
    const client = await connectToDatabase();
    const db = client.db(DB_NAME);
    const collection = db.collection('positions');
    
    const newPosition = {
      ...req.body,
      createTime: new Date().toISOString()
    };

    const result = await collection.insertOne(newPosition);
    res.status(201).json({ ...newPosition, _id: result.insertedId });
  } catch (error) {
    console.error('创建岗位错误:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

// 更新岗位
router.put('/:id', async (req, res) => {
  try {
    const client = await connectToDatabase();
    const db = client.db(DB_NAME);
    const collection = db.collection('positions');
    
    const { id } = req.params;
    const updateData = req.body;
    
    const updateResult = await collection.updateOne(
      { _id: id },
      { $set: { ...updateData, updateTime: new Date().toISOString() } }
    );
    res.status(200).json({ success: updateResult.modifiedCount > 0 });
  } catch (error) {
    console.error('更新岗位错误:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

// 删除岗位
router.delete('/:id', async (req, res) => {
  try {
    const client = await connectToDatabase();
    const db = client.db(DB_NAME);
    const collection = db.collection('positions');
    
    const { id } = req.params;
    const deleteResult = await collection.deleteOne({ _id: id });
    res.status(200).json({ success: deleteResult.deletedCount > 0 });
  } catch (error) {
    console.error('删除岗位错误:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

module.exports = router; 