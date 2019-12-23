import { MongoClient, ClientSession } from 'mongodb';
import { SchoolsRepository } from './SchoolsRepository';

import loggerFactory from '../utils/logging';
import { CoursesRepository } from './CoursesRepository';
import { SectionsRepository } from './SectionsRepository';
import { UsersRepository } from './UsersRepository';
import { InviteCodesRepository } from './InviteCodesRepository';
import { ProvidersRepository } from './ProvidersRepository';

const logger = loggerFactory.getLogger('RepositoryFactory');

export const getFactory = () => {

  return function RepositoryFactory(name: string, client: MongoClient, session?: ClientSession) {
    switch (name) {
      case 'Schools':
        return new SchoolsRepository(client.db().collection('Schools', { session }, (err, r) => r), session);
      case 'Sections':
        return new SectionsRepository(client.db().collection('Sections', { session }, (err, r) => r), session);
      case 'Courses':
        return new CoursesRepository(client.db().collection('Courses', { session }, (err, r) => r), session);
      case 'Users':
        return new UsersRepository(client.db().collection('Users', { session }, (err, r) => r), session);
      case 'InviteCodes':
        return new InviteCodesRepository(client.db().collection('InviteCodes', { session }, (err, r) => r), session);
        case 'Providers':
        return new ProvidersRepository(client.db().collection('Providers', { session }, (err, r) => r), session);
      default:
        throw new Error('unknown repository');
    }
  };
};

