import { Collection, ClientSession } from 'mongodb';
import { ISection } from '../models/entities/ISection';
import { AduitableRepository } from './AduitableRepository';
import { Repo } from '../models/RepoNames';

export class SectionsRepository extends AduitableRepository<ISection> {
  constructor(collection: Collection, session?: ClientSession) {
    super(Repo.sections, collection, session);
  }

  async addStudentsToSections(updates: { filter: object, usersIds: string[] }[]) {
    return this._collection.bulkWrite(updates.map(({ filter, usersIds }) => ({
      updateOne: {
        filter, update: { $addToSet: { students: { $each: usersIds } } }
      }
    })));
  }

  async addStudents(filter: object, studentIds: string[]) {
    return this.update(filter, {
      $addToSet: { students: { $each: studentIds } }
    });
  }

  async removeStudents(filter: object, studentIds: string[]) {
    return this.update(filter, {
      $pull: { students: { $in: studentIds } }
    });
  }
}
