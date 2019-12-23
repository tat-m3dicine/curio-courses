import KoaRoute from 'koa-tree-router';
import Koa from 'koa';
import { SchoolsController } from '../controllers/SchoolsController';
import { SchoolsService } from '../services/SchoolsService';
import { CommandsProcessor } from '../services/CommandsProcessor';
import { Role } from '../models/Role';
import { KafkaService } from '../services/KafkaService';

export default (commandsProccessor: CommandsProcessor, kafkaService: KafkaService) => {
  const schoolRoutes = new KoaRoute();
  schoolRoutes
    .post('/', (ctx: Koa.Context, next: () => void) => {
      const controller = new SchoolsController(new SchoolsService(ctx.uow, commandsProccessor, kafkaService));
      return controller.create(ctx, next);
    })
    .post('/:schoolId/license', (ctx: Koa.Context, next: () => void) => {
      const controller = new SchoolsController(new SchoolsService(ctx.uow, commandsProccessor, kafkaService));
      return controller.addLicense(ctx, next);
    })
    .post('/:schoolId/academics', (ctx: Koa.Context, next: () => void) => {
      const controller = new SchoolsController(new SchoolsService(ctx.uow, commandsProccessor, kafkaService));
      return controller.updateAcademics(ctx, next);
    })
    .delete('/:schoolId/academics/:academicTermId', (ctx: Koa.Context, next: () => void) => {
      const controller = new SchoolsController(new SchoolsService(ctx.uow, commandsProccessor, kafkaService));
      return controller.deleteAcademics(ctx, next);
    })
    .post('/:schoolId/users/update', (ctx: Koa.Context, next: () => void) => {
      const controller = new SchoolsController(new SchoolsService(ctx.uow, commandsProccessor, kafkaService));
      return controller.updateUsers(ctx, next);
    })
    .post('/:schoolId/users/delete', (ctx: Koa.Context, next: () => void) => {
      const controller = new SchoolsController(new SchoolsService(ctx.uow, commandsProccessor, kafkaService));
      return controller.deleteUsers(ctx, next);
    })
    .get('/', (ctx: Koa.Context, next: () => void) => {
      const controller = new SchoolsController(new SchoolsService(ctx.uow, commandsProccessor, kafkaService));
      return controller.list(ctx, next);
    })
    .get('/:schoolId', (ctx: Koa.Context, next: () => void) => {
      const controller = new SchoolsController(new SchoolsService(ctx.uow, commandsProccessor, kafkaService));
      return controller.get(ctx, next);
    })
    .put('/:schoolId', (ctx: Koa.Context, next: () => void) => {
      const controller = new SchoolsController(new SchoolsService(ctx.uow, commandsProccessor, kafkaService));
      return controller.update(ctx, next);
    })
    .patch('/:schoolId', (ctx: Koa.Context, next: () => void) => {
      const controller = new SchoolsController(new SchoolsService(ctx.uow, commandsProccessor, kafkaService));
      return controller.patch(ctx, next);
    })
    .delete('/:schoolId', (ctx: Koa.Context, next: () => void) => {
      const controller = new SchoolsController(new SchoolsService(ctx.uow, commandsProccessor, kafkaService));
      return controller.delete(ctx, next);
    })
    .get('/:schoolId/students', (ctx: Koa.Context, next: () => void) => {
      const controller = new SchoolsController(new SchoolsService(ctx.uow, commandsProccessor, kafkaService));
      return controller.getStudents(ctx, next);
    })
    .get('/:schoolId/teachers', (ctx: Koa.Context, next: () => void) => {
      const controller = new SchoolsController(new SchoolsService(ctx.uow, commandsProccessor, kafkaService));
      return controller.getTeachers(ctx, next);
    })

    .post('/:schoolId/students/approve', (ctx: Koa.Context, next: () => void) => registerUsers(ctx, next, 'approve', Role.student))
    .post('/:schoolId/students/reject', (ctx: Koa.Context, next: () => void) => registerUsers(ctx, next, 'reject', Role.student))
    .post('/:schoolId/students/withdraw', (ctx: Koa.Context, next: () => void) => registerUsers(ctx, next, 'withdraw', Role.student))

    .post('/:schoolId/teachers/reject', (ctx: Koa.Context, next: () => void) => registerUsers(ctx, next, 'reject', Role.teacher))
    .post('/:schoolId/teachers/approve', (ctx: Koa.Context, next: () => void) => registerUsers(ctx, next, 'approve', Role.teacher))
    .post('/:schoolId/teachers/withdraw', (ctx: Koa.Context, next: () => void) => registerUsers(ctx, next, 'withdraw', Role.teacher));

  const registerUsers = (ctx: Koa.Context, next: () => void, action: string, role: Role) => {
    const controller = new SchoolsController(new SchoolsService(ctx.uow, commandsProccessor, kafkaService));
    ctx.params.action = action;
    ctx.params.role = role;
    return controller.registerUsers(ctx, next);
  }

  return schoolRoutes;
};