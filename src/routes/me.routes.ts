import KoaRoute from 'koa-tree-router';
import Koa from 'koa';
import { CoursesService } from '../services/CoursesService';
import { CoursesController } from '../controllers/CoursesController';
import { UnauthorizedError } from '../exceptions/UnauthorizedError';
import { CommandsProcessor } from '@saal-oryx/event-sourcing';
import { UpdatesProcessor } from '../services/processors/UpdatesProcessor';
import { Role } from '../models/Role';

export default (commandsProccessor: CommandsProcessor, updatesProcessor: UpdatesProcessor) => {

  const meRoutes = new KoaRoute();

  meRoutes
    .get('/courses', (ctx: Koa.Context) => {
      if (!ctx.user) throw new UnauthorizedError();
      const controller = new CoursesController(new CoursesService(ctx.uow, commandsProccessor, updatesProcessor));
      return controller.getActiveCourses(ctx);
    })
    .post('/students/repair', (ctx: Koa.Context) => {
      const controller = new CoursesController(new CoursesService(ctx.uow, commandsProccessor, updatesProcessor));
      ctx.params.role = Role.student;
      return controller.repairUsers(ctx);
    })
    .post('/teachers/repair', (ctx: Koa.Context) => {
      const controller = new CoursesController(new CoursesService(ctx.uow, commandsProccessor, updatesProcessor));
      ctx.params.role = Role.teacher;
      return controller.repairUsers(ctx);
    });
  return meRoutes;
};