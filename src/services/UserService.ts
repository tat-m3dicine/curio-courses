import validators from '../utils/validators';
import { CommandsProcessor } from './CommandsProcessor';
import { IUnitOfWork, IPaging } from '@saal-oryx/unit-of-work';
import { UsersRepository } from '../repositories/UsersRepository';
import { IUser } from '../models/entities/IUser';
import { IUserToken } from '../models/IUserToken';
export class UsersService {

  constructor(protected _uow: IUnitOfWork, protected _commandsProcessor: CommandsProcessor) {
  }

  protected get usersRepo() {
    return this._uow.getRepository('Users') as UsersRepository;
  }

  async doAddMany(users: IUser[]) {
    for (const user of users) {
      validators.validateCreateUser(user);
    }
    return this.usersRepo.addMany(users, false);
  }

}