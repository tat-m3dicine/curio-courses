import { Collection } from 'mongodb';
import { AduitableRepository } from './AduitableRepository';
import { IAuditable } from '../models/entities/Common';
import { IEntity } from '@saal-oryx/unit-of-work';
import { IUsers } from '../models/entities/IUser';

export class UsersRepository extends AduitableRepository<IUsers & IEntity & Partial<IAuditable>> {

  constructor(collection: Collection) {
    super('Users', collection);
  }
  
}
