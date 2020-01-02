import { MongoClient, ClientSession } from 'mongodb';
import { SchoolsRepository } from './SchoolsRepository';

import loggerFactory from '../utils/logging';
import { CoursesRepository } from './CoursesRepository';
import { SectionsRepository } from './SectionsRepository';
import { UsersRepository } from './UsersRepository';
import { InviteCodesRepository } from './InviteCodesRepository';
import { ProvidersRepository } from './ProvidersRepository';
import { Repo } from './RepoNames';

const logger = loggerFactory.getLogger('RepositoryFactory');

export const getFactory = () => {
  return function RepositoryFactory(name: string, client: MongoClient, session?: ClientSession) {
    switch (name) {
      case Repo.schools:
        return new SchoolsRepository(client.db().collection(Repo.schools, { session }), session);
      case Repo.sections:
        return new SectionsRepository(client.db().collection(Repo.sections, { session }), session);
      case Repo.courses:
        return new CoursesRepository(client.db().collection(Repo.courses, { session }), session);
      case Repo.users:
        return new UsersRepository(client.db().collection(Repo.users, { session }), session);
      case Repo.inviteCodes:
        return new InviteCodesRepository(client.db().collection(Repo.inviteCodes, { session }), session);
      case Repo.providers:
        return new ProvidersRepository(client.db().collection(Repo.providers, { session }), session);
      default:
        throw new Error('unknown repository');
    }
  };
};

