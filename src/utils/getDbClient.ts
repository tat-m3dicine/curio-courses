import { MongoClient } from 'mongodb';
import config from '../config';
import loggerFactory from './logging';
import { Repo } from '../repositories/RepoNames';


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
        await result.db().createCollection(Repo.schools);
        await result.db().createCollection(Repo.sections);
        await result.db().createCollection(Repo.courses);
        await result.db().createCollection(Repo.users);
        await result.db().createCollection(Repo.inviteCodes);

        // Indices..
        // await result.db().collection(Repo.schools).createIndex({ user_id: 1 });

        logger.info('Database is ready...');
        return result;
      })
      .catch(err => {
        logger.error('Database connection was not estalished...', err);
      });
  }
  return _dbClient;
};