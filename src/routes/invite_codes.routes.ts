import KoaRoute from 'koa-tree-router';
import Koa from 'koa';
import { InviteCodesService } from '../services/InviteCodesService';
import { InviteCodesController } from '../controllers/InviteCodesController';
import { CommandsProcessor } from '../services/CommandsProcessor';


export default (commandsProccessor: CommandsProcessor) => {

  const inviteCodesRoutes = new KoaRoute();

  inviteCodesRoutes
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
      return controller.get(ctx, next);
    })
    .delete('/:schoolId/invite_codes/:codeId', (ctx: Koa.Context, next: () => void) => {
      const controller = new InviteCodesController(new InviteCodesService(ctx.uow, commandsProccessor));
      return controller.delete(ctx, next);
    });
  return inviteCodesRoutes;
};