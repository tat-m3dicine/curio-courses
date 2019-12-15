import { Collection } from 'mongodb';
import { AduitableRepository } from './AduitableRepository';
import { IInviteCode } from '../models/entities/IInviteCode';

export class InviteCodesRepository extends AduitableRepository<IInviteCode> {
  constructor(collection: Collection) {
    super('InviteCode', collection);
  }
}
