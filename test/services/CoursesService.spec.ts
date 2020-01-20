import 'mocha';
import sinon from 'sinon';
import chai, { expect } from 'chai';
chai.use(require('sinon-chai'));

import { tryAndExpect } from '../tryAndExpect';
import { UnitOfWork, IPaging } from '@saal-oryx/unit-of-work';
import { CoursesService } from '../../src/services/CoursesService';
import { Repo } from '../../src/models/RepoNames';
import config from '../../src/config';
import { IUserToken } from '../../src/models/IUserToken';
import { ICreateCourseRequest } from '../../src/models/requests/ICourseRequests';
import { ValidationError } from '../../src/exceptions/ValidationError';
import { NotFoundError } from '../../src/exceptions/NotFoundError';
import { InvalidLicenseError } from '../../src/exceptions/InvalidLicenseError';
import { IAcademicTerm } from '../../src/models/entities/Common';
import { ILicense } from '../../src/models/entities/ISchool';
import { Role } from '../../src/models/Role';
import { ICourse } from '../../src/models/entities/ICourse';
import { UnauthorizedError } from '../../src/exceptions/UnauthorizedError';
import { ForbiddenError } from '../../src/exceptions/ForbiddenError';
import { IUserRequest } from '../../src/models/requests/IUserRequest';
import { UpdatesProcessor } from '../../src/services/processors/UpdatesProcessor';
import { CommandsProcessor } from '@saal-oryx/event-sourcing';

const unitOfWorkStub = sinon.spy(() => sinon.createStubInstance(UnitOfWork));
const updatesProcessorStub = sinon.spy(() => sinon.createStubInstance(UpdatesProcessor));
const commandsProcessorStub = sinon.spy(() => sinon.createStubInstance(CommandsProcessor));

const token = <IUserToken>{ role: [config.authorizedRole] };
const license = <ILicense>{ package: { grades: <any>{ ['4']: { math: ['moe'] } } } };
const activeTerm = <IAcademicTerm>{ _id: 'active', startDate: new Date('2019'), endDate: new Date('2099') };
const expiredTerm = <IAcademicTerm>{ _id: 'expired', startDate: new Date('2018'), endDate: new Date('2019') };
const course = <ICourse>{ _id: 'course1', schoolId: 'school1', sectionId: 'section1' };
const userRequest: IUserRequest = { ...course, courseId: course._id, usersIds: ['user1', 'user2'], role: Role.student };
const request: ICreateCourseRequest = {
  schoolId: 'aldar_ba526',
  sectionId: 'section_1',
  subject: 'math',
  locales: {
    en: {
      name: 'Math 101',
      description: 'Basics of Mathmatics'
    }
  },
  curriculum: 'moe',
  grade: '4',
  students: [],
  teachers: []
};

// tslint:disable-next-line: no-big-function
describe('Courses Service', () => {
  let _unitOfWorkStub: any;
  let _updatesProcessorStub: any;
  let _commandsProcessorStub: any;
  let _coursesService: CoursesService;
  const repositoryReturns = (repo: Repo, methods: object) => _unitOfWorkStub.getRepository.withArgs(repo).returns(methods);

  beforeEach(() => {
    _unitOfWorkStub = new unitOfWorkStub();
    _updatesProcessorStub = new updatesProcessorStub();
    _commandsProcessorStub = new commandsProcessorStub();
    _coursesService = new CoursesService(_unitOfWorkStub, _commandsProcessorStub, _updatesProcessorStub);
    _commandsProcessorStub.sendCommand = (service, method, ...args) => _coursesService[method.name](...args);
  });

  describe('Course Creation', () => {
    it('should fail to create course due to validation errors', async () => {
      await tryAndExpect(() => _coursesService.create(<ICreateCourseRequest>{}, token), ValidationError);
    });

    it('should fail to create course due to school not found error', async () => {
      repositoryReturns(Repo.schools, { findById: () => undefined });
      await tryAndExpect(() => _coursesService.create(request, token), NotFoundError);
    });

    it('should fail to create course due to section not found error', async () => {
      repositoryReturns(Repo.schools, { findById: () => ({}) });
      repositoryReturns(Repo.sections, { findOne: () => undefined });
      await tryAndExpect(() => _coursesService.create(request, token), NotFoundError);
    });

    it('should fail to create course due to school has no license error', async () => {
      repositoryReturns(Repo.schools, { findById: () => ({}) });
      repositoryReturns(Repo.sections, { findOne: () => ({}) });
      await tryAndExpect(() => _coursesService.create(request, token), InvalidLicenseError);
    });

    it('should fail to create course due to grade not in license error', async () => {
      repositoryReturns(Repo.schools, { findById: () => ({ license: { package: { grades: {} } } }) });
      repositoryReturns(Repo.sections, { findOne: () => ({}) });
      await tryAndExpect(() => _coursesService.create(request, token), InvalidLicenseError);
    });

    it('should fail to create course due to subject not in license error', async () => {
      repositoryReturns(Repo.schools, { findById: () => ({ license: { package: { grades: <any>{ ['4']: {} } } } }) });
      repositoryReturns(Repo.sections, { findOne: () => ({}) });
      await tryAndExpect(() => _coursesService.create(request, token), InvalidLicenseError);
    });

    it('should fail to create course due to curriculum not in license error', async () => {
      repositoryReturns(Repo.schools, { findById: () => ({ license: { package: { grades: <any>{ ['4']: { math: [] } } } } }) });
      repositoryReturns(Repo.sections, { findOne: () => ({}) });
      await tryAndExpect(() => _coursesService.create(request, token), InvalidLicenseError);
    });

    it('should fail to create course due to academic term not found error', async () => {
      repositoryReturns(Repo.schools, { findById: () => ({ license, academicTerms: [] }) });
      repositoryReturns(Repo.sections, { findOne: () => ({}) });
      await tryAndExpect(() => _coursesService.create({ ...request, academicTermId: 'termId' }, token), InvalidLicenseError);
    });

    it('should fail to create course due to academic term expired error', async () => {
      repositoryReturns(Repo.schools, { findById: () => ({ license, academicTerms: [expiredTerm] }) });
      repositoryReturns(Repo.sections, { findOne: () => ({}) });
      await tryAndExpect(() => _coursesService.create({ ...request, academicTermId: expiredTerm._id }, token), InvalidLicenseError);
    });

    it('should fail to create course due to no active academic term found error', async () => {
      repositoryReturns(Repo.schools, { findById: () => ({ license, academicTerms: [expiredTerm] }) });
      repositoryReturns(Repo.sections, { findOne: () => ({}) });
      await tryAndExpect(() => _coursesService.create(request, token), InvalidLicenseError);
    });

    it('should fail to create course due to requeted users not found in database', async () => {
      repositoryReturns(Repo.schools, { findById: () => ({ license, academicTerms: [activeTerm] }) });
      repositoryReturns(Repo.sections, { findOne: () => ({}) });
      repositoryReturns(Repo.users, { getUsersInSchool: () => [] });
      await tryAndExpect(() => _coursesService.create({ ...request, students: ['student1'], teachers: ['teacher1'] }, token), NotFoundError);
    });

    it('should fail to create course due to requeted teacher is a student', async () => {
      repositoryReturns(Repo.schools, { findById: () => ({ license, academicTerms: [activeTerm] }) });
      repositoryReturns(Repo.sections, { findOne: () => ({}) });
      repositoryReturns(Repo.users, { findMany: () => [{ _id: 'teacher1', role: [Role.student] }], getUsersInSchool: () => [] });
      await tryAndExpect(() => _coursesService.create({ ...request, teachers: ['teacher1'] }, token), NotFoundError);
    });

    it('should succeed to create course in active term without students or teachers', async () => {
      repositoryReturns(Repo.schools, { findById: () => ({ license, academicTerms: [activeTerm] }) });
      repositoryReturns(Repo.sections, { findOne: () => ({}) });
      repositoryReturns(Repo.courses, { add: course => course, getActiveCoursesForUsers: () => [{ ...course, students: [], teachers: [] }] });
      repositoryReturns(Repo.users, { getUsersInSchool: () => [] });
      const { _id, ...result } = <any>await _coursesService.create(request, token);
      expect(result).to.deep.equal({ ...request, academicTerm: activeTerm, defaultLocale: 'en', isEnabled: true });
    });

    it('should succeed to create course in specified term without students or teachers', async () => {
      repositoryReturns(Repo.schools, { findById: () => ({ license, academicTerms: [activeTerm] }) });
      repositoryReturns(Repo.sections, { findOne: () => ({}) });
      repositoryReturns(Repo.courses, { add: course => course, getActiveCoursesForUsers: () => [{ ...course, students: [], teachers: [] }] });
      repositoryReturns(Repo.users, { getUsersInSchool: () => [] });
      const { _id, ...result } = <any>await _coursesService.create({ ...request, academicTermId: activeTerm._id }, token);
      expect(result).to.deep.equal({ ...request, academicTerm: activeTerm, defaultLocale: 'en', isEnabled: true });
    });

    it('should succeed to create course in active term with students and teachers', async () => {
      repositoryReturns(Repo.schools, { findById: () => ({ license, academicTerms: [activeTerm] }) });
      repositoryReturns(Repo.sections, { findOne: () => ({}) });
      repositoryReturns(Repo.courses, { add: course => course, getActiveCoursesForUsers: () => [{ ...course, students: ['student1'], teachers: ['teacher1'] }] });
      repositoryReturns(Repo.users, {
        findMany: () => [{ _id: 'student1', role: [Role.student] }, { _id: 'teacher1', role: [Role.teacher] }],
        getUsersInSchool: () => [{
          _id: 'student1',
          role: [Role.student],
          school: {
            _id: request.schoolId
          }
        }, {
          _id: 'teacher1',
          role: [Role.teacher],
          school: {
            _id: request.schoolId,
            joinDate: new Date()
          }
        }]
      });
      const { _id, ...result } = <any>await _coursesService.create({ ...request, students: ['student1'], teachers: ['teacher1'] }, token);
      expect({ ...result, students: [], teachers: [] }).to.deep.equal({ ...request, academicTerm: activeTerm, defaultLocale: 'en', isEnabled: true });
      expect(result.students).to.have.lengthOf(1);
      expect(result.teachers).to.have.lengthOf(1);
    });
  });

  describe('Course Retrieval and Updates', () => {
    it('should succeed to list active courses and sections in specified school', async () => {
      repositoryReturns(Repo.sections, { findMany: () => true });
      repositoryReturns(Repo.courses, { getActiveCoursesForSchool: () => true });
      const result = await _coursesService.listWithSections(course.schoolId, token);
      expect(result).to.deep.equal({ courses: true, sections: true });
    });

    it('should succeed to list available courses in specified school', async () => {
      repositoryReturns(Repo.courses, { findManyPage: ({ schoolId, sectionId }) => [{ _id: course._id, schoolId, sectionId }] });
      const result = await _coursesService.list(course.schoolId, course.sectionId, <IPaging>{}, token);
      expect(result).to.deep.equal([course]);
    });

    it('should fail to get course due to no user token sent', async () => {
      await tryAndExpect(() => _coursesService.getById(course.schoolId, course._id, true, <any>undefined), ForbiddenError);
    });

    it('should fail to get course by id due to teacher not in school', async () => {
      await tryAndExpect(() => _coursesService.getById(course.schoolId, course._id, true, <IUserToken>{ role: [Role.teacher] }), UnauthorizedError);
    });

    it('should succeed to get course by id in specified school', async () => {
      repositoryReturns(Repo.courses, { getById: (schoolId, courseId, profiles) => [{ _id: courseId, schoolId, sectionId: course.sectionId }] });
      const result = await _coursesService.getById(course.schoolId, course._id, true, <IUserToken>{ role: [Role.teacher], schooluuid: course.schoolId });
      expect(result).to.deep.equal([course]);
    });

    it('should succeed to get course by id in specified school and section', async () => {
      repositoryReturns(Repo.courses, { findOne: ({ _id, sectionId, schoolId }) => [{ _id, schoolId, sectionId }] });
      const result = await _coursesService.get(course.schoolId, course.sectionId, course._id, token);
      expect(result).to.deep.equal([course]);
    });

    it('should fail to update course due to validation error', async () => {
      await tryAndExpect(() => _coursesService.update(course.schoolId, course.sectionId, course._id, {}, token), ValidationError);
    });

    it('should succeed to update course in specified school and section', async () => {
      const updates = { locales: { en: { name: 'New Course Name' } } };
      repositoryReturns(Repo.courses, { patch: (filter, updateObj) => ({ ...filter, ...updateObj }) });
      const result = await _coursesService.update(course.schoolId, course.sectionId, course._id, updates, token);
      expect(result).to.deep.equal({ ...course, ...updates });
    });

    it('should fail to delete course due to course not found error', async () => {
      repositoryReturns(Repo.courses, { findOne: () => undefined });
      await tryAndExpect(() => _coursesService.delete(course.schoolId, course.sectionId, course._id, token), NotFoundError);
    });

    it('should succeed to delete course in specified school and section', async () => {
      repositoryReturns(Repo.courses, { findOne: () => ({}), delete: ({ _id }) => _id });
      const result = await _coursesService.delete(course.schoolId, course.sectionId, course._id, token);
      expect(result).equal(course._id);
    });

    it('should fail to get active courses due to no role being sent', async () => {
      const result = await _coursesService.getActiveCourses('user1');
      expect(result.courses).to.have.lengthOf(0);
    });

    it('should succeed to get active courses for specified student', async () => {
      repositoryReturns(Repo.courses, { getActiveCoursesForUser: () => [course] });
      const result = await _coursesService.getActiveCourses('student1', Role.student);
      expect(result.courses).to.have.lengthOf(1);
      expect(result.teachers).equal(undefined);
    });

    it('should succeed to get active courses for specified teacher', async () => {
      const user = { _id: 'user1', isEnabled: true };
      repositoryReturns(Repo.courses, { getActiveCoursesForUser: () => [{ ...course, students: [user], teachers: [user] }] });
      repositoryReturns(Repo.sections, { findMany: () => [{}] });
      repositoryReturns(Repo.users, { findMany: () => [{ role: Role.student }, { role: Role.teacher }] });
      const result = await _coursesService.getActiveCourses('teacher1', Role.teacher);
      expect(result.courses).to.have.lengthOf(1);
      expect(result.students).to.have.lengthOf(1);
      expect(result.teachers).to.have.lengthOf(1);
    });

    it('should succeed to notify about user enrollment in kafka', async () => {
      let done = false;
      repositoryReturns(Repo.courses, { getActiveCoursesForUsers: () => [{ ...course, students: [] }] });
      repositoryReturns(Repo.users, { findMany: () => [{ school: {} }, { registration: {} }] });
      _updatesProcessorStub.sendEnrollmentUpdates = () => done = true;
      await _coursesService.notifyForUserEnrollment(Role.student, ['user1']);
      expect(done).equal(true);
    });
  });

  describe('Course Students and Teachers Management', () => {
    it('should succeed to enable one student in one course', async () => {
      repositoryReturns(Repo.courses, { findMany: () => [course], toggleUsersInCourses: (c, u, r, value) => value });
      repositoryReturns(Repo.users, { findMany: () => userRequest.usersIds });
      const result = await _coursesService.enableStudent(userRequest, token);
      expect(result).equal(true);
    });

    it('should succeed to disable one student in one course', async () => {
      repositoryReturns(Repo.courses, { findMany: () => [course], toggleUsersInCourses: (c, u, r, value) => value });
      repositoryReturns(Repo.users, { findMany: () => userRequest.usersIds });
      const result = await _coursesService.disableStudent(userRequest, token);
      expect(result).equal(false);
    });

    it('should succeed to enroll multiple students in one course', async () => {
      repositoryReturns(Repo.courses, {
        findMany: () => [course], addUsersToCourses: updates => updates,
        getActiveCoursesForUsers: () => [{ ...course, students: userRequest.usersIds }]
      });
      repositoryReturns(Repo.users, { findMany: () => userRequest.usersIds, getUsersInSchool: () => [] });
      repositoryReturns(Repo.sections, { addStudentsToSections: () => undefined });
      const result = await _coursesService.enrollStudents(userRequest, token);
      expect(result).to.have.lengthOf(1);
    });

    it('should succeed to enroll multiple students in multiple courses', async () => {
      const courseWithStudents = { ...course, students: userRequest.usersIds };
      repositoryReturns(Repo.courses, {
        findMany: () => [course, course], addUsersToCourses: updates => updates,
        getActiveCoursesForUsers: () => [courseWithStudents, courseWithStudents]
      });
      repositoryReturns(Repo.users, { findMany: () => userRequest.usersIds, getUsersInSchool: () => [] });
      repositoryReturns(Repo.sections, { addStudentsToSections: () => undefined });
      const result = await _coursesService.enrollStudentsInCourses([userRequest, userRequest], token);
      expect(result).to.have.lengthOf(2);
    });

    it('should succeed to drop multiple student from one course', async () => {
      repositoryReturns(Repo.courses, {
        findMany: () => [course], finishUsersInCourses: updates => updates,
        getActiveCoursesForUsers: () => [{ ...course, students: userRequest.usersIds }]
      });
      repositoryReturns(Repo.users, { findMany: () => userRequest.usersIds, getUsersInSchool: () => [] });
      const result = await _coursesService.dropStudents(userRequest, token);
      expect(result).to.have.lengthOf(1);
    });

    it('should succeed to drop multiple student from multiple courses', async () => {
      repositoryReturns(Repo.courses, {
        findMany: () => [course, course], finishUsersInCourses: updates => updates,
        getActiveCoursesForUsers: () => []
      });
      repositoryReturns(Repo.users, { findMany: () => userRequest.usersIds, getUsersInSchool: () => [] });
      const result = await _coursesService.dropStudentsInCourses([userRequest, userRequest], token);
      expect(result).to.have.lengthOf(2);
    });

    it('should succeed to enroll multiple teachers in one course', async () => {
      userRequest.role = Role.teacher;
      repositoryReturns(Repo.courses, {
        findMany: () => [course], addUsersToCourses: updates => updates,
        getActiveCoursesForUsers: () => [{ ...course, teachers: userRequest.usersIds }]
      });
      repositoryReturns(Repo.users, { findMany: () => userRequest.usersIds, getUsersInSchool: () => [] });
      const result = await _coursesService.enrollTeachers(userRequest, token);
      expect(result).to.have.lengthOf(1);
    });

    it('should succeed to enroll multiple teachers in multiple courses', async () => {
      userRequest.role = Role.teacher;
      const courseWithTeachers = { ...course, teachers: userRequest.usersIds };
      repositoryReturns(Repo.courses, {
        findMany: () => [course, course], addUsersToCourses: updates => updates,
        getActiveCoursesForUsers: () => [courseWithTeachers, courseWithTeachers]
      });
      repositoryReturns(Repo.users, { findMany: () => userRequest.usersIds, getUsersInSchool: () => [] });
      const result = await _coursesService.enrollTeachersInCourses([userRequest, userRequest], token);
      expect(result).to.have.lengthOf(2);
    });

    it('should succeed to drop multiple teacher from one course', async () => {
      repositoryReturns(Repo.courses, {
        findMany: () => [course], finishUsersInCourses: updates => updates,
        getActiveCoursesForUsers: () => [{ ...course, teachers: userRequest.usersIds }]
      });
      repositoryReturns(Repo.users, { findMany: () => userRequest.usersIds, getUsersInSchool: () => [] });
      const result = await _coursesService.dropTeachers(userRequest, token);
      expect(result).to.have.lengthOf(1);
    });

    it('should succeed to drop multiple teacher from multiple courses', async () => {
      const courseWithTeachers = { ...course, teachers: userRequest.usersIds };
      repositoryReturns(Repo.courses, {
        findMany: () => [course, course], finishUsersInCourses: updates => updates,
        getActiveCoursesForUsers: () => [courseWithTeachers, courseWithTeachers]
      });
      repositoryReturns(Repo.users, { findMany: () => userRequest.usersIds, getUsersInSchool: () => [] });
      const result = await _coursesService.dropTeachersInCourses([userRequest, userRequest], token);
      expect(result).to.have.lengthOf(2);
    });
  });
});
