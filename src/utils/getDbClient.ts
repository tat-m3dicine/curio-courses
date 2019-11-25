import { MongoClient } from 'mongodb';
import config from '../config';
import loggerFactory from './logging';


const logger = loggerFactory.getLogger('getDbClient');
let _dbClient: Promise<MongoClient> | undefined;

export const getDbClient = async () => {
  if (!_dbClient) {
    _dbClient = MongoClient.connect(config.mongoDbUrl, {
      useNewUrlParser: true,
      autoReconnect: true,
      useUnifiedTopology: true,
      connectTimeoutMS: 30000,
      socketTimeoutMS: 30000,
      reconnectTries: Number.MAX_VALUE,
      reconnectInterval: 1000,
      bufferMaxEntries: 0
    });
    _dbClient
      .then(async result => {
        // Collections..
        await result.db().createCollection('Schools');
        await result.db().createCollection('Sections');

        // Indices..
        // await result.db().collection('Schools').createIndex({ user_id: 1 });

        logger.info('Database is ready...');
        return result;
      })
      .catch(err => {
        logger.error('Database connection was not estalished...', err);
      });
  }
  return _dbClient;
};