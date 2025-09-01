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

// 获取所有人员
router.get('/', async (req, res) => {
  try {
    const client = await connectToDatabase();
    const db = client.db(DB_NAME);
    const collection = db.collection('personnel');
    const personnel = await collection.find({}).toArray();
    res.status(200).json(personnel);
  } catch (error) {
    console.error('获取人员错误:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

// 创建新人员
router.post('/', async (req, res) => {
  try {
    const client = await connectToDatabase();
    const db = client.db(DB_NAME);
    const collection = db.collection('personnel');
    
    const newPersonnel = {
      ...req.body,
      createTime: new Date().toISOString()
    };

    const result = await collection.insertOne(newPersonnel);
    res.status(201).json({ ...newPersonnel, _id: result.insertedId });
  } catch (error) {
    console.error('创建人员错误:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

// 更新人员
router.put('/:id', async (req, res) => {
  try {
    const client = await connectToDatabase();
    const db = client.db(DB_NAME);
    const collection = db.collection('personnel');
    
    const { id } = req.params;
    const updateData = req.body;
    
    const updateResult = await collection.updateOne(
      { _id: id },
      { $set: { ...updateData, updateTime: new Date().toISOString() } }
    );
    res.status(200).json({ success: updateResult.modifiedCount > 0 });
  } catch (error) {
    console.error('更新人员错误:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

// 删除人员
router.delete('/:id', async (req, res) => {
  try {
    const client = await connectToDatabase();
    const db = client.db(DB_NAME);
    const collection = db.collection('personnel');
    
    const { id } = req.params;
    const deleteResult = await collection.deleteOne({ _id: id });
    res.status(200).json({ success: deleteResult.deletedCount > 0 });
  } catch (error) {
    console.error('删除人员错误:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

module.exports = router; 