import KoaRoute from 'koa-tree-router';
import Koa from 'koa';
import { CoursesService } from '../services/CoursesService';
import { CoursesController } from '../controllers/CoursesController';
import { CommandsProcessor } from '../services/CommandsProcessor';


export default (commandsProccessor: CommandsProcessor) => {

  const coursesRoutes = new KoaRoute();

  coursesRoutes
    .post('/:schoolId/sections/:sectionId/courses', (ctx: Koa.Context, next: () => void) => {
      const controller = new CoursesController(new CoursesService(ctx.uow, commandsProccessor));
      return controller.create(ctx, next);
    })
    .get('/:schoolId/sections/:sectionId/courses', (ctx: Koa.Context, next: () => void) => {
      const controller = new CoursesController(new CoursesService(ctx.uow, commandsProccessor));
      return controller.list(ctx, next);
    })
    .get('/:schoolId/sections/:sectionId/courses/:courseId', (ctx: Koa.Context, next: () => void) => {
      const controller = new CoursesController(new CoursesService(ctx.uow, commandsProccessor));
      return controller.get(ctx, next);
    })
    .patch('/:schoolId/sections/:sectionId/courses/:courseId', (ctx: Koa.Context, next: () => void) => {
      const controller = new CoursesController(new CoursesService(ctx.uow, commandsProccessor));
      return controller.update(ctx, next);
    })
    .delete('/:schoolId/sections/:sectionId/courses/:courseId', (ctx: Koa.Context, next: () => void) => {
      const controller = new CoursesController(new CoursesService(ctx.uow, commandsProccessor));
      return controller.delete(ctx, next);
    });
  return coursesRoutes;
};