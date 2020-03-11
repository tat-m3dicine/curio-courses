import KoaRoute from 'koa-tree-router';
import Koa from 'koa';
import { SectionsService } from '../services/SectionsService';
import { SectionsController } from '../controllers/SectionsController';
import { CommandsProcessor } from '@saal-oryx/event-sourcing';


export default (commandsProccessor: CommandsProcessor) => {

  const sectionsRoutes = new KoaRoute();

  sectionsRoutes
    .post('/:schoolId/sections', (ctx: Koa.Context) => {
      const controller = new SectionsController(new SectionsService(ctx.uow, commandsProccessor));
      return controller.create(ctx);
    })
    .get('/:schoolId/sections', (ctx: Koa.Context) => {
      const controller = new SectionsController(new SectionsService(ctx.uow, commandsProccessor));
      return controller.list(ctx);
    })
    .get('/:schoolId/sections/:sectionId', (ctx: Koa.Context) => {
      const controller = new SectionsController(new SectionsService(ctx.uow, commandsProccessor));
      return controller.get(ctx);
    })
    .delete('/:schoolId/sections/:sectionId', (ctx: Koa.Context) => {
      const controller = new SectionsController(new SectionsService(ctx.uow, commandsProccessor));
      return controller.delete(ctx);
    })
    .get('/:schoolId/sections/:sectionId/students', (ctx: Koa.Context) => {
      const controller = new SectionsController(new SectionsService(ctx.uow, commandsProccessor));
      return controller.getStudents(ctx);
    })
    .post('/:schoolId/sections/:sectionId/students/register', (ctx: Koa.Context) => {
      const controller = new SectionsController(new SectionsService(ctx.uow, commandsProccessor));
      return controller.registerStudents(ctx);
    })
    .post('/:schoolId/sections/:sectionId/students/remove', (ctx: Koa.Context) => {
      const controller = new SectionsController(new SectionsService(ctx.uow, commandsProccessor));
      return controller.removeStudents(ctx);
    });
  return sectionsRoutes;
};