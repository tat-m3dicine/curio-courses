import KoaRoute from 'koa-tree-router';
import Koa from 'koa';
import { CoursesService } from '../services/CoursesService';
import { CoursesController } from '../controllers/CoursesController';
import { UpdatesProcessor } from '../services/processors/UpdatesProcessor';
import { CommandsProcessor } from '@saal-oryx/event-sourcing';

export default (commandsProccessor: CommandsProcessor, updatesProcessor: UpdatesProcessor) => {

  const coursesRoutes = new KoaRoute();

  coursesRoutes
    .get('/:schoolId/courses', (ctx: Koa.Context) => {
      const controller = new CoursesController(new CoursesService(ctx.uow, commandsProccessor, updatesProcessor));
      return controller.listWithSections(ctx);
    })
    .get('/:schoolId/courses/:courseId', (ctx: Koa.Context) => {
      const controller = new CoursesController(new CoursesService(ctx.uow, commandsProccessor, updatesProcessor));
      return controller.getById(ctx);
    })
    .post('/:schoolId/sections/:sectionId/courses', (ctx: Koa.Context) => {
      const controller = new CoursesController(new CoursesService(ctx.uow, commandsProccessor, updatesProcessor));
      return controller.create(ctx);
    })
    .get('/:schoolId/sections/:sectionId/courses', (ctx: Koa.Context) => {
      const controller = new CoursesController(new CoursesService(ctx.uow, commandsProccessor, updatesProcessor));
      return controller.list(ctx);
    })
    .get('/:schoolId/sections/:sectionId/courses/:courseId', (ctx: Koa.Context) => {
      const controller = new CoursesController(new CoursesService(ctx.uow, commandsProccessor, updatesProcessor));
      return controller.get(ctx);
    })
    .patch('/:schoolId/sections/:sectionId/courses/:courseId', (ctx: Koa.Context) => {
      const controller = new CoursesController(new CoursesService(ctx.uow, commandsProccessor, updatesProcessor));
      return controller.update(ctx);
    })
    .delete('/:schoolId/sections/:sectionId/courses/:courseId', (ctx: Koa.Context) => {
      const controller = new CoursesController(new CoursesService(ctx.uow, commandsProccessor, updatesProcessor));
      return controller.delete(ctx);
    })
    .post('/:schoolId/sections/:sectionId/courses/:courseId/enroll/students/:userId', (ctx: Koa.Context) => {
      const controller = new CoursesController(new CoursesService(ctx.uow, commandsProccessor, updatesProcessor));
      return controller.enrollStudent(ctx);
    })
    .post('/:schoolId/sections/:sectionId/courses/:courseId/drop/students/:userId', (ctx: Koa.Context) => {
      const controller = new CoursesController(new CoursesService(ctx.uow, commandsProccessor, updatesProcessor));
      return controller.dropStudent(ctx);
    })
    .post('/:schoolId/sections/:sectionId/courses/:courseId/enroll/teachers/:userId', (ctx: Koa.Context) => {
      const controller = new CoursesController(new CoursesService(ctx.uow, commandsProccessor, updatesProcessor));
      return controller.enrollTeacher(ctx);
    })
    .post('/:schoolId/sections/:sectionId/courses/:courseId/drop/teachers/:userId', (ctx: Koa.Context) => {
      const controller = new CoursesController(new CoursesService(ctx.uow, commandsProccessor, updatesProcessor));
      return controller.dropTeacher(ctx);
    })
    .post('/:schoolId/sections/:sectionId/courses/:courseId/enable/students/:userId', (ctx: Koa.Context) => {
      const controller = new CoursesController(new CoursesService(ctx.uow, commandsProccessor, updatesProcessor));
      return controller.enableStudent(ctx);
    })
    .post('/:schoolId/sections/:sectionId/courses/:courseId/disable/students/:userId', (ctx: Koa.Context) => {
      const controller = new CoursesController(new CoursesService(ctx.uow, commandsProccessor, updatesProcessor));
      return controller.disableStudent(ctx);
    })
    .post('/:schoolId/sections/:sectionId/courses/:courseId/enroll/students', (ctx: Koa.Context) => {
      const controller = new CoursesController(new CoursesService(ctx.uow, commandsProccessor, updatesProcessor));
      return controller.enrollStudents(ctx);
    })
    .post('/:schoolId/sections/:sectionId/courses/:courseId/enroll/teachers', (ctx: Koa.Context) => {
      const controller = new CoursesController(new CoursesService(ctx.uow, commandsProccessor, updatesProcessor));
      return controller.enrollTeachers(ctx);
    })
    .post('/:schoolId/sections/:sectionId/courses/:courseId/drop/students', (ctx: Koa.Context) => {
      const controller = new CoursesController(new CoursesService(ctx.uow, commandsProccessor, updatesProcessor));
      return controller.dropStudents(ctx);
    })
    .post('/:schoolId/sections/:sectionId/courses/:courseId/drop/teachers', (ctx: Koa.Context) => {
      const controller = new CoursesController(new CoursesService(ctx.uow, commandsProccessor, updatesProcessor));
      return controller.dropTeachers(ctx);
    })
    .post('/:schoolId/sections/:sectionId/students/enroll/courses', (ctx: Koa.Context) => {
      const controller = new CoursesController(new CoursesService(ctx.uow, commandsProccessor, updatesProcessor));
      return controller.enrollStudentsInCourses(ctx);
    })
    .post('/:schoolId/sections/:sectionId/students/drop/courses', (ctx: Koa.Context) => {
      const controller = new CoursesController(new CoursesService(ctx.uow, commandsProccessor, updatesProcessor));
      return controller.dropStudentsInCourses(ctx);
    })
    .post('/:schoolId/sections/:sectionId/students/switch/courses', (ctx: Koa.Context) => {
      const controller = new CoursesController(new CoursesService(ctx.uow, commandsProccessor, updatesProcessor));
      return controller.switchStudentsCourses(ctx);
    })
    .post('/:schoolId/sections/:sectionId/teachers/enroll/courses', (ctx: Koa.Context) => {
      const controller = new CoursesController(new CoursesService(ctx.uow, commandsProccessor, updatesProcessor));
      return controller.enrollTeachersInCourses(ctx);
    })
    .post('/:schoolId/sections/:sectionId/teachers/drop/courses', (ctx: Koa.Context) => {
      const controller = new CoursesController(new CoursesService(ctx.uow, commandsProccessor, updatesProcessor));
      return controller.dropTeachersInCourses(ctx);
    })
    .post('/:schoolId/sections/:sectionId/teachers/switch/courses', (ctx: Koa.Context) => {
      const controller = new CoursesController(new CoursesService(ctx.uow, commandsProccessor, updatesProcessor));
      return controller.switchTeachersCourses(ctx);
    });
  return coursesRoutes;
};