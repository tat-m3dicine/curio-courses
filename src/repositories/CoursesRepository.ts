import { Collection } from 'mongodb';
import { AduitableRepository } from './AduitableRepository';
import { ICourse, IUserCourseInfo } from '../models/entities/ICourse';
import { Role } from '../models/Role';

export class CoursesRepository extends AduitableRepository<ICourse> {

  constructor(collection: Collection) {
    super('Courses', collection);
  }

  async finishUsersInCourses(updates: { filter: object, usersIds: string[] }[], usersType: Role, date: Date) {
    return this._collection.bulkWrite(
      updates.map(({ filter, usersIds }) => ({
        updateOne: {
          filter, update: {
            $set: { [`${usersType}s.$[user].finishDate`]: date }
          },
          arrayFilters: [{
            'user._id': { $in: usersIds },
            'user.finishDate': { $exists: false }
          }]
        }
      })),
      { session: this._session }
    );
  }

  async addUsersToCourses(updates: { filter: object, usersObjs: IUserCourseInfo[] }[], usersType: Role) {
    return this._collection.bulkWrite(
      updates.map(({ filter, usersObjs }) => ({
        updateOne: {
          filter, update: [{
            $set: {
              [usersType]: {
                $let: {
                  vars: {
                    active_users: {
                      $filter: {
                        input: `$${usersType}s`,
                        as: 'user',
                        cond: {
                          $or: [
                            { $not: { $in: ['$$user._id', usersObjs.map(user => user._id)] } },
                            { $not: '$$user.finishDate' }
                          ]
                        }
                      }
                    }
                  },
                  in: {
                    $setUnion: [
                      {
                        $filter: {
                          input: usersObjs,
                          as: 'user',
                          cond: {
                            $not: {
                              $in: [
                                '$$user._id',
                                '$$active_users._id'
                              ]
                            }
                          }
                        }
                      },
                      '$$active_users'
                    ]
                  }
                }
              }
            }
          }]
        }
      })),
      { session: this._session }
    );
  }
}
