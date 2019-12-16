import { Collection } from 'mongodb';
import { AduitableRepository } from './AduitableRepository';
import { ICourse, IUserCourseInfo } from '../models/entities/ICourse';
import { Role } from '../models/Role';

export class CoursesRepository extends AduitableRepository<ICourse> {

  constructor(collection: Collection) {
    super('Courses', collection);
  }

  async finishUsersInCourses(filter: object, usersType: Role, userIds: string[], date: Date) {
    return this.update(filter, {
      $set: { [`${usersType}s.$[user].finishDate`]: date }
    }, {
      arrayFilters: [{ 'user._id': { $in: userIds }, 'user.finishDate': { $exists: false } }]
    });
  }

  async addUsersToCourses(filter: object, usersType: Role, usersObj: IUserCourseInfo[]) {
    return this.update(filter, [{
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
                      { $not: { $in: ['$$user._id', usersObj.map(user => user._id)] } },
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
                    input: usersObj,
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
    }]);
  }
}
