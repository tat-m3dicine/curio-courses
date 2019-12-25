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
        return new SchoolsRepository(client.db().collection('Schools', { session }), session);
      case 'Sections':
        return new SectionsRepository(client.db().collection('Sections', { session }), session);
      case 'Courses':
        return new CoursesRepository(client.db().collection('Courses', { session }), session);
      case 'Users':
        return new UsersRepository(client.db().collection('Users', { session }), session);
      case 'InviteCodes':
        return new InviteCodesRepository(client.db().collection('InviteCodes', { session }), session);
      case 'Providers':
        return new ProvidersRepository(client.db().collection('Providers', { session }), session);
      default:
        throw new Error('unknown repository');
    }
  };
};

