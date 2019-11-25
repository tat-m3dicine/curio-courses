import { Collection } from 'mongodb';
import { ICourse } from '../models/entities/ICourse';
import { AduitableRepository } from './AduitableRepository';

export class CourseRepository extends AduitableRepository<ICourse> {

  constructor(collection: Collection) {
    super('Course', collection);
  }
}
