import KoaRoute from 'koa-tree-router';
import Koa from 'koa';
import { SectionsService } from '../services/SectionsService';
import { ForbiddenError } from '../exceptions/ForbiddenError';
import { SectionsController } from '../controllers/SectionsController';


export default () => {

  const sectionsRoutes = new KoaRoute();

  sectionsRoutes
    .post('/schools/:school_id/sections/section_id/students/register', (ctx: Koa.Context, next: () => void) => {
      if (!ctx.user) throw new ForbiddenError();
      const controller = new SectionsController(new SectionsService(ctx.uow));
      return controller.registerStudents(ctx, next);
    })
    .post('/schools/:school_id/sections/section_id/students/remove', (ctx: Koa.Context, next: () => void) => {
      if (!ctx.user) throw new ForbiddenError();
      const controller = new SectionsController(new SectionsService(ctx.uow));
      return controller.removeStudents(ctx, next);
    });
  return sectionsRoutes;
};