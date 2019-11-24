import { Collection } from 'mongodb';
import { ISchool } from '../models/entities/ISchool';
import { AduitableRepository } from './AduitableRepository';

export class SchoolsRepository extends AduitableRepository<ISchool> {

  constructor(collection: Collection) {
    super('Schools', collection);
  }
}
