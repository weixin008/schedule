import { DataSource } from 'typeorm';
import { MongoConnectionOptions } from 'typeorm/driver/mongodb/MongoConnectionOptions';

export default new DataSource({
  type: 'mongodb',
  host: process.env.MONGODB_HOST || 'localhost',
  port: parseInt(process.env.MONGODB_PORT || '27017'),
  database: process.env.MONGODB_DATABASE || 'schedule_history',
  entities: [
    'src/schedule/entities/schedule.entity.ts',
    'src/audit/entities/*.ts'
  ],
  synchronize: true,
  useUnifiedTopology: true,
} as MongoConnectionOptions);