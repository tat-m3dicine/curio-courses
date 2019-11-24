import { MongoClient, ClientSession, Collection } from 'mongodb';

import loggerFactory from '../utils/logging';
import { BaseRepository } from '@saal-oryx/unit-of-work';
import { ISection } from '../models/entities/ISection';
const logger = loggerFactory.getLogger('RepositoryFactory');

export const getSectionsFactory = () => {
  return (name: string, client: MongoClient, session?: ClientSession) => {
    const collection = client.db().collection('Sections', { session }, (err, r) => r);
    return new SectionssRepository(collection);
  };
};

export class SectionssRepository extends BaseRepository<ISection> {
  constructor(collection: Collection) {
    super('Sections', collection);
  }
}
