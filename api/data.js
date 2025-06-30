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
  // 设置CORS头
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    const { collection: collectionName, userId } = req.query;

    if (!collectionName) {
      res.status(400).json({ error: '缺少集合名称' });
      return;
    }

    const client = await connectToDatabase();
    const db = client.db(DB_NAME);
    const collection = db.collection(collectionName);

    switch (req.method) {
      case 'GET':
        // 获取数据
        if (userId) {
          // 获取特定用户的数据
          const data = await collection.find({ userId }).toArray();
          res.status(200).json(data);
        } else {
          // 获取所有数据
          const data = await collection.find({}).toArray();
          res.status(200).json(data);
        }
        break;

      case 'POST':
        // 创建数据
        const newData = {
          ...req.body,
          createTime: new Date().toISOString(),
          updateTime: new Date().toISOString()
        };
        
        const result = await collection.insertOne(newData);
        res.status(201).json({ ...newData, _id: result.insertedId });
        break;

      case 'PUT':
        // 更新数据
        const { id, ...updateData } = req.body;
        const updateResult = await collection.updateOne(
          { _id: id },
          { $set: { ...updateData, updateTime: new Date().toISOString() } }
        );
        res.status(200).json({ success: updateResult.modifiedCount > 0 });
        break;

      case 'DELETE':
        // 删除数据
        const deleteResult = await collection.deleteOne({ _id: req.body.id });
        res.status(200).json({ success: deleteResult.deletedCount > 0 });
        break;

      default:
        res.status(405).json({ error: '方法不允许' });
    }
  } catch (error) {
    console.error('数据API错误:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
} 