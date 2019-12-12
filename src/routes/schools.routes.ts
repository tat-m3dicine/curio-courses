import KoaRoute from 'koa-tree-router';
import Koa from 'koa';
import { SchoolsController } from '../controllers/SchoolsController';
import { SchoolsService } from '../services/SchoolsService';
import { CommandsProcessor } from '../services/CommandsProcessor';

export default (commandsProccessor: CommandsProcessor) => {
  const schoolRoutes = new KoaRoute();
  schoolRoutes
    .post('/', (ctx: Koa.Context, next: () => void) => {
      const controller = new SchoolsController(new SchoolsService(ctx.uow, commandsProccessor));
      return controller.create(ctx, next);
    })
    .post('/:schoolId/license', (ctx: Koa.Context, next: () => void) => {
      const controller = new SchoolsController(new SchoolsService(ctx.uow, commandsProccessor));
      return controller.addLicense(ctx, next);
    })
    .post('/:schoolId/academics', (ctx: Koa.Context, next: () => void) => {
      const controller = new SchoolsController(new SchoolsService(ctx.uow, commandsProccessor));
      return controller.updateAcademics(ctx, next);
    })
    .delete('/:schoolId/academics/:academicTermId', (ctx: Koa.Context, next: () => void) => {
      const controller = new SchoolsController(new SchoolsService(ctx.uow, commandsProccessor));
      return controller.deleteAcademics(ctx, next);
    })
    .post('/:schoolId/users/update', (ctx: Koa.Context, next: () => void) => {
      const controller = new SchoolsController(new SchoolsService(ctx.uow, commandsProccessor));
      return controller.updateUsers(ctx, next);
    })
    .post('/:schoolId/users/delete', (ctx: Koa.Context, next: () => void) => {
      const controller = new SchoolsController(new SchoolsService(ctx.uow, commandsProccessor));
      return controller.deleteUsers(ctx, next);
    })
    .get('/', (ctx: Koa.Context, next: () => void) => {
      const controller = new SchoolsController(new SchoolsService(ctx.uow, commandsProccessor));
      return controller.list(ctx, next);
    })
    .get('/:schoolId', (ctx: Koa.Context, next: () => void) => {
      const controller = new SchoolsController(new SchoolsService(ctx.uow, commandsProccessor));
      return controller.get(ctx, next);
    })
    .put('/:schoolId', (ctx: Koa.Context, next: () => void) => {
      const controller = new SchoolsController(new SchoolsService(ctx.uow, commandsProccessor));
      return controller.update(ctx, next);
    })
    .patch('/:schoolId', (ctx: Koa.Context, next: () => void) => {
      const controller = new SchoolsController(new SchoolsService(ctx.uow, commandsProccessor));
      return controller.patch(ctx, next);
    })
    .delete('/:schoolId', (ctx: Koa.Context, next: () => void) => {
      const controller = new SchoolsController(new SchoolsService(ctx.uow, commandsProccessor));
      return controller.delete(ctx, next);
    });

  return schoolRoutes;
};