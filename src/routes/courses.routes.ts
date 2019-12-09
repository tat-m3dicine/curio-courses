import KoaRoute from 'koa-tree-router';
import Koa from 'koa';
import { CoursesService } from '../services/CoursesService';
import { CoursesController } from '../controllers/CoursesController';
import { CommandsProcessor } from '../services/CommandsProcessor';


export default (commandsProccessor: CommandsProcessor) => {

  const coursesRoutes = new KoaRoute();

  coursesRoutes
    .post('/:schoolId/sections/:sectionId/courses', (ctx: Koa.Context, next: () => void) => {
      const controller = new CoursesController(new CoursesService(ctx.uow, commandsProccessor));
      return controller.create(ctx, next);
    })
    .get('/:schoolId/sections/:sectionId/courses', (ctx: Koa.Context, next: () => void) => {
      const controller = new CoursesController(new CoursesService(ctx.uow, commandsProccessor));
      return controller.list(ctx, next);
    })
    .get('/:schoolId/sections/:sectionId/courses/:courseId', (ctx: Koa.Context, next: () => void) => {
      const controller = new CoursesController(new CoursesService(ctx.uow, commandsProccessor));
      return controller.get(ctx, next);
    })
    .patch('/:schoolId/sections/:sectionId/courses/:courseId', (ctx: Koa.Context, next: () => void) => {
      const controller = new CoursesController(new CoursesService(ctx.uow, commandsProccessor));
      return controller.update(ctx, next);
    })
    .delete('/:schoolId/sections/:sectionId/courses/:courseId', (ctx: Koa.Context, next: () => void) => {
      const controller = new CoursesController(new CoursesService(ctx.uow, commandsProccessor));
      return controller.delete(ctx, next);
    })
    .post('/:schoolId/sections/:sectionId/courses/:courseId/enroll/students/:userId', (ctx: Koa.Context, next: () => void) => {
      const controller = new CoursesController(new CoursesService(ctx.uow, commandsProccessor));
      return controller.enrollStudent(ctx, next);
    })
    .post('/:schoolId/sections/:sectionId/courses/:courseId/drop/students/:userId', (ctx: Koa.Context, next: () => void) => {
      const controller = new CoursesController(new CoursesService(ctx.uow, commandsProccessor));
      return controller.dropStudent(ctx, next);
    })
    .post('/:schoolId/sections/:sectionId/courses/:courseId/enroll/teachers/:userId', (ctx: Koa.Context, next: () => void) => {
      const controller = new CoursesController(new CoursesService(ctx.uow, commandsProccessor));
      return controller.enrollTeacher(ctx, next);
    })
    .post('/:schoolId/sections/:sectionId/courses/:courseId/drop/teachers/:userId', (ctx: Koa.Context, next: () => void) => {
      const controller = new CoursesController(new CoursesService(ctx.uow, commandsProccessor));
      return controller.dropTeacher(ctx, next);
    })
    .post('/:schoolId/sections/:sectionId/courses/:courseId/enroll/students', (ctx: Koa.Context, next: () => void) => {
      const controller = new CoursesController(new CoursesService(ctx.uow, commandsProccessor));
      return controller.enrollStudents(ctx, next);
    })
    .post('/:schoolId/sections/:sectionId/courses/:courseId/enroll/teachers', (ctx: Koa.Context, next: () => void) => {
      const controller = new CoursesController(new CoursesService(ctx.uow, commandsProccessor));
      return controller.enrollTeachers(ctx, next);
    })
    .post('/:schoolId/sections/:sectionId/courses/:courseId/drop/students', (ctx: Koa.Context, next: () => void) => {
      const controller = new CoursesController(new CoursesService(ctx.uow, commandsProccessor));
      return controller.dropStudents(ctx, next);
    })
    .post('/:schoolId/sections/:sectionId/courses/:courseId/drop/teachers', (ctx: Koa.Context, next: () => void) => {
      const controller = new CoursesController(new CoursesService(ctx.uow, commandsProccessor));
      return controller.dropTeachers(ctx, next);
    });
  // .post('/:schoolId/sections/:sectionId/students/enroll/courses', (ctx: Koa.Context, next: () => void) => {
  //   const controller = new CoursesController(new CoursesService(ctx.uow, commandsProccessor));
  //   return controller.enrollStudentsInCourses(ctx, next);
  // })
  // .post('/:schoolId/sections/:sectionId/students/drop/courses', (ctx: Koa.Context, next: () => void) => {
  //   const controller = new CoursesController(new CoursesService(ctx.uow, commandsProccessor));
  //   return controller.dropStudentsInCourses(ctx, next);
  // })
  // .post('/:schoolId/sections/:sectionId/students/switch/courses', (ctx: Koa.Context, next: () => void) => {
  //   const controller = new CoursesController(new CoursesService(ctx.uow, commandsProccessor));
  //   return controller.switchStudentsCourses(ctx, next);
  // });
  return coursesRoutes;
};