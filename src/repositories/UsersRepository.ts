import { Collection } from 'mongodb';
import { AduitableRepository } from './AduitableRepository';
import { IUser } from '../models/entities/IUser';

export class UsersRepository extends AduitableRepository<IUser> {
  constructor(collection: Collection) {
    super('Users', collection);
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
}
