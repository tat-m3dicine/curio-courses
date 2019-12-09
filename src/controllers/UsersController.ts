import 'koa-body';
import { Context } from 'koa';
import loggerFactory from '../utils/logging';
import { UsersService } from '../services/UserService';
const logger = loggerFactory.getLogger('UsersController');
export class UsersController {

    constructor(protected usersService: UsersService) {

    }

    async migrateUsersIRPToUsers() {

    }
}

