import { Collection } from 'mongodb';
import { AduitableRepository } from './AduitableRepository';
import { IStudent, IAuditable } from '../models/entities/Common';
import { IEntity } from '@saal-oryx/unit-of-work';

export class StudentsRepository extends AduitableRepository<IStudent & IEntity & Partial<IAuditable>> {

  constructor(collection: Collection) {
    super('Students', collection);
  }
}
