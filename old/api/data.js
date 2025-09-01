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

// 获取所有数据
router.get('/', async (req, res) => {
  try {
    const client = await connectToDatabase();
    const db = client.db(DB_NAME);
    
    const [personnel, positions, schedules, rules] = await Promise.all([
      db.collection('personnel').find({}).toArray(),
      db.collection('positions').find({}).toArray(),
      db.collection('schedules').find({}).toArray(),
      db.collection('schedule_rules').find({}).toArray()
    ]);

    res.status(200).json({
      personnel,
      positions,
      schedules,
      rules
    });
  } catch (error) {
    console.error('获取数据错误:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

module.exports = router; 