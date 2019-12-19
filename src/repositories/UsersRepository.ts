import { Collection } from 'mongodb';
import { AduitableRepository } from './AduitableRepository';
import { IUser } from '../models/entities/IUser';
import { InvalidRequestError } from '../exceptions/InvalidRequestError';

export class UsersRepository extends AduitableRepository<IUser> {
  constructor(collection: Collection) {
    super('Users', collection);
  }

  addRegisteration(user: IUser) {
    if (!user.registration) throw new InvalidRequestError(`no registration found for user '${user._id}'`);
    return this.update({ _id: user._id }, {
      $set: {
        registration: user.registration,
        profile: user.profile,
        role: user.role
      }
    }, { upsert: true });
  }

  async assignSchool(user: IUser, joinDate: Date) {
    if (!user.registration) throw new InvalidRequestError(`no registration found for user '${user._id}'`);
    const newSchoolId = user.registration.school._id;
    const oldUser = await this.findOneAndUpdate({ _id: user._id }, {
      $unset: { registration: true },
      $set: {
        school: {
          _id: newSchoolId,
          joinDate
        },
        profile: user.profile,
        role: user.role
      }
    }, { upsert: true, returnOriginal: true });
    return oldUser;
  }
}
