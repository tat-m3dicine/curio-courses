import { CoursesService } from '../../src/services/CoursesService';
import { CoursesController } from '../../src/controllers/CoursesController';
import 'mocha';
import { Context } from 'koa';
import chai, { expect } from 'chai';
import sinon from 'sinon';
import { tryAndExpect } from '../utils/tryAndExpect';
import { NotFoundError } from '../../src/exceptions/NotFoundError';
import { ValidationError } from '../../src/exceptions/ValidationError';
import { InvalidRequestError } from '../../src/exceptions/InvalidRequestError';
chai.use(require('sinon-chai'));


const coursesServiceStub = sinon.spy(() => sinon.createStubInstance(CoursesService));

describe(`Courses Controller`, () => {

  let _coursesServiceStub: CoursesService;
  let coursesController: CoursesController;
  let ctx: Context;
  beforeEach(() => {
    ctx = JSON.parse(JSON.stringify({ params: {}, request: { body: {} }, query: {}, user: {} }));
    _coursesServiceStub = new coursesServiceStub();
    coursesController = new CoursesController(_coursesServiceStub);
  });

  it(`should succeed in creating course`, async () => {
    _coursesServiceStub.create = async () => <any>{ done: false };
    await coursesController.create(ctx);
    expect(ctx.status).equal(202);
    _coursesServiceStub.create = async () => <any>{ done: true };
    await coursesController.create(ctx);
    expect(ctx.status).equal(201);

  });

  it(`should succeed in listing courses with sections`, async () => {
    _coursesServiceStub.listWithSections = async () => <any>{};
    await coursesController.listWithSections(ctx);
    expect(ctx.status).equal(200);
  });

  it(`should succeed in listing courses`, async () => {
    _coursesServiceStub.list = async () => <any>{};
    await coursesController.list(ctx);
    expect(ctx.status).equal(200);
    ctx.query.index = 1;
    ctx.query.size = 5;
    ctx.query['sorter.createdAt'] = '-1';
    _coursesServiceStub.list = async () => <any>{};
    await coursesController.list(ctx);
    expect(ctx.status).equal(200);
  });

  it(`should fail to get courses`, async () => {
    _coursesServiceStub.get = async () => <any>undefined;
    await tryAndExpect(async () => coursesController.get(ctx), NotFoundError);
  });

  it(`should succeed in listing courses`, async () => {
    _coursesServiceStub.get = async () => <any>{};
    await coursesController.get(ctx);
    expect(ctx.status).equal(200);
  });

  it(`should fail to get course by id`, async () => {
    _coursesServiceStub.getById = async () => <any>undefined;
    await tryAndExpect(async () => coursesController.getById(ctx), NotFoundError);
  });

  it(`should succeed in getting course by id`, async () => {
    _coursesServiceStub.getById = async () => <any>{};
    await coursesController.getById(ctx);
    expect(ctx.status).equal(200);
  });

  it(`should succeed in updating a course`, async () => {
    _coursesServiceStub.update = async () => <any>{ done: false };
    await coursesController.update(ctx);
    expect(ctx.status).equal(202);
    _coursesServiceStub.update = async () => <any>{ done: true };
    await coursesController.update(ctx);
    expect(ctx.status).equal(201);
  });

  it(`should succeed in deleting a course`, async () => {
    _coursesServiceStub.delete = async () => <any>{};
    await coursesController.delete(ctx);
    expect(ctx.status).equal(200);
  });

  it(`should succeed in enrolling a student`, async () => {
    _coursesServiceStub.enrollStudents = async () => <any>{};
    await coursesController.enrollStudent(ctx);
    expect(ctx.status).equal(200);
  });

  it(`should fail to enroll students because students' list is empty`, async () => {
    ctx.request.body = { students: [] };
    _coursesServiceStub.enrollStudents = async () => <any>{};
    await tryAndExpect(async () => coursesController.enrollStudents(ctx), ValidationError);
  });

  it(`should succeed in enrolling students`, async () => {
    ctx.request.body = { students: ['student1', 'student'] };
    _coursesServiceStub.enrollStudents = async () => <any>{};
    await coursesController.enrollStudents(ctx);
    expect(ctx.status).equal(200);
  });

  it(`should succeed in dropping student`, async () => {
    _coursesServiceStub.dropStudents = async () => <any>{};
    await coursesController.dropStudent(ctx);
    expect(ctx.status).equal(200);
  });

  it(`should succeed in enrolling a teacher`, async () => {
    _coursesServiceStub.enrollTeachers = async () => <any>{};
    await coursesController.enrollTeacher(ctx);
    expect(ctx.status).equal(200);
  });

  it(`should fail to enroll teachers because teachers' list is empty`, async () => {
    ctx.request.body = { teachers: [] };
    _coursesServiceStub.enrollTeachers = async () => <any>{};
    await tryAndExpect(async () => coursesController.enrollTeachers(ctx), ValidationError);
  });

  it(`should succeed in enrolling teachers`, async () => {
    ctx.request.body = { teachers: ['teacher1', 'teacher2'] };
    _coursesServiceStub.enrollTeachers = async () => <any>{};
    await coursesController.enrollTeachers(ctx);
    expect(ctx.status).equal(200);
  });

  it(`should succeed in dropping a teacher`, async () => {
    _coursesServiceStub.dropTeachers = async () => <any>{};
    await coursesController.dropTeacher(ctx);
    expect(ctx.status).equal(200);
  });

  it(`should fail to drop teachers because teachers' list is empty`, async () => {
    ctx.request.body = { teachers: [] };
    _coursesServiceStub.dropTeachers = async () => <any>{};
    await tryAndExpect(async () => coursesController.dropTeachers(ctx), ValidationError);
  });

  it(`should succeed in dropping teachers`, async () => {
    ctx.request.body = { teachers: ['teacher1', 'teacher2'] };
    _coursesServiceStub.dropTeachers = async () => <any>{};
    await coursesController.dropTeachers(ctx);
    expect(ctx.status).equal(200);
  });

  it(`should fail to enroll students in courses because students' list is empty`, async () => {
    ctx.request.body = { students: [] };
    _coursesServiceStub.enrollStudentsInCourses = async () => <any>{};
    await tryAndExpect(async () => coursesController.enrollStudentsInCourses(ctx), ValidationError);
  });

  it(`should fail to enroll students in courses because Exceeded allowed courses limit`, async () => {
    ctx.request.body = { students: [{ _id: 'userId', courses: [...Array(108)].map((_, index) => String(index)) }] };
    _coursesServiceStub.enrollStudentsInCourses = async () => <any>{};
    await tryAndExpect(async () => coursesController.enrollStudentsInCourses(ctx), InvalidRequestError);
  });


  it(`should succeed in enrolling students in courses`, async () => {
    ctx.request.body = { students: [{ _id: 'student1', courses: ['course'] }, { _id: 'student2', courses: ['course'] }] };
    _coursesServiceStub.enrollStudentsInCourses = async () => <any>{ done: false };
    await coursesController.enrollStudentsInCourses(ctx);
    expect(ctx.status).equal(201);
    _coursesServiceStub.enrollStudentsInCourses = async () => <any>{ done: true };
    await coursesController.enrollStudentsInCourses(ctx);
    expect(ctx.status).equal(200);
  });



  it(`should fail to drop students in courses because students' list is empty`, async () => {
    ctx.request.body = { students: [] };
    _coursesServiceStub.dropStudentsInCourses = async () => <any>{};
    await tryAndExpect(async () => coursesController.dropStudentsInCourses(ctx), ValidationError);
  });

  it(`should succeed in dropping students in courses`, async () => {
    ctx.request.body = { students: [{ _id: 'id', courses: ['course'] }] };
    _coursesServiceStub.dropStudentsInCourses = async () => <any>{ done: true };
    await coursesController.dropStudentsInCourses(ctx);
    expect(ctx.status).equal(200);
    _coursesServiceStub.dropStudentsInCourses = async () => <any>{ done: false };
    await coursesController.dropStudentsInCourses(ctx);
    expect(ctx.status).equal(201);
  });

  it(`should fail to switch students' courses because students' list is empty`, async () => {
    ctx.request.body = { students: [] };
    await tryAndExpect(async () => coursesController.dropStudentsInCourses(ctx), ValidationError);
  });

  it(`should succeed in switching students' courses`, async () => {
    ctx.request.body = { students: [{ _id: 'id', courses: ['course'], enroll: ['course'], drop: ['course'] }] };
    _coursesServiceStub.dropStudentsInCourses = async () => <any>{ done: true };
    _coursesServiceStub.enrollStudentsInCourses = async () => <any>{};
    await coursesController.switchStudentsCourses(ctx);
    expect(ctx.status).equal(200);
    _coursesServiceStub.dropStudentsInCourses = async () => <any>{ done: false };
    _coursesServiceStub.enrollStudentsInCourses = async () => <any>{};
    await coursesController.switchStudentsCourses(ctx);
    expect(ctx.status).equal(201);
  });

  it(`should fail to enroll teachers in courses because teachers' list is empty`, async () => {
    ctx.request.body = { teachers: [] };
    await tryAndExpect(async () => coursesController.enrollTeachersInCourses(ctx), ValidationError);
  });

  it(`should succeed in enrolling teachers in courses`, async () => {
    ctx.request.body = { teachers: [{ _id: 'id', courses: ['course'] }] };
    _coursesServiceStub.enrollTeachersInCourses = async () => <any>{ done: true };
    await coursesController.enrollTeachersInCourses(ctx);
    expect(ctx.status).equal(200);
    _coursesServiceStub.enrollTeachersInCourses = async () => <any>{ done: false };
    await coursesController.enrollTeachersInCourses(ctx);
    expect(ctx.status).equal(201);
  });

  it(`should fail to drop teachers in courses because teachers' list is empty`, async () => {
    ctx.request.body = { teachers: [] };
    await tryAndExpect(async () => coursesController.dropTeachersInCourses(ctx), ValidationError);
  });

  it(`should succeed in enrolling teachers in courses`, async () => {
    ctx.request.body = { teachers: [{ _id: 'id', courses: ['course'] }] };
    _coursesServiceStub.dropTeachersInCourses = async () => <any>{ done: true };
    await coursesController.dropTeachersInCourses(ctx);
    expect(ctx.status).equal(200);
    _coursesServiceStub.dropTeachersInCourses = async () => <any>{ done: false };
    await coursesController.dropTeachersInCourses(ctx);
    expect(ctx.status).equal(201);
  });



  it(`should fail to drop students in courses because students' list is empty`, async () => {
    ctx.request.body = { students: [] };
    await tryAndExpect(async () => coursesController.dropStudents(ctx), ValidationError);
  });

  it(`should succeed in dropping students in courses`, async () => {
    ctx.request.body = { students: ['student'] };
    _coursesServiceStub.dropStudents = async () => <any>{};
    await coursesController.dropStudents(ctx);
    expect(ctx.status).equal(200);
  });


  it(`should fail to switch teachers' courses because students' list is empty`, async () => {
    ctx.request.body = { teachers: [] };
    await tryAndExpect(async () => coursesController.switchTeachersCourses(ctx), ValidationError);
  });

  it(`should succeed in switching teachers' courses`, async () => {
    ctx.request.body = { teachers: [{ _id: 'id', courses: ['course'], enroll: ['course'], drop: ['course'] }] };
    _coursesServiceStub.dropTeachersInCourses = async () => <any>{ done: true };
    _coursesServiceStub.enrollTeachersInCourses = async () => <any>{};
    await coursesController.switchTeachersCourses(ctx);
    expect(ctx.status).equal(200);
    _coursesServiceStub.dropTeachersInCourses = async () => <any>{ done: false };
    _coursesServiceStub.enrollTeachersInCourses = async () => <any>{};
    await coursesController.switchTeachersCourses(ctx);
    expect(ctx.status).equal(201);
  });

  it(`should succeed in enabling a student`, async () => {
    _coursesServiceStub.enableStudent = async () => <any>{};
    await coursesController.enableStudent(ctx);
    expect(ctx.status).equal(200);
  });

  it(`should succeed in disabling a student`, async () => {
    _coursesServiceStub.disableStudent = async () => <any>{};
    await coursesController.disableStudent(ctx);
    expect(ctx.status).equal(200);
  });

  it(`should succeed in getting active courses`, async () => {
    _coursesServiceStub.getActiveCourses = async () => <any>{};
    await coursesController.getActiveCourses(ctx);
    expect(ctx.status).equal(200);
  });

  it(`should succeed in repairing users`, async () => {
    _coursesServiceStub.repairUsers = async () => <any>{};
    await coursesController.repairUsers(ctx);
    expect(ctx.status).equal(200);
  });

  it(`should fail to get user type because role is undefined`, () => {
    const role = 'undefined';
    const result = coursesController['getUserType'](role);
    expect(result).to.equal(undefined);
  });

  it(`should succeed in getting user type (role: student)`, () => {
    const role = 'student';
    const result = coursesController['getUserType'](role);
    expect(result).equal(role);
  });

  it(`should succeed in getting user type (role: teacher)`, () => {
    const role = 'teacher';
    const result = coursesController['getUserType'](role);
    expect(result).equal(role);
  });


  it(`should succeed in joining a course`, async () => {
    _coursesServiceStub.join = async () => <any>{};
    await coursesController.join(ctx);
    expect(ctx.status).equal(200);
  });

});
