import 'mocha';
import sinon from 'sinon';
import chai from 'chai';
import { UnitOfWork } from '@saal-oryx/unit-of-work';
chai.use(require('sinon-chai'));
const expect = chai.expect;

import config from '../../src/config';
import { Repo } from '../../src/models/RepoNames';
import { SectionsService } from '../../src/services/SectionsService';
import { getTestData, Test } from '../mockData/getSectionsTestData';
import { IUserToken } from '../../src/models/IUserToken';
import { ICreateSectionRequest, ICreateSectionCourse } from '../../src/models/requests/ISectionRequests';
import { NotFoundError } from '../../src/exceptions/NotFoundError';
import { ISchool } from '../../src/models/entities/ISchool';
import { IUser } from '../../src/models/entities/IUser';
import { ISection } from '../../src/models/entities/ISection';
import { tryAndExpect } from '../utils/tryAndExpect';
import { UpdatesProcessor } from '../../src/services/processors/UpdatesProcessor';
import { CommandsProcessor } from '@saal-oryx/event-sourcing';
import { ForbiddenError } from '../../src/exceptions/ForbiddenError';
import { InvalidRequestError } from '../../src/exceptions/InvalidRequestError';
import { InvalidLicenseError } from '../../src/exceptions/InvalidLicenseError';
import clone from '../utils/clone';
import { CoursesService } from '../../src/services/CoursesService';
import { IAcademicTerm } from '../../src/models/entities/Common';
import { ICourse } from '../../src/models/entities/ICourse';
import { Role } from '../../src/models/Role';
import { UnauthorizedError } from '../../src/exceptions/UnauthorizedError';
const course = <ICourse>{ _id: 'course1', schoolId: 'school1', sectionId: 'section1' };
const createSectionRequest: ICreateSectionRequest = {
    grade: '5',
    locales: {
        en: {
            name: 'english',
            description: 'english'
        }
    },
    schoolId: 'schoolId',

}

const token = <IUserToken>{ role: [config.authorizedRole] };
const usersResponse: IUser[] = getTestData(Test.usersResponse, {}, false);
const sectionResponse: any = getTestData(Test.sectionResponse, {}, false);
const schoolResponse: ISchool | undefined = getTestData(Test.schoolResponse, {}, false);
const allSectionsResponse: ISection = getTestData(Test.allSectionsResponse, {}, false);
const createSectionWithNoStudents: ICreateSectionRequest = getTestData(Test.createSectionWithNoStudents, {}, false);
const createSectionWithStudents: ICreateSectionRequest = getTestData(Test.createSectionWithStudents, {}, false);
const unitOfWorkStub = sinon.spy(() => sinon.createStubInstance(UnitOfWork));
const updatesProcessorStub = sinon.spy(() => sinon.createStubInstance(UpdatesProcessor));
const commandsProcessorStub = sinon.spy(() => sinon.createStubInstance(CommandsProcessor));


describe('Sections Service', () => {
    let _unitOfWorkStub: any;
    let _updatesProcessorStub: any;
    let _commandsProcessorStub: any;
    let sectionsService: SectionsService;
    const repositoryReturns = (repo: Repo, methods: object) => _unitOfWorkStub.getRepository.withArgs(repo).returns(methods);
    beforeEach(() => {
        _unitOfWorkStub = new unitOfWorkStub();
        _updatesProcessorStub = new updatesProcessorStub();
        _commandsProcessorStub = new commandsProcessorStub();
        sectionsService = new SectionsService(_unitOfWorkStub, _commandsProcessorStub, _updatesProcessorStub);
        _commandsProcessorStub.sendCommand = (service, method, ...args) => sectionsService[method.name](...args);
    });

    it('should fail to create section if school not exist', async () => {
        repositoryReturns(Repo.schools, { findById: () => undefined });
        await tryAndExpect(() => sectionsService.create(createSectionWithNoStudents, token), NotFoundError);
    });

    it('should fail to create section with students if school not exist', async () => {
        repositoryReturns(Repo.schools, { findById: () => undefined });
        repositoryReturns(Repo.users, { findMany: () => [{ _id: 1 }] });
        await tryAndExpect(() => sectionsService.create(createSectionWithStudents, token), NotFoundError);
    });

    it(`should fail to create a section because the license is invalid`, async () => {
        repositoryReturns(Repo.schools, { findById: () => getTestData(Test.schoolResponse) });
        await tryAndExpect(async () => sectionsService.create(createSectionRequest, token), InvalidLicenseError);
    });


    it(`should fail to create a section (mongodb duplication error), returns the section itself`, async () => {
        repositoryReturns(Repo.schools, { findById: () => schoolResponse });
        repositoryReturns(Repo.users, { findMany: () => usersResponse });
        repositoryReturns(Repo.sections, { add: () => Promise.reject({ code: 11000 }) });
        const modifiedSection = <ISection>clone(createSectionWithStudents);
        modifiedSection!._id = 'sectionId';
        const result = await sectionsService.create(modifiedSection, token);
        expect(result).to.deep.equal(modifiedSection);
    });

    it(`should fail to create a section if adding the section to db fails`, async () => {
        const errorMessage = `Failed to add document to db`;
        repositoryReturns(Repo.schools, { findById: () => schoolResponse });
        repositoryReturns(Repo.users, { findMany: () => usersResponse });
        repositoryReturns(Repo.sections, { add: () => Promise.reject(errorMessage) });
        try {
            await sectionsService.create(createSectionWithNoStudents, token);
        } catch (err) {
            expect(err).equal(errorMessage);
        }
    });

    it(`should succeed in creating a section (without students and courses)`, async () => {
        repositoryReturns(Repo.schools, { findById: () => schoolResponse });
        repositoryReturns(Repo.users, { findMany: () => usersResponse });
        repositoryReturns(Repo.sections, { add: () => sectionResponse });
        const modifiedSection = clone(createSectionWithStudents);
        delete modifiedSection.students;
        const result = await sectionsService.create(modifiedSection, token);
        expect(result).equal(sectionResponse);
    });

    it(`should succeed in creating a section (with students and courses)`, async () => {
        const academicTerm: IAcademicTerm = {
            _id: 'id',
            year: '2019',
            term: 'fall',
            startDate: new Date('2019'),
            endDate: new Date('2021'),
            gracePeriod: 3,
            isEnabled: true
        };
        repositoryReturns(Repo.schools, { findById: () => schoolResponse });
        repositoryReturns(Repo.users, { findMany: () => usersResponse });
        repositoryReturns(Repo.sections, { add: () => sectionResponse });
        repositoryReturns(Repo.courses, { addMany: () => course });
        const modifiedSection = <ICreateSectionRequest>clone(createSectionWithStudents);
        modifiedSection.courses = <ICreateSectionCourse[]>[{ subject: 'math', curriculum: 'moe', enroll: true }];
        CoursesService.validateAndGetAcademicTerm = () => academicTerm;
        _updatesProcessorStub.notifyCourseEvents = async () => Promise.resolve();
        const result = await sectionsService.create(modifiedSection, token);
        expect(result).equal(sectionResponse);
    });

    it('should fail to get a section (as a teacher)', async () => {
        const schoolId = 'aldar_ba526';
        repositoryReturns(Repo.sections, { findOne: () => sectionResponse });
        await tryAndExpect(async () => sectionsService.get(schoolId, 'ABCSCHOOLOTIPT1_SECTION1_8', <any>{ role: Role.teacher }), UnauthorizedError);
    });
    it('should succeed in getting a section (as a principal)', async () => {
        const schoolId = 'aldar_ba526';
        repositoryReturns(Repo.sections, { findOne: () => sectionResponse });
        const result = await sectionsService.get(schoolId, 'ABCSCHOOLOTIPT1_SECTION1_8', <any>{ role: Role.principal, schooluuid: schoolId });
        expect(result).equal(sectionResponse);
    });

    it('should succeed in listing section by schoolId', async () => {
        repositoryReturns(Repo.sections, { findManyPage: () => allSectionsResponse });
        const result = await sectionsService.list({ schoolId: 'aldar_ba526' }, { index: 1, size: 1 }, token);
        expect(result).equal(allSectionsResponse);
    });

    it('should succeed in listing section by schoolId and grade', async () => {
        repositoryReturns(Repo.sections, { findManyPage: () => allSectionsResponse });
        const result = await sectionsService.list({ schoolId: 'aldar_ba526', grade: '5' }, { index: 1, size: 1 }, token);
        expect(result).equal(allSectionsResponse);
    });

    it(`should fail to delete a section because the token is missing/invalid`, async () => {
        await tryAndExpect(async () => sectionsService.delete('', '', <any>undefined), ForbiddenError);
    });

    it(`should fail to delete a section because the section doesn't exist in that school`, async () => {
        repositoryReturns(Repo.sections, { findOne: () => undefined });
        await tryAndExpect(async () => sectionsService.delete('schoolId', 'sectionId', token), NotFoundError);
    });

    it(`should succeed in deleting a section`, async () => {
        let called = false;
        repositoryReturns(Repo.sections, { delete: () => { called = true; }, findOne: () => ({ sectionId: 'sectionId' }) });
        await sectionsService.delete('schoolId', 'sectionId', token);
        expect(called).equal(true);
    });


    it(`should fail to get students because the token is missing/invalid`, async () => {
        await tryAndExpect(async () => sectionsService.getStudents('schoolId', 'sectionId', <any>undefined), ForbiddenError);
    });

    it(`should fail to get students because the section was not found`, async () => {
        repositoryReturns(Repo.sections, { findOne: () => undefined });
        const result = await sectionsService.getStudents('schoolId', 'sectionId', token);
        expect(result).equal(undefined);
    });

    it(`should succeed in getting students`, async () => {
        const students = ['abu sameer'];
        repositoryReturns(Repo.sections, { findOne: () => ({ students }) });
        const result = await sectionsService.getStudents('schoolId', 'sectionId', token);
        expect(result).to.deep.equal(students);
    });

    it(`should fail to register students because token is missing/invalid`, async () => {
        await tryAndExpect(async () => sectionsService.registerStudents('schoolId', 'sectionId', [], <any>undefined), ForbiddenError);
    });

    it(`should fail to register students because no students ids were provided`, async () => {
        await tryAndExpect(async () => sectionsService.registerStudents('schoolId', 'sectionId', [], token), InvalidRequestError);
    });

    it(`should fail to register students because the section was not found in that school`, async () => {
        repositoryReturns(Repo.sections, { findOne: () => undefined });
        await tryAndExpect(async () => sectionsService.registerStudents('schoolId', 'sectionId', ['abu sameer'], token), NotFoundError);
    });

    it(`should fail to register students because all students are already registered in the section`, async () => {
        repositoryReturns(Repo.sections, { findOne: () => ({ students: ['abu sameer'] }) });
        await tryAndExpect(async () => sectionsService.registerStudents('schoolId', 'sectionId', ['abu sameer'], token), InvalidRequestError);
    });

    it(`should fail to register students because students were not found in db`, async () => {
        repositoryReturns(Repo.sections, { findOne: () => ({ students: ['abu abdo'] }) });
        repositoryReturns(Repo.users, { findMany: () => [] });
        await tryAndExpect(async () => sectionsService.registerStudents('schoolId', 'sectionId', ['abu sameer'], token), NotFoundError);
    });

    it(`should succeed to register students in section`, async () => {
        repositoryReturns(Repo.sections, { findOne: () => ({ students: ['abu abdo'] }), addStudents: () => true });
        repositoryReturns(Repo.users, { findMany: () => [{ _id: 'abu sameer' }] });
        const result = await sectionsService.registerStudents('schoolId', 'sectionId', ['abu sameer'], token);
        expect(result).equal(true);
    });

    it(`should fail to remove students because token is missing/invalid`, async () => {
        await tryAndExpect(() => sectionsService.removeStudents('schoolId', 'sectionId', ['abu sameer'], <any>undefined), ForbiddenError);
    });

    it(`should fail to remove students because section Id is invalid`, async () => {
        repositoryReturns(Repo.sections, { findOne: () => undefined })
        await tryAndExpect(() => sectionsService.removeStudents('schoolId', 'sectionId', ['abu sameer'], token), NotFoundError);
    });

    it(`should succeed in removing students`, async () => {
        repositoryReturns(Repo.sections, { findOne: () => ({ students: ['abu sameer', 'abu abdo'] }), removeStudents: () => { } });
        repositoryReturns(Repo.courses, { finishUsersInCourses: () => undefined });
        let called = false;
        _unitOfWorkStub.commit = () => { called = true; };
        await sectionsService.removeStudents('schoolId', 'sectionId', ['abu sameer'], token);
        expect(called).equal(true);
    });
});