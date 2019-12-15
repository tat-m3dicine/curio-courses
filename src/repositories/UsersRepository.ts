import { Collection } from 'mongodb';
import { AduitableRepository } from './AduitableRepository';
import { IUser } from '../models/entities/IUser';

export class UsersRepository extends AduitableRepository<IUser> {

  constructor(collection: Collection) {
    super('Users', collection);
  }

}
