import KoaRoute from 'koa-tree-router';
import Koa from 'koa';
import { InviteCodesService } from '../services/InviteCodesService';
import { InviteCodesController } from '../controllers/InviteCodesController';
import { CommandsProcessor } from '@saal-oryx/event-sourcing';


export default (commandsProccessor: CommandsProcessor) => {

  const schoolsInviteCodesRoutes = new KoaRoute();

  schoolsInviteCodesRoutes
    .get('/:schoolId/invite_codes', (ctx: Koa.Context) => {
      const controller = new InviteCodesController(new InviteCodesService(ctx.uow, commandsProccessor));
      return controller.list(ctx);
    })
    .post('/:schoolId/invite_codes', (ctx: Koa.Context) => {
      const controller = new InviteCodesController(new InviteCodesService(ctx.uow, commandsProccessor));
      return controller.create(ctx);
    })
    .get('/:schoolId/invite_codes/:codeId', (ctx: Koa.Context) => {
      const controller = new InviteCodesController(new InviteCodesService(ctx.uow, commandsProccessor));
      return controller.getForSchool(ctx);
    })
    .delete('/:schoolId/invite_codes/:codeId', (ctx: Koa.Context) => {
      const controller = new InviteCodesController(new InviteCodesService(ctx.uow, commandsProccessor));
      return controller.delete(ctx);
    });
  return schoolsInviteCodesRoutes;
};