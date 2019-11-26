import { Collection } from 'mongodb';
import { AduitableRepository } from './AduitableRepository';
import { IAuditable } from '../models/entities/Common';
import { IEntity } from '@saal-oryx/unit-of-work';
import { ICourse } from '../models/entities/ICourse';

export class CoursesRepository extends AduitableRepository<ICourse & IEntity & Partial<IAuditable>> {

  constructor(collection: Collection) {
    super('Courses', collection);
  }

  async finishStudentsCourses(filter: object, studentIds: string[]) {
    return this.update(filter, {
      $set: {
        'students.$[student].finishDate': new Date()
      }
    }, {
      arrayFilters: [{ student: { $in: studentIds } }]
    });
  }
}
