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

  async findForCourses(coursesIds: string[]) {
    const currentDate = new Date();
    return this.findMany({
      'enrollment.courses': { $in: coursesIds.map(id => [id]) },
      'validity.fromDate': { $lte: currentDate },
      'validity.toDate': { $gte: currentDate },
      'isEnabled': true
    });
  }

  async getValidCode(codeId: string) {
    const currentDate = new Date();
    return this.findOne({
      '_id': codeId,
      'validity.fromDate': { $lte: currentDate },
      'validity.toDate': { $gte: currentDate },
      'isEnabled': true
    });
  }

  async deleteBySchool(schoolId: string) {
    return this._collection.deleteMany({ schoolId }, { session: this._session });
  }
}
