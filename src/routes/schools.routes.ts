import KoaRoute from 'koa-tree-router';
import Koa from 'koa';
import { SchoolsController } from '../controllers/SchoolsController';
import { SchoolsService } from '../services/SchoolsService';
import { CommandsProcessor } from '../services/CommandsProcessor';
import { CoursesService } from '../services/CoursesService';

export default (commandsProccessor: CommandsProcessor) => {
  const schoolRoutes = new KoaRoute();
  schoolRoutes
    .post('/', (ctx: Koa.Context, next: () => void) => {
      const courseService = new CoursesService(ctx.uow, commandsProccessor);
      const controller = new SchoolsController(new SchoolsService(ctx.uow, commandsProccessor, courseService));
      return controller.create(ctx, next);
    })
    .post('/:id/license', (ctx: Koa.Context, next: () => void) => {
      const courseService = new CoursesService(ctx.uow, commandsProccessor);
      const controller = new SchoolsController(new SchoolsService(ctx.uow, commandsProccessor, courseService));
      return controller.addLicense(ctx, next);
    })
    .post('/:id/academics', (ctx: Koa.Context, next: () => void) => {
      const courseService = new CoursesService(ctx.uow, commandsProccessor);
      const controller = new SchoolsController(new SchoolsService(ctx.uow, commandsProccessor, courseService));
      return controller.updateAcademics(ctx, next);
    })
    .delete('/:id/academics/:academicTermId', (ctx: Koa.Context, next: () => void) => {
      const courseService = new CoursesService(ctx.uow, commandsProccessor);
      const controller = new SchoolsController(new SchoolsService(ctx.uow, commandsProccessor, courseService));
      return controller.deleteAcademics(ctx, next);
    })
    .get('/', (ctx: Koa.Context, next: () => void) => {
      const courseService = new CoursesService(ctx.uow, commandsProccessor);
      const controller = new SchoolsController(new SchoolsService(ctx.uow, commandsProccessor, courseService));
      return controller.list(ctx, next);
    })
    .get('/:id', (ctx: Koa.Context, next: () => void) => {
      const courseService = new CoursesService(ctx.uow, commandsProccessor);
      const controller = new SchoolsController(new SchoolsService(ctx.uow, commandsProccessor, courseService));
      return controller.get(ctx, next);
    })
    .put('/:id', (ctx: Koa.Context, next: () => void) => {
      const courseService = new CoursesService(ctx.uow, commandsProccessor);
      const controller = new SchoolsController(new SchoolsService(ctx.uow, commandsProccessor, courseService));
      return controller.update(ctx, next);
    })
    .patch('/:id', (ctx: Koa.Context, next: () => void) => {
      const courseService = new CoursesService(ctx.uow, commandsProccessor);
      const controller = new SchoolsController(new SchoolsService(ctx.uow, commandsProccessor, courseService));
      return controller.patch(ctx, next);
    })
    .delete('/:id', (ctx: Koa.Context, next: () => void) => {
      const courseService = new CoursesService(ctx.uow, commandsProccessor);
      const controller = new SchoolsController(new SchoolsService(ctx.uow, commandsProccessor, courseService));
      return controller.delete(ctx, next);
    });

  return schoolRoutes;
};