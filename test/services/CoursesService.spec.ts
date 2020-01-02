import 'mocha';
import sinon from 'sinon';
import chai from 'chai';
chai.use(require('sinon-chai'));
const expect = chai.expect;

import { UnitOfWork } from '@saal-oryx/unit-of-work';
import { CoursesService } from '../../src/services/CoursesService';
import { Repo } from '../../src/repositories/RepoNames';
import { UpdatesProcessor } from '../../src/services/UpdatesProcessor';
import { CommandsProcessor } from '../../src/services/CommandsProcessor';
import config from '../../src/config';
import { IUserToken } from '../../src/models/IUserToken';
import { ICreateCourseRequest } from '../../src/models/requests/ICourseRequests';
import { ValidationError } from '../../src/exceptions/ValidationError';
import { NotFoundError } from '../../src/exceptions/NotFoundError';
import { InvalidLicenseError } from '../../src/exceptions/InvalidLicenseError';
import { IAcademicTerm } from '../../src/models/entities/Common';

const unitOfWorkStub = sinon.spy(() => sinon.createStubInstance(UnitOfWork));
const updatesProcessorStub = sinon.spy(() => sinon.createStubInstance(UpdatesProcessor));
const commandsProcessorStub = sinon.spy(() => sinon.createStubInstance(CommandsProcessor));

const token = <IUserToken>{ role: [config.authorizedRole] };
const license = { package: { grades: <any>{ ['4']: { math: ['moe'] } } } };
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

const tryAndExpect = async (testFunction: () => Promise<{}>, errorType: any) => {
  try {
    await testFunction();
  } catch (error) {
    expect(error).instanceOf(errorType);
  }
};

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
    repositoryReturns(Repo.schools, { findById: () => ({ license, academicTerms: [{ _id: 'termId', endDate: new Date('1999') }] }) });
    repositoryReturns(Repo.sections, { findOne: () => ({}) });
    await tryAndExpect(() => _coursesService.create({ ...request, academicTermId: 'termId' }, token), InvalidLicenseError);
  });

  it('should fail to create course due to no active academic term found error', async () => {
    repositoryReturns(Repo.schools, { findById: () => ({ license, academicTerms: [{ startDate: new Date('2019'), endDate: new Date('2020') }] }) });
    repositoryReturns(Repo.sections, { findOne: () => ({}) });
    await tryAndExpect(() => _coursesService.create(request, token), InvalidLicenseError);
  });

  it('should succeed to create course in active term without students or teachers', async () => {
    const academicTerm = { startDate: new Date('2019'), endDate: new Date('2099') };
    repositoryReturns(Repo.schools, { findById: () => ({ license, academicTerms: [academicTerm] }) });
    repositoryReturns(Repo.sections, { findOne: () => ({}) });
    repositoryReturns(Repo.courses, { add: course => course });
    const { _id, ...result } = <any>await _coursesService.create(request, token);
    expect(result).to.deep.equal({ ...request, academicTerm, defaultLocale: 'en', isEnabled: true });
  });
});
