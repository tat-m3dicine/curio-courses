import { MongoClient, ClientSession } from 'mongodb';
import { SchoolsRepository } from './SchoolsRepository';

import loggerFactory from '../utils/logging';
import { CoursesRepository } from './CoursesRepository';
import { SectionsRepository } from './SectionsRepository';
import { StudentsRepository } from './StudentsRepository';

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
      case 'Students':
        return new StudentsRepository(client.db().collection('Students', { session }, (err, r) => r));
      default: throw new Error('unknown repository');
    }
  };
};

