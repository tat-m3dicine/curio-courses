import { Collection } from 'mongodb';
import { ISchool, ISchoolUserPermissions } from '../models/entities/ISchool';
import { AduitableRepository } from './AduitableRepository';

export class SchoolsRepository extends AduitableRepository<ISchool> {

  constructor(collection: Collection) {
    super('Schools', collection);
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
