import { Collection, ClientSession } from 'mongodb';
import { AduitableRepository } from './AduitableRepository';
import { ICourse, IUserCourseInfo } from '../models/entities/ICourse';
import { Role } from '../models/Role';
import { Repo } from './RepoNames';
import loggerFactory from '../utils/logging';
const logger = loggerFactory.getLogger('CoursesRepository');

export class CoursesRepository extends AduitableRepository<ICourse> {
  constructor(collection: Collection, session?: ClientSession) {
    super(Repo.courses, collection, session);
  }

  async finishUsersInCourses(updates: { filter: object, usersIds: string[] }[], usersType: Role, date: Date) {
    const command = updates.map(({ filter, usersIds }) => ({
      updateMany: {
        filter, update: {
          $set: { [`${usersType}s.$[user].finishDate`]: date }
        },
        arrayFilters: [{
          'user._id': { $in: usersIds },
          'user.finishDate': { $exists: false }
        }]
      }
    }));
    logger.debug('bulkWrite', JSON.stringify(command));
    return this._collection.bulkWrite(command, { session: this._session });
  }

  async addUsersToCourses(updates: { filter: object, usersObjs: IUserCourseInfo[] }[], usersType: Role) {
    const command = updates.map(({ filter, usersObjs }) => ({
      updateMany: {
        filter, update: [{
          $set: {
            [`${usersType}s`]: {
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
    }));
    logger.debug('bulkWrite', JSON.stringify(command));
    return this._collection.bulkWrite(command, { session: this._session });
  }

  async toggleUsersInCourses(filter: object, usersIds: string[], usersType: Role, value: boolean) {
    return this.update(filter, {
      $set: { [`${usersType}s.$[user].isEnabled`]: value }
    }, {
      arrayFilters: [{
        'user._id': { $in: usersIds },
        'user.isEnabled': { $ne: value }
      }]
    });
  }

  async getActiveCoursesForSchool(schoolId: string, projection = {}) {
    const currentDate = new Date();
    return this.findMany({
      schoolId, 'isEnabled': true,
      'academicTerm.startDate': { $lte: currentDate },
      'academicTerm.endDate': { $gte: currentDate }
    }, projection);
  }

  async getActiveCoursesForUsers(role: Role, usersIds: string[]) {
    const currentDate = new Date();
    return this.findMany({
      [`${role}s`]: { $elemMatch: { _id: { $in: usersIds } } },
      'academicTerm.startDate': { $lte: currentDate },
      'academicTerm.endDate': { $gte: currentDate },
      'isEnabled': true
    });
  }

  async getActiveCoursesForUser(role: Role, usersId: string) {
    const currentDate = new Date();
    const pipeline: any[] = [
      {
        $match: {
          [`${role}s`]: { $elemMatch: { _id: { $eq: usersId } } },
          'academicTerm.startDate': { $lte: currentDate },
          'academicTerm.endDate': { $gte: currentDate },
          'isEnabled': true
        }
      }
    ];

    if (role === Role.student) {
      pipeline.push({ $project: { students: 0, teachers: 0 } });
    } else {
      pipeline.push(
        {
          $addFields: {
            students: {
              $filter: {
                input: '$students',
                as: 'student',
                cond: {
                  $and: [
                    { $eq: ['$$student.isEnabled', true] },
                    { $not: '$$student.finishDate' }
                  ]
                }
              }
            },
            teachers: {
              $filter: {
                input: '$teachers',
                as: 'teacher',
                cond: {
                  $and: [
                    { $eq: ['$$teacher.isEnabled', true] },
                    { $not: '$$teacher.finishDate' }
                  ]
                }
              }
            }
          }
        },
        {
          $lookup:
          {
            from: 'Users',
            let: { students: '$students' },
            pipeline: [
              { $match: { $expr: { $in: ['$_id', '$$students._id'] } } },
              { $project: { profile: 1, _id: 1 } }
            ],
            as: 'students'
          }
        },
        {
          $lookup:
          {
            from: 'Users',
            let: { teachers: '$teachers' },
            pipeline: [
              { $match: { $expr: { $in: ['$_id', '$$teachers._id'] } } },
              { $project: { profile: 1, _id: 1 } }
            ],
            as: 'teachers'
          }
        }
      );
    }
    return this._collection.aggregate(pipeline, { session: this._session }).toArray();
  }

  async getActiveCoursesUnderSections(sectionsIds: string[]) {
    const currentDate = new Date();
    return this.findMany({
      'sectionId': { $in: sectionsIds },
      'academicTerm.startDate': { $lte: currentDate },
      'academicTerm.endDate': { $gte: currentDate },
      'isEnabled': true
    });
  }

}
