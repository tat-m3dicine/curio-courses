import KoaRoute from 'koa-tree-router';
import Koa from 'koa';
import { ProvidersController } from '../controllers/ProvidersController';
import { ProvidersService } from '../services/ProviderService';
import { CommandsProcessor } from '@saal-oryx/event-sourcing';

export default (commandsProccessor: CommandsProcessor) => {
  const providerRoutes = new KoaRoute();
  providerRoutes
    .post('/', (ctx: Koa.Context) => {
      const controller = new ProvidersController(new ProvidersService(ctx.uow, commandsProccessor));
      return controller.create(ctx);
    })
    .post('/:providerId/academics', (ctx: Koa.Context) => {
      const controller = new ProvidersController(new ProvidersService(ctx.uow, commandsProccessor));
      return controller.updateAcademics(ctx);
    })
    .delete('/:providerId/academics/:academicTermId', (ctx: Koa.Context) => {
      const controller = new ProvidersController(new ProvidersService(ctx.uow, commandsProccessor));
      return controller.deleteAcademicProviders(ctx);
    })
    .delete('/:providerId', (ctx: Koa.Context) => {
      const controller = new ProvidersController(new ProvidersService(ctx.uow, commandsProccessor));
      return controller.deleteProvider(ctx);
    })
    .get('/:providerId', (ctx: Koa.Context) => {
      const controller = new ProvidersController(new ProvidersService(ctx.uow, commandsProccessor));
      return controller.get(ctx);
    });
  return providerRoutes;
};