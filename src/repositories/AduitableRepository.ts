import { UpdateManyOptions, FindOneAndUpdateOption } from 'mongodb';
import { BaseRepository, IEntity } from '@saal-oryx/unit-of-work';
import { IAuditable } from '../models/entities/Common';

import loggerFactory from '../utils/logging';
const logger = loggerFactory.getLogger('AduitableRepository');

export abstract class AduitableRepository<T extends IAuditable> extends BaseRepository<T> {

  async findOne(filter: any, projection?: any) {
    if (Object.keys(filter).every(k => typeof filter[k] === 'undefined')) {
      logger.trace('findOne issue', Object.keys(filter));
      return undefined;
    }
    return super.findOne(filter, projection);
  }

  add(entity: T) {
    entity.createdAt = new Date();
    return super.add(entity);
  }

  update(filter: any, update: any, options?: UpdateManyOptions): Promise<any> {
    this.addAuditableFields(update, options && options.upsert);
    return super.update(filter, update, options);
  }

  async findOneAndUpdate(filter: any, update: any, options?: FindOneAndUpdateOption | undefined): Promise<T | undefined> {
    if (Object.keys(filter).every(k => typeof filter[k] === 'undefined')) {
      logger.trace('findOneAndUpdate issue', Object.keys(filter));
      return undefined;
    }
    this.addAuditableFields(update, options && options.upsert);
    return super.findOneAndUpdate(filter, update, options);
  }

  patch(filter: any, item: Partial<T>): Promise<T | undefined> {
    if (item) item.updatedAt = new Date();
    return super.patch(filter, item, false);
  }

  addAuditableFields(updateObject: any, upsert: boolean | undefined = false) {
    if (updateObject.$set) {
      updateObject.$set.updatedAt = new Date();
    }
    if (upsert) {
      if (!updateObject.$setOnInsert) updateObject.$setOnInsert = {};
      updateObject.$setOnInsert.createdAt = new Date();
    }
  }
}
