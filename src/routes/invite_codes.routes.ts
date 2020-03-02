import KoaRoute from 'koa-tree-router';
import Koa from 'koa';
import { InviteCodesService } from '../services/InviteCodesService';
import { InviteCodesController } from '../controllers/InviteCodesController';
import { CommandsProcessor } from '@saal-oryx/event-sourcing';


export default (commandsProccessor: CommandsProcessor) => {

  const inviteCodesRoutes = new KoaRoute();

  inviteCodesRoutes
    .get('/:codeId', (ctx: Koa.Context, next: () => void) => {
      const controller = new InviteCodesController(new InviteCodesService(ctx.uow, commandsProccessor));
      return controller.get(ctx, next);
    });
  return inviteCodesRoutes;
};