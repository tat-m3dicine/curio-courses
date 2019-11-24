import { MongoClient, ClientSession } from 'mongodb';
import { SchoolsRepository } from './SchoolsRepository';

import loggerFactory from '../utils/logging';
const logger = loggerFactory.getLogger('RepositoryFactory');

export const getFactory = () => {

  return function RepositoryFactory(name: string, client: MongoClient, session?: ClientSession) {
    // tslint:disable-next-line: no-small-switch
    switch (name) {
      case 'Schools':
        return new SchoolsRepository(client.db().collection('Schools', { session }, (err, r) => r));
      default: throw new Error('unknown repository');
    }
  };
};

