import { Collection, ClientSession } from 'mongodb';
import { AduitableRepository } from './AduitableRepository';
import { IUser } from '../models/entities/IUser';
import { Repo } from '../models/RepoNames';
import { InvalidRequestError } from '../exceptions/InvalidRequestError';

export class UsersRepository extends AduitableRepository<IUser> {
  constructor(collection: Collection, session?: ClientSession) {
    super(Repo.users, collection, session);
  }

  async getUsersInSchool(schoolId: string, users: string[]) {
    const dbUsers: IUser[] = await this.findMany({ 'school._id': schoolId, '_id': { $in: users } });
    if (dbUsers.length !== users.length) {
      const usersNotInSchool = users.filter(uId => dbUsers.find(dbUser => dbUser._id === uId));
      throw new InvalidRequestError(`not all users where found in the school, ${usersNotInSchool}`);
    }
    return dbUsers;
  }

  async addRegisteration(user: IUser) {
    return this.update({ _id: user._id }, {
      $set: {
        registration: user.registration,
      },
      $setOnInsert: {
        role: user.role,
        profile: user.profile,
      }
    }, { upsert: true });
  }

  async assignSchool(user: IUser) {
    return this.findOneAndUpdate({ _id: user._id }, {
      $unset: { registration: true },
      $set: {
        school: user.school,
      },
      $setOnInsert: {
        role: user.role,
        profile: user.profile,
      }
    }, { upsert: true, returnOriginal: true });
  }

  async count(filter: any) {
    return this._collection.countDocuments(filter, { session: this._session });
  }

  async approveRegistrations(schoolId: string, users: string[]) {
    return this.update({ _id: { $in: users } }, {
      $unset: { registration: true },
      $set: { school: { _id: schoolId } },
    });
  }

  async reject(schoolId: string, users: string[]) {
    return this.update({ '_id': { $in: users }, 'registration.school._id': schoolId }, { $unset: { registration: true } });
  }

  async withdraw(schoolId: string, users: string[]) {
    return this.update({ '_id': { $in: users }, 'school._id': schoolId }, { $unset: { registration: true, school: true } });
  }
}
