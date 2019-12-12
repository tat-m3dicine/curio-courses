import { Collection } from 'mongodb';
import { ISection } from '../models/entities/ISection';
import { AduitableRepository } from './AduitableRepository';

export class SectionsRepository extends AduitableRepository<ISection> {
  constructor(collection: Collection) {
    super('Sections', collection);
  }

  registerStudents(filter: object, studentIds: string[]) {
    return this.update(filter, {
      $addToSet: { students: { $each: studentIds } }
    });
  }

  removeStudents(filter: object, studentIds: string[]) {
    return this.update(filter, {
      $pull: { students: { $in: studentIds } }
    });
  }
}
