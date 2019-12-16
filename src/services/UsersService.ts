import validators from '../utils/validators';
import { CommandsProcessor } from './CommandsProcessor';
import { IUnitOfWork } from '@saal-oryx/unit-of-work';
import { UsersRepository } from '../repositories/UsersRepository';
import { IUser } from '../models/entities/IUser';

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

  async doUpdate(userInfo: any) {
    const userObj = userInfo.new_user_data;
    const userUpdate: any = { profile: {} };
    delete (userObj.id);
    for (const key of Object.keys(userObj)) {
      if (key !== 'role') {
        userUpdate.profile[key] = userObj[key];
      } else {
        userUpdate[key] = userObj[key].split(',').map(r => r.toLowerCase().trim());
      }
    }
    if (!userUpdate) return;
    return this.usersRepo.patch({ _id: userInfo.user_id }, userUpdate);
  }

}