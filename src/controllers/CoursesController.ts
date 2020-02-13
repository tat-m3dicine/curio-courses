import 'koa-body';
import { Context } from 'koa';
import loggerFactory from '../utils/logging';
import { CoursesService } from '../services/CoursesService';
import { IPaging } from '@saal-oryx/unit-of-work';
import { NotFoundError } from '../exceptions/NotFoundError';
import { InvalidRequestError } from '../exceptions/InvalidRequestError';
import { IUserRequest } from '../models/requests/IUserRequest';
import validators from '../utils/validators';
import { Role } from '../models/Role';

const logger = loggerFactory.getLogger('CoursesController');

export class CoursesController {

  constructor(protected coursesService: CoursesService) {
  }

  async create(ctx: Context, next: () => void) {
    const { schoolId, sectionId } = ctx.params;
    const createObject = { ...ctx.request.body, schoolId, sectionId };
    const result = await this.coursesService.create(createObject, ctx.user);
    ctx.status = result.done ? 201 : 202;
    ctx.body = { ok: true, result: result.data };
    ctx.type = 'json';
  }

  async listWithSections(ctx: Context, next: () => void) {
    const { schoolId } = ctx.params;
    const result = await this.coursesService.listWithSections(schoolId, ctx.user);
    ctx.status = 200;
    ctx.body = result;
    ctx.type = 'json';
  }

  async list(ctx: Context, next: () => void) {
    const { schoolId, sectionId } = ctx.params;
    const result = await this.coursesService.list(schoolId, sectionId, this.extractPaging(ctx.query), ctx.user);
    ctx.status = 200;
    ctx.body = result;
    ctx.type = 'json';
  }

  async get(ctx: Context, next: () => void) {
    const { schoolId, sectionId, courseId } = ctx.params;
    const result = await this.coursesService.get(schoolId, sectionId, courseId, ctx.user);
    if (!result) throw new NotFoundError(`Couldn't find course '${courseId}' in section '${sectionId}'`);
    ctx.status = 200;
    ctx.body = result;
    ctx.type = 'json';
  }

  async getById(ctx: Context, next: () => void) {
    const { schoolId, courseId } = ctx.params;
    const { profiles } = ctx.query;
    const result = await this.coursesService.getById(schoolId, courseId, profiles, ctx.user);
    if (!result) throw new NotFoundError(`Couldn't find course '${courseId}'`);
    ctx.status = 200;
    ctx.body = result;
    ctx.type = 'json';
  }

  async update(ctx: Context, next: () => void) {
    const { schoolId, sectionId, courseId } = ctx.params;
    const result = await this.coursesService.update(schoolId, sectionId, courseId, ctx.request.body, ctx.user);
    ctx.status = result.done ? 201 : 202;
    ctx.body = { ok: true, result: result.data };
    ctx.type = 'json';
  }

  async delete(ctx: Context, next: () => void) {
    const { schoolId, sectionId, courseId } = ctx.params;
    await this.coursesService.delete(schoolId, sectionId, courseId, ctx.user);
    ctx.status = 200;
    ctx.body = { ok: true };
    ctx.type = 'json';
  }

  async enrollStudent(ctx: Context, next: () => void) {
    const { schoolId, sectionId, courseId, userId } = ctx.params;
    const requestParams = { schoolId, sectionId, courseId, usersIds: [userId], role: Role.student };
    const result = await this.coursesService.enrollStudents(requestParams, ctx.user);
    ctx.status = 200;
    ctx.body = { ok: true, result: result.data };
    ctx.type = 'json';
  }

  async enrollStudents(ctx: Context, next: () => void) {
    validators.validateStudentsList(ctx.request.body);
    const { schoolId, sectionId, courseId } = ctx.params;
    const requestParams = { schoolId, sectionId, courseId, usersIds: ctx.request.body.students, role: Role.student };
    const result = await this.coursesService.enrollStudents(requestParams, ctx.user);
    ctx.status = 200;
    ctx.body = { ok: true, result: result.data };
    ctx.type = 'json';
  }

  async dropStudent(ctx: Context, next: () => void) {
    const { schoolId, sectionId, courseId, userId } = ctx.params;
    const requestParams = { schoolId, sectionId, courseId, usersIds: [userId], role: Role.student };
    const result = await this.coursesService.dropStudents(requestParams, ctx.user);
    ctx.status = 200;
    ctx.body = { ok: true, result: result.data };
    ctx.type = 'json';
  }

  async dropStudents(ctx: Context, next: () => void) {
    validators.validateStudentsList(ctx.request.body);
    const { schoolId, sectionId, courseId } = ctx.params;
    const requestParams = { schoolId, sectionId, courseId, usersIds: ctx.request.body.students, role: Role.student };
    const result = await this.coursesService.dropStudents(requestParams, ctx.user);
    ctx.status = 200;
    ctx.body = { ok: true, result: result.data };
    ctx.type = 'json';
  }

  async enrollTeacher(ctx: Context, next: () => void) {
    const { schoolId, sectionId, courseId, userId } = ctx.params;
    const requestParams = { schoolId, sectionId, courseId, usersIds: [userId], role: Role.teacher };
    const result = await this.coursesService.enrollTeachers(requestParams, ctx.user);
    ctx.status = 200;
    ctx.body = { ok: true, result: result.data };
    ctx.type = 'json';
  }

  async enrollTeachers(ctx: Context, next: () => void) {
    validators.validateTeachersList(ctx.request.body);
    const { schoolId, sectionId, courseId } = ctx.params;
    const requestParams = { schoolId, sectionId, courseId, usersIds: ctx.request.body.teachers, role: Role.teacher };
    const result = await this.coursesService.enrollTeachers(requestParams, ctx.user);
    ctx.status = 200;
    ctx.body = { ok: true, result: result.data };
    ctx.type = 'json';
  }

  async dropTeacher(ctx: Context, next: () => void) {
    const { schoolId, sectionId, courseId, userId } = ctx.params;
    const requestParams = { schoolId, sectionId, courseId, usersIds: [userId], role: Role.teacher };
    const result = await this.coursesService.dropTeachers(requestParams, ctx.user);
    ctx.status = 200;
    ctx.body = { ok: true, result: result.data };
    ctx.type = 'json';
  }

  async dropTeachers(ctx: Context, next: () => void) {
    validators.validateTeachersList(ctx.request.body);
    const { schoolId, sectionId, courseId } = ctx.params;
    const requestParams = { schoolId, sectionId, courseId, usersIds: ctx.request.body.teachers, role: Role.teacher };
    const result = await this.coursesService.dropTeachers(requestParams, ctx.user);
    ctx.status = 200;
    ctx.body = { ok: true, result: result.data };
    ctx.type = 'json';
  }

  async enrollStudentsInCourses(ctx: Context, next: () => void) {
    validators.validateStudentsObjects(ctx.request.body);
    const { schoolId, sectionId } = ctx.params;
    const requestParamsArray = this.getParamsArray(ctx.request.body.students, schoolId, sectionId, Role.student);
    const result = await this.coursesService.enrollStudentsInCourses(requestParamsArray, ctx.user);
    ctx.status = result.done ? 200 : 201;
    ctx.body = { ok: true, result: result.data };
    ctx.type = 'json';
  }

  async dropStudentsInCourses(ctx: Context, next: () => void) {
    validators.validateStudentsObjects(ctx.request.body);
    const { schoolId, sectionId } = ctx.params;
    const requestParamsArray = this.getParamsArray(ctx.request.body.students, schoolId, sectionId, Role.student);
    const result = await this.coursesService.dropStudentsInCourses(requestParamsArray, ctx.user);
    ctx.status = result.done ? 200 : 201;
    ctx.body = { ok: true, result: result.data };
    ctx.type = 'json';
  }

  async switchStudentsCourses(ctx: Context, next: () => void) {
    validators.validateStudentsSwitch(ctx.request.body);
    const { schoolId, sectionId } = ctx.params;
    const [enrollStudents, dropStudents] = this.separateEnrollAndDrop(ctx.request.body.students);
    const enrollRequestParamsArray = this.getParamsArray(enrollStudents, schoolId, sectionId, Role.student);
    const dropRequestParamsArray = this.getParamsArray(dropStudents, schoolId, sectionId, Role.student);
    const [result] = await Promise.all([
      this.coursesService.dropStudentsInCourses(dropRequestParamsArray, ctx.user),
      this.coursesService.enrollStudentsInCourses(enrollRequestParamsArray, ctx.user, false),
    ]);
    ctx.status = result.done ? 200 : 201;
    ctx.body = { ok: true, result: result.data };
    ctx.type = 'json';
  }

  async enrollTeachersInCourses(ctx: Context, next: () => void) {
    validators.validateTeachersObjects(ctx.request.body);
    const { schoolId, sectionId } = ctx.params;
    const requestParamsArray = this.getParamsArray(ctx.request.body.teachers, schoolId, sectionId, Role.teacher);
    const result = await this.coursesService.enrollTeachersInCourses(requestParamsArray, ctx.user);
    ctx.status = result.done ? 200 : 201;
    ctx.body = { ok: true, result: result.data };
    ctx.type = 'json';
  }

  async dropTeachersInCourses(ctx: Context, next: () => void) {
    validators.validateTeachersObjects(ctx.request.body);
    const { schoolId, sectionId } = ctx.params;
    const requestParamsArray = this.getParamsArray(ctx.request.body.teachers, schoolId, sectionId, Role.teacher);
    const result = await this.coursesService.dropTeachersInCourses(requestParamsArray, ctx.user);
    ctx.status = result.done ? 200 : 201;
    ctx.body = { ok: true, result: result.data };
    ctx.type = 'json';
  }

  async switchTeachersCourses(ctx: Context, next: () => void) {
    validators.validateTeachersSwitch(ctx.request.body);
    const { schoolId, sectionId } = ctx.params;
    const [enrollTeachers, dropTeachers] = this.separateEnrollAndDrop(ctx.request.body.teachers);
    const enrollRequestParamsArray = this.getParamsArray(enrollTeachers, schoolId, sectionId, Role.teacher);
    const dropRequestParamsArray = this.getParamsArray(dropTeachers, schoolId, sectionId, Role.teacher);
    const [result] = await Promise.all([
      this.coursesService.dropTeachersInCourses(dropRequestParamsArray, ctx.user),
      this.coursesService.enrollTeachersInCourses(enrollRequestParamsArray, ctx.user, false),
    ]);
    ctx.status = result.done ? 200 : 201;
    ctx.body = { ok: true, result: result.data };
    ctx.type = 'json';
  }

  async enableStudent(ctx: Context, next: () => void) {
    const { schoolId, sectionId, courseId, userId } = ctx.params;
    const requestParams = { schoolId, sectionId, courseId, usersIds: [userId], role: Role.student };
    const result = await this.coursesService.enableStudent(requestParams, ctx.user);
    ctx.status = 200;
    ctx.body = { ok: true, result: result.data };
    ctx.type = 'json';
  }

  async disableStudent(ctx: Context, next: () => void) {
    const { schoolId, sectionId, courseId, userId } = ctx.params;
    const requestParams = { schoolId, sectionId, courseId, usersIds: [userId], role: Role.student };
    const result = await this.coursesService.disableStudent(requestParams, ctx.user);
    ctx.status = 200;
    ctx.body = { ok: true, result: result.data };
    ctx.type = 'json';
  }

  async getActiveCourses(ctx: Context, next: () => void) {
    const { sub, role } = ctx.user;
    const result = await this.coursesService.getActiveCourses(sub, this.getUserType(role));
    ctx.status = 200;
    ctx.body = result;
    ctx.type = 'json';
  }

  async repairUsers(ctx: Context, next: () => void) {
    const { role } = ctx.params;
    const { userIds } = ctx.request.body;
    await this.coursesService.repairUsers(role, userIds, ctx.user);
    ctx.status = 200;
    ctx.body = { ok: true };
    ctx.type = 'json';
  }
  protected transformUsersToCourses(query: { _id: string, courses: string[] }[]): { [courseId: string]: string[] } {
    const courses = {};
    for (const student of query) {
      for (const courseId of student.courses) {
        if (courseId in courses) {
          courses[courseId].push(student._id);
        } else {
          courses[courseId] = [student._id];
        }
      }
    }
    return courses;
  }

  protected getUserType(role: string | string[] | undefined) {
    let userType: Role | undefined;
    if (!role) return undefined;
    if (role.includes('teacher')) {
      userType = Role.teacher;
    } else if (role.includes('student')) {
      userType = Role.student;
    }
    return userType;
  }

  protected getParamsArray(query: any, schoolId: string, sectionId: string, role: Role): IUserRequest[] {
    const courses = Object.entries(this.transformUsersToCourses(query));
    if (courses.length > 100) {
      throw new InvalidRequestError('Exeeded allowed courses limit in request!');
    }
    return courses.map(([courseId, usersIds]) => ({ schoolId, sectionId, courseId, usersIds, role }));
  }

  protected separateEnrollAndDrop(users: { _id: string, drop: string[], enroll: string[] }[]) {
    const enrollUsers = <any>[];
    const dropUsers = <any>[];
    for (const user of users) {
      enrollUsers.push({ _id: user._id, courses: user.enroll });
      dropUsers.push({ _id: user._id, courses: user.drop });
    }
    return [enrollUsers, dropUsers];
  }

  protected extractPaging(query: any) {
    const { index, size } = query;
    let parsedIndex = parseInt(index);
    let parsedSize = parseInt(size);
    if (!parsedIndex || parsedIndex < 1 || isNaN(parsedIndex)) parsedIndex = 0;
    else parsedIndex -= 1;
    if (!parsedSize || parsedSize < 1 || isNaN(parsedSize)) parsedSize = 10;

    return <IPaging>{
      index: parsedIndex,
      size: parsedSize
    };
  }
}
