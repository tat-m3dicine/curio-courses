import KoaRoute from 'koa-tree-router';
import Koa from 'koa';
import { SchoolsController } from '../controllers/SchoolsController';
import { SchoolsService } from '../services/SchoolsService';
import { Role } from '../models/Role';
import { CommandsProcessor, KafkaService } from '@saal-oryx/event-sourcing';

export default (commandsProccessor: CommandsProcessor, kafkaService: KafkaService) => {
  const schoolRoutes = new KoaRoute();
  schoolRoutes
    .post('/', (ctx: Koa.Context) => {
      const controller = new SchoolsController(new SchoolsService(ctx.uow, commandsProccessor, kafkaService));
      return controller.create(ctx);
    })
    .post('/:schoolId/license', (ctx: Koa.Context) => {
      const controller = new SchoolsController(new SchoolsService(ctx.uow, commandsProccessor, kafkaService));
      return controller.addLicense(ctx);
    })
    .post('/:schoolId/academics', (ctx: Koa.Context) => {
      const controller = new SchoolsController(new SchoolsService(ctx.uow, commandsProccessor, kafkaService));
      return controller.updateAcademics(ctx);
    })
    .delete('/:schoolId/academics/:academicTermId', (ctx: Koa.Context) => {
      const controller = new SchoolsController(new SchoolsService(ctx.uow, commandsProccessor, kafkaService));
      return controller.deleteAcademics(ctx);
    })
    .post('/:schoolId/users/update', (ctx: Koa.Context) => {
      const controller = new SchoolsController(new SchoolsService(ctx.uow, commandsProccessor, kafkaService));
      return controller.updateUsers(ctx);
    })
    .post('/:schoolId/users/delete', (ctx: Koa.Context) => {
      const controller = new SchoolsController(new SchoolsService(ctx.uow, commandsProccessor, kafkaService));
      return controller.deleteUsers(ctx);
    })
    .get('/', (ctx: Koa.Context) => {
      const controller = new SchoolsController(new SchoolsService(ctx.uow, commandsProccessor, kafkaService));
      return controller.list(ctx);
    })
    .get('/:schoolId', (ctx: Koa.Context) => {
      const controller = new SchoolsController(new SchoolsService(ctx.uow, commandsProccessor, kafkaService));
      return controller.get(ctx);
    })
    .put('/:schoolId', (ctx: Koa.Context) => {
      const controller = new SchoolsController(new SchoolsService(ctx.uow, commandsProccessor, kafkaService));
      return controller.update(ctx);
    })
    .patch('/:schoolId', (ctx: Koa.Context) => {
      const controller = new SchoolsController(new SchoolsService(ctx.uow, commandsProccessor, kafkaService));
      return controller.patch(ctx);
    })
    .delete('/:schoolId', (ctx: Koa.Context) => {
      const controller = new SchoolsController(new SchoolsService(ctx.uow, commandsProccessor, kafkaService));
      return controller.delete(ctx);
    })
    .get('/:schoolId/students', (ctx: Koa.Context) => {
      const controller = new SchoolsController(new SchoolsService(ctx.uow, commandsProccessor, kafkaService));
      return controller.getStudents(ctx);
    })
    .get('/:schoolId/teachers', (ctx: Koa.Context) => {
      const controller = new SchoolsController(new SchoolsService(ctx.uow, commandsProccessor, kafkaService));
      return controller.getTeachers(ctx);
    })

    .post('/:schoolId/students/approve', (ctx: Koa.Context) => registerUsers(ctx, 'approve', Role.student))
    .post('/:schoolId/students/reject', (ctx: Koa.Context) => registerUsers(ctx, 'reject', Role.student))
    .post('/:schoolId/students/withdraw', (ctx: Koa.Context) => registerUsers(ctx, 'withdraw', Role.student))

    .post('/:schoolId/teachers/reject', (ctx: Koa.Context) => registerUsers(ctx, 'reject', Role.teacher))
    .post('/:schoolId/teachers/approve', (ctx: Koa.Context) => registerUsers(ctx, 'approve', Role.teacher))
    .post('/:schoolId/teachers/withdraw', (ctx: Koa.Context) => registerUsers(ctx, 'withdraw', Role.teacher));

  const registerUsers = (ctx: Koa.Context, action: string, role: Role) => {
    const controller = new SchoolsController(new SchoolsService(ctx.uow, commandsProccessor, kafkaService));
    ctx.params.action = action;
    ctx.params.role = role;
    return controller.registerUsers(ctx);
  };

  return schoolRoutes;
};