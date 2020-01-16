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
import { tryAndExpect } from '../tryAndExpect';
import { UpdatesProcessor } from '../../src/services/processors/UpdatesProcessor';
import { CommandsProcessor } from '@saal-oryx/event-sourcing';


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
    let _sectionsService: SectionsService;
    const repositoryReturns = (repo: Repo, methods: object) => _unitOfWorkStub.getRepository.withArgs(repo).returns(methods);
    beforeEach(() => {
        _unitOfWorkStub = new unitOfWorkStub();
        _updatesProcessorStub = new updatesProcessorStub();
        _commandsProcessorStub = new commandsProcessorStub();
        _sectionsService = new SectionsService(_unitOfWorkStub, _commandsProcessorStub);
        _commandsProcessorStub.sendCommand = (service, method, ...args) => _sectionsService[method.name](...args);
    });

    it('should fail to create section as there is no students', async () => {
        repositoryReturns(Repo.schools, { findById: () => undefined });
        await tryAndExpect(() => _sectionsService.create(createSectionWithNoStudents, token), InvalidLicenseError);
    });

    it('should fail to create section with students', async () => {
        repositoryReturns(Repo.schools, { findById: () => undefined });
        repositoryReturns(Repo.users, { findMany: () => [{ _id: 1 }] });
        await tryAndExpect(() => _sectionsService.create(createSectionWithStudents, token), NotFoundError);
    });

    it('should create section with success response', async () => {
        repositoryReturns(Repo.schools, { findById: () => schoolResponse });
        repositoryReturns(Repo.users, { findMany: () => usersResponse });
        repositoryReturns(Repo.sections, { add: () => sectionResponse });
        const result = await _sectionsService.create(createSectionWithStudents, token);
        expect(result).equal(sectionResponse);
    });


    it('should get section info with success response', async () => {
        repositoryReturns(Repo.sections, { findOne: () => sectionResponse });
        const result = await _sectionsService.get('aldar_ba526', 'ABCSCHOOLOTIPT1_SECTION1_8', token);
        expect(result).equal(sectionResponse);
    });

    it('should list sections by schoolId with success response', async () => {
        repositoryReturns(Repo.sections, { findManyPage: () => allSectionsResponse });
        const result = await _sectionsService.list('aldar_ba526', {
            index: 1,
            size: 1
        }, token);
        expect(result).equal(allSectionsResponse);
    });

});