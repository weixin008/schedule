import { MongoClient } from 'mongodb';

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

export default async function handler(req, res) {
  // 设置CORS头，允许跨域请求
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    const client = await connectToDatabase();
    const db = client.db(DB_NAME);
    const collection = db.collection('users');

    switch (req.method) {
      case 'GET':
        // 获取所有用户
        const users = await collection.find({}).toArray();
        res.status(200).json(users);
        break;

      case 'POST':
        // 创建新用户
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
        break;

      case 'PUT':
        // 更新用户
        const { id, ...updateData } = req.body;
        const updateResult = await collection.updateOne(
          { _id: id },
          { $set: { ...updateData, updateTime: new Date().toISOString() } }
        );
        res.status(200).json({ success: updateResult.modifiedCount > 0 });
        break;

      case 'DELETE':
        // 删除用户
        const deleteResult = await collection.deleteOne({ _id: req.body.id });
        res.status(200).json({ success: deleteResult.deletedCount > 0 });
        break;

      default:
        res.status(405).json({ error: '方法不允许' });
    }
  } catch (error) {
    console.error('API错误:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
} 