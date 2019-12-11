import { CommandsProcessor } from './CommandsProcessor';
import { IUnitOfWork, IPaging } from '@saal-oryx/unit-of-work';
import { UsersRepository } from '../repositories/UsersRepository';
export class UsersService {

    constructor(protected _uow: IUnitOfWork, protected _commandsProcessor: CommandsProcessor) {
    }

    protected get usersRepo() {
        return this._uow.getRepository('Users') as UsersRepository;
      }


}