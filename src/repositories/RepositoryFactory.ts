import { MongoClient, ClientSession } from 'mongodb';
import { SchoolsRepository } from './SchoolsRepository';

import loggerFactory from '../utils/logging';
import { CoursesRepository } from './CoursesRepository';
import { SectionsRepository } from './SectionsRepository';
import { UsersRepository } from './UsersRepository';
import { InviteCodesRepository } from './InviteCodesRepository';

const logger = loggerFactory.getLogger('RepositoryFactory');

export const getFactory = () => {

  return function RepositoryFactory(name: string, client: MongoClient, session?: ClientSession) {
    switch (name) {
      case 'Schools':
        return new SchoolsRepository(client.db().collection('Schools', { session }, (err, r) => r));
      case 'Sections':
        return new SectionsRepository(client.db().collection('Sections', { session }, (err, r) => r));
      case 'Courses':
        return new CoursesRepository(client.db().collection('Courses', { session }, (err, r) => r));
      case 'Users':
        return new UsersRepository(client.db().collection('Users', { session }, (err, r) => r));
      case 'InviteCodes':
        return new InviteCodesRepository(client.db().collection('InviteCodes', { session }, (err, r) => r));
      default:
        throw new Error('unknown repository');
    }
  };
};

