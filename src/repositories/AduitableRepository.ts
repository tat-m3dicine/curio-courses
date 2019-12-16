import { UpdateManyOptions, FindOneAndUpdateOption } from 'mongodb';
import { BaseRepository, IEntity } from '@saal-oryx/unit-of-work';
import { IAuditable } from '../models/entities/Common';

export abstract class AduitableRepository<T extends IAuditable> extends BaseRepository<T> {


  add(entity: T) {
    entity.createdAt = new Date();
    return super.add(entity);
  }

  update(filter: any, update: any, options?: UpdateManyOptions): Promise<any> {
    this.addAuditableFields(update, options && options.upsert);
    return super.update(filter, update, options);
  }

  findOneAndUpdate(filter: any, update: any, options?: FindOneAndUpdateOption | undefined): Promise<T | undefined> {
    this.addAuditableFields(update, options && options.upsert);
    return super.findOneAndUpdate(filter, update, options);
  }

  patch(filter: any, item: Partial<T>): Promise<T | undefined> {
    item.updatedAt = new Date();
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
