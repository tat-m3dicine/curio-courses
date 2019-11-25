import { MongoClient, ClientSession } from 'mongodb';
import { SchoolsRepository } from './SchoolsRepository';

import loggerFactory from '../utils/logging';
const logger = loggerFactory.getLogger('RepositoryFactory');

export const getFactory = () => {

  return function RepositoryFactory(name: string, client: MongoClient, session?: ClientSession) {
    switch (name) {
      case 'Schools':
        return new SchoolsRepository(client.db().collection('Schools', { session }, (err, r) => r));
      case 'Sections':
        return new SchoolsRepository(client.db().collection('Sections', { session }, (err, r) => r));
      default: throw new Error('unknown repository');
    }
  };
};

