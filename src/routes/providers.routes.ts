import KoaRoute from 'koa-tree-router';
import Koa from 'koa';
import { ProvidersController } from '../controllers/ProvidersController';
import { ProvidersService } from '../services/ProviderService';
import { CommandsProcessor } from '../services/processors/CommandsProcessor';

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
    })
    .delete('/:providerId/academics/:academicTermId', (ctx: Koa.Context, next: () => void) => {
      const controller = new ProvidersController(new ProvidersService(ctx.uow, commandsProccessor));
      return controller.deleteAcademicProviders(ctx, next);
    })
    .delete('/:providerId', (ctx: Koa.Context, next: () => void) => {
      const controller = new ProvidersController(new ProvidersService(ctx.uow, commandsProccessor));
      return controller.deleteProvider(ctx, next);
    })
    .get('/:providerId', (ctx: Koa.Context, next: () => void) => {
      const controller = new ProvidersController(new ProvidersService(ctx.uow, commandsProccessor));
      return controller.get(ctx, next);
    });
  return providerRoutes;
};