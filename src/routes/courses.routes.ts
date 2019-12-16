import KoaRoute from 'koa-tree-router';
import Koa from 'koa';
import { CoursesService } from '../services/CoursesService';
import { CoursesController } from '../controllers/CoursesController';
import { CommandsProcessor } from '../services/CommandsProcessor';
import { KafkaService } from '../services/KafkaService';


export default (commandsProccessor: CommandsProcessor, kafkaService: KafkaService) => {

  const coursesRoutes = new KoaRoute();

  coursesRoutes
    .post('/:schoolId/sections/:sectionId/courses', (ctx: Koa.Context, next: () => void) => {
      const controller = new CoursesController(new CoursesService(ctx.uow, commandsProccessor, kafkaService));
      return controller.create(ctx, next);
    })
    .get('/:schoolId/sections/:sectionId/courses', (ctx: Koa.Context, next: () => void) => {
      const controller = new CoursesController(new CoursesService(ctx.uow, commandsProccessor, kafkaService));
      return controller.list(ctx, next);
    })
    .get('/:schoolId/sections/:sectionId/courses/:courseId', (ctx: Koa.Context, next: () => void) => {
      const controller = new CoursesController(new CoursesService(ctx.uow, commandsProccessor, kafkaService));
      return controller.get(ctx, next);
    })
    .patch('/:schoolId/sections/:sectionId/courses/:courseId', (ctx: Koa.Context, next: () => void) => {
      const controller = new CoursesController(new CoursesService(ctx.uow, commandsProccessor, kafkaService));
      return controller.update(ctx, next);
    })
    .delete('/:schoolId/sections/:sectionId/courses/:courseId', (ctx: Koa.Context, next: () => void) => {
      const controller = new CoursesController(new CoursesService(ctx.uow, commandsProccessor, kafkaService));
      return controller.delete(ctx, next);
    })
    .post('/:schoolId/sections/:sectionId/courses/:courseId/enroll/students/:userId', (ctx: Koa.Context, next: () => void) => {
      const controller = new CoursesController(new CoursesService(ctx.uow, commandsProccessor, kafkaService));
      return controller.enrollStudent(ctx, next);
    })
    .post('/:schoolId/sections/:sectionId/courses/:courseId/drop/students/:userId', (ctx: Koa.Context, next: () => void) => {
      const controller = new CoursesController(new CoursesService(ctx.uow, commandsProccessor, kafkaService));
      return controller.dropStudent(ctx, next);
    })
    .post('/:schoolId/sections/:sectionId/courses/:courseId/enroll/teachers/:userId', (ctx: Koa.Context, next: () => void) => {
      const controller = new CoursesController(new CoursesService(ctx.uow, commandsProccessor, kafkaService));
      return controller.enrollTeacher(ctx, next);
    })
    .post('/:schoolId/sections/:sectionId/courses/:courseId/drop/teachers/:userId', (ctx: Koa.Context, next: () => void) => {
      const controller = new CoursesController(new CoursesService(ctx.uow, commandsProccessor, kafkaService));
      return controller.dropTeacher(ctx, next);
    })
    .post('/:schoolId/sections/:sectionId/courses/:courseId/enroll/students', (ctx: Koa.Context, next: () => void) => {
      const controller = new CoursesController(new CoursesService(ctx.uow, commandsProccessor, kafkaService));
      return controller.enrollStudents(ctx, next);
    })
    .post('/:schoolId/sections/:sectionId/courses/:courseId/enroll/teachers', (ctx: Koa.Context, next: () => void) => {
      const controller = new CoursesController(new CoursesService(ctx.uow, commandsProccessor, kafkaService));
      return controller.enrollTeachers(ctx, next);
    })
    .post('/:schoolId/sections/:sectionId/courses/:courseId/drop/students', (ctx: Koa.Context, next: () => void) => {
      const controller = new CoursesController(new CoursesService(ctx.uow, commandsProccessor, kafkaService));
      return controller.dropStudents(ctx, next);
    })
    .post('/:schoolId/sections/:sectionId/courses/:courseId/drop/teachers', (ctx: Koa.Context, next: () => void) => {
      const controller = new CoursesController(new CoursesService(ctx.uow, commandsProccessor, kafkaService));
      return controller.dropTeachers(ctx, next);
    })
    .post('/:schoolId/sections/:sectionId/students/enroll/courses', (ctx: Koa.Context, next: () => void) => {
      const controller = new CoursesController(new CoursesService(ctx.uow, commandsProccessor, kafkaService));
      return controller.enrollStudentsInCourses(ctx, next);
    })
    .post('/:schoolId/sections/:sectionId/students/drop/courses', (ctx: Koa.Context, next: () => void) => {
      const controller = new CoursesController(new CoursesService(ctx.uow, commandsProccessor, kafkaService));
      return controller.dropStudentsInCourses(ctx, next);
    })
    .post('/:schoolId/sections/:sectionId/students/switch/courses', (ctx: Koa.Context, next: () => void) => {
      const controller = new CoursesController(new CoursesService(ctx.uow, commandsProccessor, kafkaService));
      return controller.switchStudentsCourses(ctx, next);
    })
    .post('/:schoolId/sections/:sectionId/teachers/enroll/courses', (ctx: Koa.Context, next: () => void) => {
      const controller = new CoursesController(new CoursesService(ctx.uow, commandsProccessor, kafkaService));
      return controller.enrollTeachersInCourses(ctx, next);
    })
    .post('/:schoolId/sections/:sectionId/teachers/drop/courses', (ctx: Koa.Context, next: () => void) => {
      const controller = new CoursesController(new CoursesService(ctx.uow, commandsProccessor, kafkaService));
      return controller.dropTeachersInCourses(ctx, next);
    })
    .post('/:schoolId/sections/:sectionId/teachers/switch/courses', (ctx: Koa.Context, next: () => void) => {
      const controller = new CoursesController(new CoursesService(ctx.uow, commandsProccessor, kafkaService));
      return controller.switchTeachersCourses(ctx, next);
    });
  return coursesRoutes;
};