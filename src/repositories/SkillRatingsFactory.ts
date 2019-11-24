import { MongoClient, ClientSession, Collection } from 'mongodb';

import loggerFactory from '../utils/logging';
import { BaseRepository } from '@saal-oryx/unit-of-work';
import { ISkillRating } from '../models/entities/ISkillRating';
const logger = loggerFactory.getLogger('RepositoryFactory');

export const getSkillRatingsFactory = () => {
  return (name: string, client: MongoClient, session?: ClientSession) => {
    const collection = client.db().collection('SkillRatings', { session }, (err, r) => r);
    return new SkillRatingsRepository(collection);
  };
};

export class SkillRatingsRepository extends BaseRepository<ISkillRating> {
  constructor(collection: Collection) {
    super('SkillRatings', collection);
  }
}
