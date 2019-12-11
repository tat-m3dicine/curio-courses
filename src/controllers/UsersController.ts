import 'koa-body';
import { Context } from 'koa';
import loggerFactory from '../utils/logging';
import { UsersService } from '../services/UserService';
import { IRPService } from '../services/IRPService';
const logger = loggerFactory.getLogger('UsersController');
export class UsersController {

  constructor(protected usersService: UsersService, protected irpService: IRPService) {

  }

  async migrateIRPUsers(ctx: Context, next: () => void) {
    logger.info('migrateIRPUsers invoked');
    const allSections = await this.irpService.getAllSections();
    console.log('allSections response in migrateIRPUsers:', allSections);
    const result = await Promise.all(allSections.map(section => this.irpService.getAllUsersBySection(section.uuid)));
  // const result = await this.irpService.getAllUsersBySection('6_A_SAISPJ0PZV');
    ctx.status = 200;
    ctx.body = { ok: true, result };
    ctx.type = 'json';
  }
}
