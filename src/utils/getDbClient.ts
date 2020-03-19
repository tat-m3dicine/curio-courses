import { MongoClient } from 'mongodb';
import config from '../config';
import loggerFactory from './logging';
import { Repo } from '../models/RepoNames';


const logger = loggerFactory.getLogger('getDbClient');
let _dbClient: Promise<MongoClient> | undefined;

export const getDbClient = async (seed = false) => {
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
    }).then(async result => {
      // Collections..
      if (seed) {
        await result.db().createCollection(Repo.schools);
        await result.db().createCollection(Repo.sections);
        await result.db().createCollection(Repo.courses);
        await result.db().createCollection(Repo.users);
        await result.db().createCollection(Repo.inviteCodes);
        await result.db().createCollection(Repo.providers);

        // Indices..
        await result.db().collection(Repo.schools).createIndexes([
          { key: { 'provider.links': 1 } },
          { key: { 'academicTerms._id': 1 } },
          { key: { 'academicTerms.startDate': 1 } },
          { key: { 'users._id': 1 } }
        ]);
        await result.db().collection(Repo.sections).createIndexes([
          { key: { schoolId: 1 } },
          { key: { 'students._id': 1 } }
        ]);
        await result.db().collection(Repo.courses).createIndexes([
          { key: { sectionId: 1 } },
          { key: { 'academicTerm._id': 1 } },
          { key: { 'academicTerm.startDate': -1 } },
          { key: { 'students._id': 1 } },
          { key: { 'teachers._id': 1 } }
        ]);
        await result.db().collection(Repo.users).createIndex({ schoolId: 1 });
        await result.db().collection(Repo.inviteCodes).createIndex({ schoolId: 1 });
        await result.db().collection(Repo.providers).createIndex({ 'academicTerms.startDate': -1 });
      }
      logger.info('Database is ready...');
      return result;
    })
      .catch(err => {
        logger.error('Database connection was not estalished...', JSON.stringify(err));
        throw err;
      });
  }
  return _dbClient;
};