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
    .post('/:id/license', (ctx: Koa.Context, next: () => void) => {
      const controller = new SchoolsController(new SchoolsService(ctx.uow));
      return controller.addLicense(ctx, next);
    })
    .get('/', (ctx: Koa.Context, next: () => void) => {
      const controller = new SchoolsController(new SchoolsService(ctx.uow));
      return controller.list(ctx, next);
    })
    .get('/:id', (ctx: Koa.Context, next: () => void) => {
      const controller = new SchoolsController(new SchoolsService(ctx.uow));
      return controller.get(ctx, next);
    })
    .put('/:id', (ctx: Koa.Context, next: () => void) => {
      const controller = new SchoolsController(new SchoolsService(ctx.uow));
      return controller.update(ctx, next);
    })
    .patch('/:id', (ctx: Koa.Context, next: () => void) => {
      const controller = new SchoolsController(new SchoolsService(ctx.uow));
      return controller.patch(ctx, next);
    })
    .delete('/:id', (ctx: Koa.Context, next: () => void) => {
      const controller = new SchoolsController(new SchoolsService(ctx.uow));
      return controller.delete(ctx, next);
    });

  return schoolRoutes;
};