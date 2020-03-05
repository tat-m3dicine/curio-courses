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
import { ICreateSectionRequest } from '../../src/models/requests/ISectionRequests';
import { InvalidLicenseError } from '../../src/exceptions/InvalidLicenseError';
import { NotFoundError } from '../../src/exceptions/NotFoundError';
import { ISchool } from '../../src/models/entities/ISchool';
import { IUser } from '../../src/models/entities/IUser';
import { ISection } from '../../src/models/entities/ISection';
import { tryAndExpect } from '../utils/tryAndExpect';
import { UpdatesProcessor } from '../../src/services/processors/UpdatesProcessor';
import { CommandsProcessor } from '@saal-oryx/event-sourcing';
import { ForbiddenError } from '../../src/exceptions/ForbiddenError';
import { InvalidRequestError } from '../../src/exceptions/InvalidRequestError';
import { Role } from '../../src/models/Role';
import { UnauthorizedError } from '../../src/exceptions/UnauthorizedError';


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
        sectionsService = new SectionsService(_unitOfWorkStub, _commandsProcessorStub);
        _commandsProcessorStub.sendCommand = (service, method, ...args) => sectionsService[method.name](...args);
    });

    it('should fail to create section because the user is not authorized (not root or principle)', async () => {
        await tryAndExpect(() => sectionsService.create(createSectionWithNoStudents, { ...token, role: [Role.student] }), UnauthorizedError);
    });

    it('should fail to create section as there is no students', async () => {
        repositoryReturns(Repo.schools, { findById: () => undefined });
        await tryAndExpect(() => sectionsService.create(createSectionWithNoStudents, token), InvalidLicenseError);
    });

    it('should fail to create section with students', async () => {
        repositoryReturns(Repo.schools, { findById: () => undefined });
        repositoryReturns(Repo.users, { findMany: () => [{ _id: 1 }] });
        await tryAndExpect(() => sectionsService.create(createSectionWithStudents, token), NotFoundError);
    });

    it('should create section with success response', async () => {
        repositoryReturns(Repo.schools, { findById: () => schoolResponse });
        repositoryReturns(Repo.users, { findMany: () => usersResponse });
        repositoryReturns(Repo.sections, { add: () => sectionResponse });
        const modifiedSection = JSON.parse(JSON.stringify(createSectionWithStudents));
        delete modifiedSection.students; // TODO: check if section needs to have students on create
        const result = await sectionsService.create(modifiedSection, token);
        expect(result).equal(sectionResponse);
    });


    it('should get section info with success response', async () => {
        repositoryReturns(Repo.sections, { findOne: () => sectionResponse });
        const result = await sectionsService.get('aldar_ba526', 'ABCSCHOOLOTIPT1_SECTION1_8', token);
        expect(result).equal(sectionResponse);
    });

    it('should list sections by schoolId with success response', async () => {
        repositoryReturns(Repo.sections, { findManyPage: () => allSectionsResponse });
        const result = await sectionsService.list({ schoolId: 'aldar_ba526' }, { index: 1, size: 1 }, token);
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
        await tryAndExpect(async () => sectionsService.registerStudents('schoolId', 'sectionId', <string[]>[], <any>undefined), ForbiddenError);
    });

    it(`should fail to register students because no students ids were provided`, async () => {
        await tryAndExpect(async () => sectionsService.registerStudents('schoolId', 'sectionId', <string[]>[], token), InvalidRequestError);
    });

    it(`should fail to register students because the section was not found in that school`, async () => {
        repositoryReturns(Repo.sections, { findOne: () => undefined });
        await tryAndExpect(async () => sectionsService.registerStudents('schoolId', 'sectionId', <string[]>['abu sameer'], token), NotFoundError);
    });

    it(`should fail to register students because all students are already registered in the section`, async () => {
        repositoryReturns(Repo.sections, { findOne: () => ({ students: ['abu sameer'] }) });
        await tryAndExpect(async () => sectionsService.registerStudents('schoolId', 'sectionId', <string[]>['abu sameer'], token), InvalidRequestError);
    });

    it(`should fail to register students because number of students in db is not equal to sent students for validation`, async () => {
        repositoryReturns(Repo.sections, { findOne: () => ({ students: ['abu sameer', 'abu abdo'] }) });
        repositoryReturns(Repo.users, { findMany: () => [] });
        await tryAndExpect(async () => sectionsService.registerStudents('schoolId', 'sectionId', <string[]>['abu sameer'], token), NotFoundError);
    });
    it(`should succeed in registering students`, async () => {
        const schoolId = 'schoolId';
        let called = false;
        repositoryReturns(Repo.sections, { findOne: () => ({ students: ['abu sameer', 'abu abdo'] }), addStudents: () => { called = true; } });
        repositoryReturns(Repo.users, { findMany: () => ['student'] });
        await sectionsService.registerStudents(schoolId, 'sectionId', <string[]>['abu sameer'], { ...token, role: [Role.principal], schooluuid: schoolId });
    });

    it(`should fail to remove students because token is missing/invalid`, async () => {
        await tryAndExpect(() => sectionsService.removeStudents('schoolId', 'sectionId', <string[]>['abu sameer'], <any>undefined), ForbiddenError);
    });

    it(`should fail to remove students because section Id is invalid`, async () => {
        repositoryReturns(Repo.sections, { findOne: () => undefined })
        await tryAndExpect(() => sectionsService.removeStudents('schoolId', 'sectionId', <string[]>['abu sameer'], token), NotFoundError);
    });

    it(`should succeed in removing students`, async () => {
        repositoryReturns(Repo.sections, { findOne: () => ({ students: ['abu sameer', 'abu abdo'] }), removeStudents: () => { } });
        repositoryReturns(Repo.courses, { finishUsersInCourses: () => { } });
        let change = false;
        _unitOfWorkStub.commit = () => { change = true; };
        await sectionsService.removeStudents('schoolId', 'sectionId', <string[]>['abu sameer'], token);
        expect(change).equal(true);
    });
});