import KoaRoute from 'koa-tree-router';
import Koa from 'koa';
import { CoursesService } from '../services/CoursesService';
import { CoursesController } from '../controllers/CoursesController';
import { UnauthorizedError } from '../exceptions/UnauthorizedError';
import { CommandsProcessor } from '../services/processors/CommandsProcessor';
import { UpdatesProcessor } from '../services/processors/UpdatesProcessor';


export default (commandsProccessor: CommandsProcessor, updatesProcessor: UpdatesProcessor) => {

  const meRoutes = new KoaRoute();

  meRoutes
    .get('/courses', (ctx: Koa.Context, next: () => void) => {
      if (!ctx.user) throw new UnauthorizedError();
      const controller = new CoursesController(new CoursesService(ctx.uow, commandsProccessor, updatesProcessor));
      return controller.getActiveCourses(ctx, next);
    });
  return meRoutes;
};