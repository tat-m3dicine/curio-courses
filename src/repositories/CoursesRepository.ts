import { Collection } from 'mongodb';
import { AduitableRepository } from './AduitableRepository';
import { IAuditable } from '../models/entities/Common';
import { IEntity } from '@saal-oryx/unit-of-work';
import { ICourse, IUserCourseInfo } from '../models/entities/ICourse';

export class CoursesRepository extends AduitableRepository<ICourse & IEntity & Partial<IAuditable>> {

  constructor(collection: Collection) {
    super('Courses', collection);
  }

  async finishUsersInCourses(filter: object, usersType: string, userIds: string[], date: Date) {
    return this.update(filter, {
      $set: { [`${usersType}.$[user].finishDate`]: date }
    }, {
      arrayFilters: [{ 'user._id': { $in: userIds }, 'user.finishDate': { $exists: false } }]
    });
  }

  async addUsersToCourses(filter: object, usersType: string, usersObj: IUserCourseInfo[]) {
    return this.update(filter, [{
      $set: {
        [usersType]: {
          $let: {
            vars: {
              active_users: {
                $filter: {
                  input: `$${usersType}`,
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
