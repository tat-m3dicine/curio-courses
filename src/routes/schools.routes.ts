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
      const controller = new SchoolsController(new SchoolsService(ctx.uow, commandsProccessor));
      return controller.create(ctx, next);
    })
    .post('/:id/license', (ctx: Koa.Context, next: () => void) => {
      const controller = new SchoolsController(new SchoolsService(ctx.uow, commandsProccessor));
      return controller.addLicense(ctx, next);
    })
    .post('/:id/academics', (ctx: Koa.Context, next: () => void) => {
      const controller = new SchoolsController(new SchoolsService(ctx.uow, commandsProccessor));
      return controller.updateAcademics(ctx, next);
    })
    .delete('/:id/academics/:academicTermId', (ctx: Koa.Context, next: () => void) => {
      const controller = new SchoolsController(new SchoolsService(ctx.uow, commandsProccessor));
      return controller.deleteAcademics(ctx, next);
    })
    .get('/', (ctx: Koa.Context, next: () => void) => {
      const controller = new SchoolsController(new SchoolsService(ctx.uow, commandsProccessor));
      return controller.list(ctx, next);
    })
    .get('/:id', (ctx: Koa.Context, next: () => void) => {
      const controller = new SchoolsController(new SchoolsService(ctx.uow, commandsProccessor));
      return controller.get(ctx, next);
    })
    .put('/:id', (ctx: Koa.Context, next: () => void) => {
      const controller = new SchoolsController(new SchoolsService(ctx.uow, commandsProccessor));
      return controller.update(ctx, next);
    })
    .patch('/:id', (ctx: Koa.Context, next: () => void) => {
      const controller = new SchoolsController(new SchoolsService(ctx.uow, commandsProccessor));
      return controller.patch(ctx, next);
    })
    .delete('/:id', (ctx: Koa.Context, next: () => void) => {
      const controller = new SchoolsController(new SchoolsService(ctx.uow, commandsProccessor));
      return controller.delete(ctx, next);
    });

  return schoolRoutes;
};