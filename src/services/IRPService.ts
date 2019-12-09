import { IUnitOfWork, IPaging } from '@saal-oryx/unit-of-work';
import validators from '../utils/validators';
import { CommandsProcessor } from './CommandsProcessor';
export class IRPService {

    constructor(protected _uow: IUnitOfWork, protected _commandsProcessor: CommandsProcessor) {
    }
  