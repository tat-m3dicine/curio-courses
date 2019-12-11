import 'koa-body';
import { Context } from 'koa';
import loggerFactory from '../utils/logging';
import { UsersService } from '../services/UserService';
import { IRPService } from '../services/IRPService';
import { IUser } from '../models/entities/IUser';

const logger = loggerFactory.getLogger('UsersController');
export class UsersController {

  constructor(protected usersService: UsersService, protected irpService: IRPService) {

  }


}
