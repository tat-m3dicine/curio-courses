import { Collection } from 'mongodb';
import { ISection } from '../models/entities/ISection';
import { AduitableRepository } from './AduitableRepository';

export class SectionsRepository extends AduitableRepository<ISection> {

  constructor(collection: Collection) {
    super('Sections', collection);
  }
}
