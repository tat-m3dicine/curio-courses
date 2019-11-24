import KoaRoute from 'koa-tree-router';
import Koa from 'koa';
import { SchoolsController } from '../controllers/SchoolsController';
import { SchoolsService } from '../services/SchoolsService';

export default () => {
  const schoolRoutes = new KoaRoute();
  schoolRoutes
    .post('/', (ctx: Koa.Context, next: () => void) => {
      const controller = new SchoolsController(new SchoolsService(ctx.uow));
      return controller.create(ctx, next);
    })
    .get('/', (ctx: Koa.Context, next: () => void) => {
      const controller = new SchoolsController(new SchoolsService(ctx.uow));
      return controller.create(ctx, next);
    })
    .put('/', (ctx: Koa.Context, next: () => void) => {
      const controller = new SchoolsController(new SchoolsService(ctx.uow));
      return controller.create(ctx, next);
    })
    .delete('/', (ctx: Koa.Context, next: () => void) => {
      const controller = new SchoolsController(new SchoolsService(ctx.uow));
      return controller.create(ctx, next);
    });

  return schoolRoutes;
};