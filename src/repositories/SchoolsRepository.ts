import { Collection, ClientSession } from 'mongodb';
import { ISchool, ISchoolUserPermissions, IAcademicTermRequest } from '../models/entities/ISchool';
import { AduitableRepository } from './AduitableRepository';
import { IAcademicTerm } from '../models/entities/Common';

export class SchoolsRepository extends AduitableRepository<ISchool> {
  constructor(collection: Collection, session?: ClientSession) {
    super('Schools', collection, session);
  }

  updateAcademicTerm(schoolId: string, updateObj: IAcademicTermRequest, academicTerm: IAcademicTerm) {
    const { startDate, endDate } = updateObj;
    return this.update({
      _id: schoolId,
      academicTerms: {
        $not: {
          $elemMatch: {
            $or: [
              {
                $and: [
                  { startDate: { $gt: new Date(startDate) } },
                  { startDate: { $lt: new Date(endDate) } },
                ]
              },
              {
                $and: [
                  { startDate: { $lt: new Date(startDate) } },
                  { endDate: { $gt: new Date(endDate) } },
                ]
              },
              {
                $and: [
                  { startDate: { $gt: new Date(startDate) } },
                  { endDate: { $lt: new Date(endDate) } },
                ]
              },
              {
                $and: [
                  { endDate: { $gt: new Date(startDate) } },
                  { endDate: { $lt: new Date(endDate) } },
                ]
              },
              {
                $and: [
                  { startDate: { $eq: new Date(startDate) } },
                  { endDate: { $eq: new Date(endDate) } },
                ]
              }
            ]
          }
        }
      }
    }, {
      $push: { academicTerms: academicTerm }
    });
  }

  deleteAcademicTerm(schoolId: string, academicTermId: string) {
    return this.update({ _id: schoolId }, {
      $pull: { academicTerms: { _id: academicTermId } }
    });
  }

  async updateUsersPermission(schoolId: string, users: ISchoolUserPermissions[]) {
    return this.update({ _id: schoolId }, [{
      $set: {
        users: {
          $let: {
            vars: {
              users_removed: {
                $filter: {
                  input: `$users`,
                  as: 'user',
                  cond: {
                    $not: { $in: ['$$user._id', users.map(user => user._id)] }
                  }
                }
              }
            },
            in: {
              $setUnion: [
                users,
                '$$users_removed'
              ]
            }
          }
        }
      }
    }]);
  }

  async deleteUsersPermission(schoolId: string, usersIds: string[]) {
    return this.update({ _id: schoolId }, {
      $pull: { users: { _id: { $in: usersIds } } }
    });
  }
}
