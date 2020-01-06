import KoaRoute from 'koa-tree-router';
import Koa from 'koa';
import { CoursesService } from '../services/CoursesService';
import { CoursesController } from '../controllers/CoursesController';
import { CommandsProcessor } from '../services/CommandsProcessor';
import { UpdatesProcessor } from '../services/UpdatesProcessor';


export default (commandsProccessor: CommandsProcessor, updatesProcessor: UpdatesProcessor) => {

  const coursesRoutes = new KoaRoute();

  coursesRoutes
    .get('/:schoolId/courses', (ctx: Koa.Context, next: () => void) => {
      const controller = new CoursesController(new CoursesService(ctx.uow, commandsProccessor, updatesProcessor));
      return controller.listWithSections(ctx, next);
    })
    .get('/:schoolId/courses/:courseId', (ctx: Koa.Context, next: () => void) => {
      const controller = new CoursesController(new CoursesService(ctx.uow, commandsProccessor, updatesProcessor));
      return controller.getById(ctx, next);
    })
    .post('/:schoolId/sections/:sectionId/courses', (ctx: Koa.Context, next: () => void) => {
      const controller = new CoursesController(new CoursesService(ctx.uow, commandsProccessor, updatesProcessor));
      return controller.create(ctx, next);
    })
    .get('/:schoolId/sections/:sectionId/courses', (ctx: Koa.Context, next: () => void) => {
      const controller = new CoursesController(new CoursesService(ctx.uow, commandsProccessor, updatesProcessor));
      return controller.list(ctx, next);
    })
    .get('/:schoolId/sections/:sectionId/courses/:courseId', (ctx: Koa.Context, next: () => void) => {
      const controller = new CoursesController(new CoursesService(ctx.uow, commandsProccessor, updatesProcessor));
      return controller.get(ctx, next);
    })
    .patch('/:schoolId/sections/:sectionId/courses/:courseId', (ctx: Koa.Context, next: () => void) => {
      const controller = new CoursesController(new CoursesService(ctx.uow, commandsProccessor, updatesProcessor));
      return controller.update(ctx, next);
    })
    .delete('/:schoolId/sections/:sectionId/courses/:courseId', (ctx: Koa.Context, next: () => void) => {
      const controller = new CoursesController(new CoursesService(ctx.uow, commandsProccessor, updatesProcessor));
      return controller.delete(ctx, next);
    })
    .post('/:schoolId/sections/:sectionId/courses/:courseId/enroll/students/:userId', (ctx: Koa.Context, next: () => void) => {
      const controller = new CoursesController(new CoursesService(ctx.uow, commandsProccessor, updatesProcessor));
      return controller.enrollStudent(ctx, next);
    })
    .post('/:schoolId/sections/:sectionId/courses/:courseId/drop/students/:userId', (ctx: Koa.Context, next: () => void) => {
      const controller = new CoursesController(new CoursesService(ctx.uow, commandsProccessor, updatesProcessor));
      return controller.dropStudent(ctx, next);
    })
    .post('/:schoolId/sections/:sectionId/courses/:courseId/enroll/teachers/:userId', (ctx: Koa.Context, next: () => void) => {
      const controller = new CoursesController(new CoursesService(ctx.uow, commandsProccessor, updatesProcessor));
      return controller.enrollTeacher(ctx, next);
    })
    .post('/:schoolId/sections/:sectionId/courses/:courseId/drop/teachers/:userId', (ctx: Koa.Context, next: () => void) => {
      const controller = new CoursesController(new CoursesService(ctx.uow, commandsProccessor, updatesProcessor));
      return controller.dropTeacher(ctx, next);
    })
    .post('/:schoolId/sections/:sectionId/courses/:courseId/enable/students/:userId', (ctx: Koa.Context, next: () => void) => {
      const controller = new CoursesController(new CoursesService(ctx.uow, commandsProccessor, updatesProcessor));
      return controller.enableStudent(ctx, next);
    })
    .post('/:schoolId/sections/:sectionId/courses/:courseId/disable/students/:userId', (ctx: Koa.Context, next: () => void) => {
      const controller = new CoursesController(new CoursesService(ctx.uow, commandsProccessor, updatesProcessor));
      return controller.disableStudent(ctx, next);
    })
    .post('/:schoolId/sections/:sectionId/courses/:courseId/enroll/students', (ctx: Koa.Context, next: () => void) => {
      const controller = new CoursesController(new CoursesService(ctx.uow, commandsProccessor, updatesProcessor));
      return controller.enrollStudents(ctx, next);
    })
    .post('/:schoolId/sections/:sectionId/courses/:courseId/enroll/teachers', (ctx: Koa.Context, next: () => void) => {
      const controller = new CoursesController(new CoursesService(ctx.uow, commandsProccessor, updatesProcessor));
      return controller.enrollTeachers(ctx, next);
    })
    .post('/:schoolId/sections/:sectionId/courses/:courseId/drop/students', (ctx: Koa.Context, next: () => void) => {
      const controller = new CoursesController(new CoursesService(ctx.uow, commandsProccessor, updatesProcessor));
      return controller.dropStudents(ctx, next);
    })
    .post('/:schoolId/sections/:sectionId/courses/:courseId/drop/teachers', (ctx: Koa.Context, next: () => void) => {
      const controller = new CoursesController(new CoursesService(ctx.uow, commandsProccessor, updatesProcessor));
      return controller.dropTeachers(ctx, next);
    })
    .post('/:schoolId/sections/:sectionId/students/enroll/courses', (ctx: Koa.Context, next: () => void) => {
      const controller = new CoursesController(new CoursesService(ctx.uow, commandsProccessor, updatesProcessor));
      return controller.enrollStudentsInCourses(ctx, next);
    })
    .post('/:schoolId/sections/:sectionId/students/drop/courses', (ctx: Koa.Context, next: () => void) => {
      const controller = new CoursesController(new CoursesService(ctx.uow, commandsProccessor, updatesProcessor));
      return controller.dropStudentsInCourses(ctx, next);
    })
    .post('/:schoolId/sections/:sectionId/students/switch/courses', (ctx: Koa.Context, next: () => void) => {
      const controller = new CoursesController(new CoursesService(ctx.uow, commandsProccessor, updatesProcessor));
      return controller.switchStudentsCourses(ctx, next);
    })
    .post('/:schoolId/sections/:sectionId/teachers/enroll/courses', (ctx: Koa.Context, next: () => void) => {
      const controller = new CoursesController(new CoursesService(ctx.uow, commandsProccessor, updatesProcessor));
      return controller.enrollTeachersInCourses(ctx, next);
    })
    .post('/:schoolId/sections/:sectionId/teachers/drop/courses', (ctx: Koa.Context, next: () => void) => {
      const controller = new CoursesController(new CoursesService(ctx.uow, commandsProccessor, updatesProcessor));
      return controller.dropTeachersInCourses(ctx, next);
    })
    .post('/:schoolId/sections/:sectionId/teachers/switch/courses', (ctx: Koa.Context, next: () => void) => {
      const controller = new CoursesController(new CoursesService(ctx.uow, commandsProccessor, updatesProcessor));
      return controller.switchTeachersCourses(ctx, next);
    });
  return coursesRoutes;
};