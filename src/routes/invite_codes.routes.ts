import KoaRoute from 'koa-tree-router';
import Koa from 'koa';
import { InviteCodesService } from '../services/InviteCodesService';
import { InviteCodesController } from '../controllers/InviteCodesController';
import { CommandsProcessor } from '@saal-oryx/event-sourcing';
import { CoursesController } from '../controllers/CoursesController';
import { CoursesService } from '../services/CoursesService';
import { UpdatesProcessor } from '../services/processors/UpdatesProcessor';


export default (commandsProccessor: CommandsProcessor, updatesProcessor: UpdatesProcessor) => {

  const inviteCodesRoutes = new KoaRoute();

  inviteCodesRoutes
    .get('/:codeId', (ctx: Koa.Context) => {
      const controller = new InviteCodesController(new InviteCodesService(ctx.uow, commandsProccessor));
      return controller.get(ctx);
    })
    .post('/:codeId/join', (ctx: Koa.Context) => {
      const controller = new CoursesController(new CoursesService(ctx.uow, commandsProccessor, updatesProcessor));
      return controller.join(ctx);
    });
  return inviteCodesRoutes;
};