import KoaRoute from 'koa-tree-router';
import Koa from 'koa';
import { InviteCodesService } from '../services/InviteCodesService';
import { InviteCodesController } from '../controllers/InviteCodesController';
import { CommandsProcessor } from '@saal-oryx/event-sourcing';


export default (commandsProccessor: CommandsProcessor) => {

  const schoolsInviteCodesRoutes = new KoaRoute();

  schoolsInviteCodesRoutes
    .get('/:schoolId/invite_codes', (ctx: Koa.Context, next: () => void) => {
      const controller = new InviteCodesController(new InviteCodesService(ctx.uow, commandsProccessor));
      return controller.list(ctx, next);
    })
    .post('/:schoolId/invite_codes', (ctx: Koa.Context, next: () => void) => {
      const controller = new InviteCodesController(new InviteCodesService(ctx.uow, commandsProccessor));
      return controller.create(ctx, next);
    })
    .get('/:schoolId/invite_codes/:codeId', (ctx: Koa.Context, next: () => void) => {
      const controller = new InviteCodesController(new InviteCodesService(ctx.uow, commandsProccessor));
      return controller.getForSchool(ctx, next);
    })
    .delete('/:schoolId/invite_codes/:codeId', (ctx: Koa.Context, next: () => void) => {
      const controller = new InviteCodesController(new InviteCodesService(ctx.uow, commandsProccessor));
      return controller.delete(ctx, next);
    });
  return schoolsInviteCodesRoutes;
};