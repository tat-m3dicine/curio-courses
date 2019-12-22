import KoaRoute from 'koa-tree-router';
import Koa from 'koa';
import { ProvidersController } from '../controllers/ProvidersController';
import { ProvidersService } from '../services/ProviderService';
import { CommandsProcessor } from '../services/CommandsProcessor';

export default (commandsProccessor: CommandsProcessor) => {
  const providerRoutes = new KoaRoute();
  providerRoutes
    .post('/', (ctx: Koa.Context, next: () => void) => {
      const controller = new ProvidersController(new ProvidersService(ctx.uow, commandsProccessor));
      return controller.create(ctx, next);
    })
    .post('/:providerId/academics', (ctx: Koa.Context, next: () => void) => {
        const controller = new ProvidersController(new ProvidersService(ctx.uow, commandsProccessor));
        return controller.updateAcademics(ctx, next);
      });

  return providerRoutes;
};