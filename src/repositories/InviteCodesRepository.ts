import { Collection } from 'mongodb';
import { AduitableRepository } from './AduitableRepository';
import { IInviteCode } from '../models/entities/IInviteCode';

export class InviteCodesRepository extends AduitableRepository<IInviteCode> {
  constructor(collection: Collection) {
    super('InviteCode', collection);
  }

  async incrementConsumedCount(codeId: string) {
    return this.update({ _id: codeId }, {
      $inc: { 'quota.consumed': +1 }
    });
  }

  async decrementConsumedCount(codeId: string) {
    return this.update({ _id: codeId }, {
      $inc: { 'quota.consumed': -1 }
    });
  }
}
