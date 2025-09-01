const express = require('express');
const { MongoClient } = require('mongodb');
const { generateScheduleByRules } = require('./schedule-generator');

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

// 获取所有排班
router.get('/', async (req, res) => {
  try {
    const client = await connectToDatabase();
    const db = client.db(DB_NAME);
    const collection = db.collection('schedules');
    const schedules = await collection.find({}).toArray();
    res.status(200).json(schedules);
  } catch (error) {
    console.error('获取排班错误:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

// 创建新排班
router.post('/', async (req, res) => {
  try {
    const client = await connectToDatabase();
    const db = client.db(DB_NAME);
    const collection = db.collection('schedules');
    
    const newSchedule = {
      ...req.body,
      createTime: new Date().toISOString()
    };

    const result = await collection.insertOne(newSchedule);
    res.status(201).json({ ...newSchedule, _id: result.insertedId });
  } catch (error) {
    console.error('创建排班错误:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

// 更新排班
router.put('/:id', async (req, res) => {
  try {
    const client = await connectToDatabase();
    const db = client.db(DB_NAME);
    const collection = db.collection('schedules');
    
    const { id } = req.params;
    const updateData = req.body;
    
    const updateResult = await collection.updateOne(
      { _id: id },
      { $set: { ...updateData, updateTime: new Date().toISOString() } }
    );
    res.status(200).json({ success: updateResult.modifiedCount > 0 });
  } catch (error) {
    console.error('更新排班错误:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

// 删除排班
router.delete('/:id', async (req, res) => {
  try {
    const client = await connectToDatabase();
    const db = client.db(DB_NAME);
    const collection = db.collection('schedules');
    
    const { id } = req.params;
    const deleteResult = await collection.deleteOne({ _id: id });
    res.status(200).json({ success: deleteResult.deletedCount > 0 });
  } catch (error) {
    console.error('删除排班错误:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

// 生成排班
router.post('/generate', async (req, res) => {
  try {
    const client = await connectToDatabase();
    const db = client.db(DB_NAME);
    const { startDate, endDate } = req.body;

    if (!startDate || !endDate) {
      return res.status(400).json({ error: '请提供开始和结束日期' });
    }

    const result = await generateScheduleByRules(db, startDate, endDate);
    res.status(200).json(result);
  } catch (error) {
    console.error('生成排班错误:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

module.exports = router; 