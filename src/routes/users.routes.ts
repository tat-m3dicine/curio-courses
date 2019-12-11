import KoaRoute from 'koa-tree-router';
import Koa from 'koa';
import { UsersService } from '../services/UserService';
import { IRPService } from '../services/IRPService';
import { UsersController } from '../controllers/UsersController';
import { CommandsProcessor } from '../services/CommandsProcessor';


export default (commandsProccessor: CommandsProcessor) => {

  const usersRoutes = new KoaRoute();

  usersRoutes
    .get('/', (ctx: Koa.Context, next: () => void) => {
      const controller = new UsersController(new UsersService(ctx.uow, commandsProccessor), new IRPService());
      return controller.migrateIRPUsers(ctx, next);
    });

    return usersRoutes;
};