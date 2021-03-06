import KoaRoute from 'koa-tree-router';
import Koa from 'koa';
import { SectionsService } from '../services/SectionsService';
import { SectionsController } from '../controllers/SectionsController';
import { CommandsProcessor } from '@saal-oryx/event-sourcing';
import { UpdatesProcessor } from '../services/processors/UpdatesProcessor';


export default (commandsProccessor: CommandsProcessor, updatesProcessor: UpdatesProcessor) => {

  const sectionsRoutes = new KoaRoute();

  sectionsRoutes
    .post('/:schoolId/sections', (ctx: Koa.Context, next: () => void) => {
      const controller = new SectionsController(new SectionsService(ctx.uow, commandsProccessor, updatesProcessor));
      return controller.create(ctx, next);
    })
    .get('/:schoolId/sections', (ctx: Koa.Context, next: () => void) => {
      const controller = new SectionsController(new SectionsService(ctx.uow, commandsProccessor, updatesProcessor));
      return controller.list(ctx, next);
    })
    .get('/:schoolId/sections/:sectionId', (ctx: Koa.Context, next: () => void) => {
      const controller = new SectionsController(new SectionsService(ctx.uow, commandsProccessor, updatesProcessor));
      return controller.get(ctx, next);
    })
    .delete('/:schoolId/sections/:sectionId', (ctx: Koa.Context, next: () => void) => {
      const controller = new SectionsController(new SectionsService(ctx.uow, commandsProccessor, updatesProcessor));
      return controller.delete(ctx, next);
    })
    .get('/:schoolId/sections/:sectionId/students', (ctx: Koa.Context, next: () => void) => {
      const controller = new SectionsController(new SectionsService(ctx.uow, commandsProccessor, updatesProcessor));
      return controller.getStudents(ctx, next);
    })
    .post('/:schoolId/sections/:sectionId/students/register', (ctx: Koa.Context, next: () => void) => {
      const controller = new SectionsController(new SectionsService(ctx.uow, commandsProccessor, updatesProcessor));
      return controller.registerStudents(ctx, next);
    })
    .post('/:schoolId/sections/:sectionId/students/remove', (ctx: Koa.Context, next: () => void) => {
      const controller = new SectionsController(new SectionsService(ctx.uow, commandsProccessor, updatesProcessor));
      return controller.removeStudents(ctx, next);
    });
  return sectionsRoutes;
};