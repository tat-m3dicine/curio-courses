import { Collection, ClientSession } from 'mongodb';
import { AduitableRepository } from './AduitableRepository';
import { IInviteCode } from '../models/entities/IInviteCode';
import { Repo } from '../models/RepoNames';

export class InviteCodesRepository extends AduitableRepository<IInviteCode> {
  constructor(collection: Collection, session?: ClientSession) {
    super(Repo.inviteCodes, collection, session);
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
