import 'mocha';
import sinon from 'sinon';
import chai from 'chai';
chai.use(require('sinon-chai'));
const expect = chai.expect;
import { tryAndExpect } from '../utils/tryAndExpect';
import { UnitOfWork } from '@saal-oryx/unit-of-work';
import { SchoolsService } from '../../src/services/SchoolsService';
import { Repo } from '../../src/models/RepoNames';
import { IUserToken } from '../../src/models/IUserToken';
import config from '../../src/config';
import { getTestData, Test } from '../mockData/getTestData';
import { CommandsProcessor, KafkaService } from '@saal-oryx/event-sourcing';
import { ForbiddenError } from '../../src/exceptions/ForbiddenError';
import { IUpdateSchoolRequest, ICreateSchoolRequest, IUpdateUserRequest, IUpdateAcademicTermRequest, IDeleteAcademicTermRequest } from '../../src/models/requests/ISchoolRequests';
import { UnauthorizedError } from '../../src/exceptions/UnauthorizedError';
import { ValidationError } from '../../src/exceptions/ValidationError';
import { Status } from '../../src/models/entities/IUser';
import { IRegistrationAction, RegistrationAction, ISwitchRegistrationAction } from '../../src/models/requests/IRegistrationAction';
import { Role } from '../../src/models/Role';
import { InvalidRequestError } from '../../src/exceptions/InvalidRequestError';
import { InvalidLicenseError } from '../../src/exceptions/InvalidLicenseError';
import { ISchool } from '../../src/models/entities/ISchool';
import { NotFoundError } from '../../src/exceptions/NotFoundError';
import { ConditionalBadRequest } from '../../src/exceptions/ConditionalBadRequest';
const unitOfWorkStub = sinon.spy(() => sinon.createStubInstance(UnitOfWork));
const kafkaServiceStub = sinon.spy(() => sinon.createStubInstance(KafkaService));
const commandsProcessorStub = sinon.spy(() => sinon.createStubInstance(CommandsProcessor));

const clone = object => JSON.parse(JSON.stringify(object));

const getCloneSchool = (): ISchool => clone(getTestData(Test.school));

const requestMockData: IUpdateSchoolRequest | ICreateSchoolRequest = {
  location: 'location',
  locales: {
    ar: {
      name: 'arabic',
      description: 'arabic'
    },
    en: {
      name: 'english',
      description: 'english'
    }
  }
};

const switchRegistrationAction: ISwitchRegistrationAction = {
  fromSchoolId: 'fromSchoolId',
  toSchoolId: 'toSchoolId',
  action: RegistrationAction.switch,
  role: Role.student,
  users: ['id1', 'id2']
}

const registerationActionMockData: IRegistrationAction = {
  role: Role.student,
  schoolId: 'schoolId',
  users: ['user1'],
  action: RegistrationAction.approve
}

// tslint:disable-next-line: no-big-function
describe('School Service', () => {
  let _unitOfWorkStub: any;
  let _kafkaServiceStub: any;
  let _commandsProcessorStub: any;
  let schoolsService: SchoolsService;
  const repositoryReturns = (repo: Repo, methods: object) => _unitOfWorkStub.getRepository.withArgs(repo).returns(methods);

  beforeEach(() => {
    _unitOfWorkStub = new unitOfWorkStub();
    _kafkaServiceStub = new kafkaServiceStub();
    _commandsProcessorStub = new commandsProcessorStub();
    schoolsService = new SchoolsService(_unitOfWorkStub, _commandsProcessorStub, _kafkaServiceStub);
    _commandsProcessorStub.sendCommand = (service, method, ...args) => schoolsService[method.name](...args);
    repositoryReturns(Repo.users, { addRegisteration: () => undefined });
    repositoryReturns(Repo.courses, { getActiveCoursesForUsers: () => [] });
  });

  it(`should fail to update school because the token is invalid/missing`, async () => {
    await tryAndExpect(async () => schoolsService.update(requestMockData, 'schoolId', <any>undefined), ForbiddenError);
  });

  it(`should fail to update school because the user is not root user`, async () => {
    await tryAndExpect(async () => schoolsService.update(requestMockData, 'schoolId', <IUserToken>{ role: [''] }), UnauthorizedError);
  });

  it(`should fail to update school because school was not validated`, async () => {
    const modifiedMockData = clone(requestMockData);
    delete modifiedMockData.locales;
    await tryAndExpect(async () => schoolsService.update(modifiedMockData, 'schoolId', <IUserToken>{ role: [config.authorizedRole] }), ValidationError);
  });

  it(`should succeed in updating school`, async () => {
    let called = false;
    repositoryReturns(Repo.schools, { update: () => { called = true; } });
    await schoolsService.update(requestMockData, 'schoolId', <IUserToken>{ role: [config.authorizedRole] });
    expect(called).equal(true);
  });

  it(`should fail to create school because the token is invalid/missing`, async () => {
    await tryAndExpect(async () => schoolsService.add(<any>{}, <any>undefined), ForbiddenError);
  });

  it(`should fail to create school because the user is not root user`, async () => {
    await tryAndExpect(async () => schoolsService.add(requestMockData, <IUserToken>{ role: [''] }), UnauthorizedError);
  });

  it(`should fail to create school because school was not validated (no locales)`, async () => {
    const modifiedData = clone(requestMockData);
    delete modifiedData.locales;
    await tryAndExpect(() => schoolsService.add(modifiedData, <IUserToken>{ role: [config.authorizedRole] }), ValidationError);
  });

  it(`should succeed in creating school (requires at least 1 locale)`, async () => {
    const mockData = <ICreateSchoolRequest>clone(requestMockData);
    delete mockData!.locales!.en;
    let called = false;
    repositoryReturns(Repo.schools, { add: () => { called = true; } });
    await schoolsService.add(mockData, <IUserToken>{ role: [config.authorizedRole] });
    expect(called).equal(true);
  });

  it(`should fail to list schools because token is missing/invalid`, async () => {
    await tryAndExpect(() => schoolsService.list(<any>{}, <any>undefined), ForbiddenError);
  });

  it(`should succeed in listing schools`, async () => {
    let called = false;
    repositoryReturns(Repo.schools, { findManyPage: () => { called = true; } });
    await schoolsService.list(<any>{}, <IUserToken>{ role: [config.authorizedRole] });
    expect(called).equal(true);
  });

  it(`should succeed in switching schools`, async () => {
    const mockAction: IRegistrationAction = clone(registerationActionMockData);
    mockAction.action = RegistrationAction.withdraw;
    repositoryReturns(Repo.users, { withdraw: () => { }, approveRegistrations: () => { } });
    repositoryReturns(Repo.schools, { releaseLicense: () => { }, consumeLicense: () => { } });
    repositoryReturns(Repo.sections, { removeStudents: () => { } });
    repositoryReturns(Repo.courses, { getActiveCoursesForUsers: () => [{}], finishUsersInCourses: () => { } });
    _kafkaServiceStub.sendMany = () => { };
    let called = false;
    _unitOfWorkStub.commit = () => { called = true; };
    await schoolsService.doSwitch(switchRegistrationAction);
    expect(called).equal(true);
  });

  it(`should fail to delete users because token is missing/invalid`, async () => {
    await tryAndExpect(async () => schoolsService.deleteUsers(<any>{}, 'schoolId', <any>undefined), ForbiddenError);
  });

  it(`should fail to delete users because delete users were not validated`, async () => {
    await tryAndExpect(async () => schoolsService.deleteUsers(<any>{}, 'schoolId', <IUserToken>{ role: [config.authorizedRole] }), ValidationError);
  });

  it(`should succeed in deleting users`, async () => {
    const data = {
      users: ['user1', 'user2']
    };

    let called = false;
    repositoryReturns(Repo.schools, { deleteUsersPermission: () => { called = true } });
    await schoolsService.deleteUsers(data, 'schoolId', <IUserToken>{ role: [config.authorizedRole] });
    expect(called).equal(true);
  });

  it(`should fail to update acdemic term  because token is missing/invalid`, async () => {
    await tryAndExpect(async () => schoolsService.updateAcademicTerm(<any>{}, 'schoolId', <any>undefined), ForbiddenError);
  });

  it(`should fail to update acdemic term because update academic term was not validated`, async () => {
    await tryAndExpect(async () => schoolsService.updateAcademicTerm(<any>{}, 'schoolId', <IUserToken>{ role: [config.authorizedRole] }), ValidationError);
  });

  it(`should fail to update acdemic term because schoolId is invalid`, async () => {
    const data: IUpdateAcademicTermRequest = {
      year: '2000',
      term: 'spring',
      startDate: new Date(),
      endDate: new Date(),
      gracePeriod: 5,
      isEnabled: true
    };
    repositoryReturns(Repo.schools, { findOne: () => undefined });
    await tryAndExpect(() => schoolsService.updateAcademicTerm(data, 'schoolId', <IUserToken>{ role: [config.authorizedRole] }), InvalidRequestError);
  });

  it(`should succeed in updating acdemic term`, async () => {
    const data: IUpdateAcademicTermRequest = {
      year: '2000',
      term: 'spring',
      startDate: new Date(),
      endDate: new Date(),
      gracePeriod: 5,
      isEnabled: true
    };
    repositoryReturns(Repo.schools, { findOne: () => ({ _id: 'schoolId' }), updateAcademicTerm: () => { called = true; } });
    let called = false;
    await schoolsService.updateAcademicTerm(data, 'schoolId', <IUserToken>{ role: [config.authorizedRole] });
    expect(called).equal(true);
  });

  it(`should fail to delete acdemic term  because token is missing/invalid`, async () => {
    await tryAndExpect(async () => schoolsService.deleteAcademicTerm(<any>{}, <any>undefined), ForbiddenError);
  });

  it(`should fail to delete acdemic term because it contains active courses`, async () => {
    repositoryReturns(Repo.courses, { findMany: () => [{}] });
    await tryAndExpect(async () => schoolsService.deleteAcademicTerm(<any>{}, <IUserToken>{ role: [config.authorizedRole] }), ConditionalBadRequest);
  });

  it(`should succeed in deleting academic term`, async () => {
    const data: IDeleteAcademicTermRequest = {
      _id: 'id',
      academicTermId: 'academicTermId'
    };
    repositoryReturns(Repo.courses, { findMany: () => [] });
    let called = false;
    repositoryReturns(Repo.schools, { deleteAcademicTerm: () => { called = true; } });
    await schoolsService.deleteAcademicTerm(data, <IUserToken>{ role: [config.authorizedRole] });
    expect(called).equal(true);
  });

  it(`should fail to patch school because token is missing/invalid`, async () => {
    await tryAndExpect(async () => schoolsService.patch(<any>{}, 'schoolId', <any>undefined), ForbiddenError);
  });

  it(`should fail to patch school because the update school request empty/doesn't exist`, async () => {
    await tryAndExpect(async () => schoolsService.patch(<any>undefined, 'schoolId', <IUserToken>{ role: [config.authorizedRole] }), InvalidRequestError);
  });

  it(`should fail to patch school because request failed validation`, async () => {
    await tryAndExpect(async () => schoolsService.patch(<any>{}, 'schoolId', <IUserToken>{ role: [config.authorizedRole] }), ValidationError);
  });

  it(`should succeed in patching school`, async () => {
    const request: IUpdateSchoolRequest = {
      location: 'location',
      locales: {
        en: {
          name: 'enlgish'
        }
      }
    };
    let called = false;
    repositoryReturns(Repo.schools, { patch: () => { called = true; } });

    await schoolsService.patch(request, 'schoolId', <IUserToken>{ role: [config.authorizedRole] });
    expect(called).equal(true);
  });


  it(`should fail to patch school's license because token is missing/invalid`, async () => {
    await tryAndExpect(async () => schoolsService.patchLicense(<any>{}, 'schoolId', <any>undefined), ForbiddenError);
  });

  it(`should fail to patch school's license because the request failed validation`, async () => {
    await tryAndExpect(async () => schoolsService.patchLicense(<any>{}, 'schoolId', <IUserToken>{ role: [config.authorizedRole] }), ValidationError);
  });

  it(`should fail to patch school's license because the school Id is invalid`, async () => {
    const request = <any>getCloneSchool()!.license;
    request!.validTo = new Date('2030-1-1');
    request!.students = 4;
    request!.teachers = 3;
    delete request!.validFrom
    repositoryReturns(Repo.schools, { findOne: () => undefined });
    await tryAndExpect(async () => schoolsService.patchLicense(request, 'schoolId', <IUserToken>{ role: [config.authorizedRole] }), InvalidRequestError);
  });

  it(`should fail to patch school's license because school's license validation is greater than the request's validation`, async () => {
    const request = <any>getCloneSchool()!.license;
    request!.validTo = new Date('2022-1-1');
    request!.students = 4;
    request!.teachers = 3;
    delete request!.validFrom
    repositoryReturns(Repo.schools, { findOne: () => ({ license: { validTo: new Date('2023-1-1') } }) });
    await tryAndExpect(async () => schoolsService.patchLicense(request, 'schoolId', <IUserToken>{ role: [config.authorizedRole] }), InvalidRequestError);
  });

  it(`should succeed to patch school's license`, async () => {
    const request = <any>getCloneSchool()!.license;
    request!.validTo = new Date('2022-1-1');
    request!.students = 4;
    request!.teachers = 3;
    delete request!.validFrom;
    delete request!.reference;
    let called = false;
    repositoryReturns(Repo.schools, { findOne: () => ({ license: { validTo: new Date('2020-1-1') } }), patch: () => { called = true; } });
    await schoolsService.patchLicense(request, 'schoolId', <IUserToken>{ role: [config.authorizedRole] });
    expect(called).equal(true);

  });
  it(`should succeed in deleting academic term`, async () => {
    const data: IDeleteAcademicTermRequest = {
      _id: 'id',
      academicTermId: 'academicTermId'
    };
    repositoryReturns(Repo.courses, { findMany: () => [] });
    let called = false;
    repositoryReturns(Repo.schools, { deleteAcademicTerm: () => { called = true; } });
    await schoolsService.deleteAcademicTerm(data, <IUserToken>{ role: [config.authorizedRole] });
    expect(called).equal(true);
  });
  //--

  it(`should fail to update users because token is missing/invalid`, async () => {
    await tryAndExpect(async () => schoolsService.updateUsers(<any>{}, 'schoolId', <any>undefined), ForbiddenError);
  });

  it(`should fail to update users because update users were not validated`, async () => {
    await tryAndExpect(async () => schoolsService.updateUsers(<any>{}, 'schoolId', <IUserToken>{ role: [config.authorizedRole] }), ValidationError);
  });

  it(`should fail in updating users because one or more data objects doesn't exist`, async () => {
    const data = {
      users: [{
        _id: 'id1',
        permissions: ['root']
      }, {
        _id: 'id2',
        permissions: ['root']
      }]
    };
    repositoryReturns(Repo.users, { findMany: () => [{}] });
    await tryAndExpect(() => schoolsService.updateUsers(<any>data, 'schoolId', <IUserToken>{ role: [config.authorizedRole] }), NotFoundError);
  });

  it(`should succeed in updating users`, async () => {
    const data = {
      users: [{
        _id: 'id1',
        permissions: ['root']
      }, {
        _id: 'id2',
        permissions: ['root']
      }]
    };
    repositoryReturns(Repo.users, { findMany: () => ['id1', 'id2'] });
    let called = false;
    repositoryReturns(Repo.schools, { updateUsersPermission: () => { called = true; } });
    await schoolsService.updateUsers(<any>data, 'schoolId', <IUserToken>{ role: [config.authorizedRole] });
    expect(called).equal(true);
  });

  it(`should fail to get users because the token is missing/invalid`, async () => {
    await tryAndExpect(() => schoolsService.getUsers(<any>{}, <any>{}, <any>undefined), ForbiddenError);
  });

  it(`should fail to get users because the user is not root user`, async () => {
    await tryAndExpect(async () => schoolsService.getUsers(<any>{}, <any>{}, <IUserToken>{ role: [''] }), UnauthorizedError);
  });

  it(`should succeed in getting users when status is 'all'`, async () => {
    repositoryReturns(Repo.users, { findManyPage: () => ({ test: 1 }) });
    const result = await schoolsService.getUsers(<any>{ status: 'all' }, <any>{}, <IUserToken>{ role: [config.authorizedRole] });
    expect(result).to.deep.equal({ test: 1 });
  });

  it(`should succeed in getting users when status is 'active'`, async () => {
    repositoryReturns(Repo.users, { findManyPage: () => ({ test: 1 }) });
    const result = await schoolsService.getUsers(<any>{ status: Status.active }, <any>{}, <IUserToken>{ role: [config.authorizedRole] });
    expect(result).to.deep.equal({ test: 1 });
  });

  it(`should succeed in getting users when status is 'inactive'`, async () => {
    repositoryReturns(Repo.users, { findManyPage: () => ({ test: 1 }) });
    const result = await schoolsService.getUsers(<any>{ status: Status.inactive }, <any>{}, <IUserToken>{ role: [config.authorizedRole] });
    expect(result).to.deep.equal({ test: 1 });
  });

  it(`should succeed in getting users if status doesn't exist`, async () => {
    repositoryReturns(Repo.users, { findManyPage: () => ({ test: 1 }) });
    const result = await schoolsService.getUsers(<any>{}, <any>{}, <IUserToken>{ role: [config.authorizedRole] });
    expect(result).to.deep.equal({ test: 1 });
  });

  it(`should succeed in getting users if status is none of the above (out of quota)`, async () => {
    repositoryReturns(Repo.users, { findManyPage: () => ({ test: 1 }) });
    const filter = {
      status: Status.outOfQuota,
      role: Role.student,
      schoolId: 'schoolId'
    };
    const result = await schoolsService.getUsers(filter, <any>{}, <IUserToken>{ role: [config.authorizedRole] });
    expect(result).to.deep.equal({ test: 1 });
  });

  it(`should fail to register users because the token is missing/invalid`, async () => {
    await tryAndExpect(async () => schoolsService.registerUsers(<any>{}, <any>undefined), ForbiddenError);
  });

  it(`should fail to register users because users registeration was not validated`, async () => {
    await tryAndExpect(async () => schoolsService.registerUsers(<any>{}, <IUserToken>{ role: [config.authorizedRole] }), ValidationError);
  });

  it(`should fail to register users because the users in school were not validated (withdraw action)`, async () => {
    const data = clone(registerationActionMockData);
    data.action = RegistrationAction.withdraw;
    repositoryReturns(Repo.users, { count: () => 0 });
    await tryAndExpect(async () => schoolsService.registerUsers(data, <IUserToken>{ role: [config.authorizedRole] }), InvalidRequestError);
  });

  // change desc
  it(`should fail to register users because schoolId is invalid`, async () => {
    repositoryReturns(Repo.users, { count: () => 1 });
    repositoryReturns(Repo.schools, { findById: () => undefined });
    await tryAndExpect(async () => schoolsService.registerUsers(registerationActionMockData, <IUserToken>{ role: [config.authorizedRole] }), InvalidRequestError)
  });

  it(`should fail in registering users because school has no license`, async () => {
    const mockSchool = getCloneSchool();
    delete mockSchool.license;
    repositoryReturns(Repo.users, { count: () => 1 });
    repositoryReturns(Repo.schools, { findById: () => mockSchool });
    await tryAndExpect(async () => schoolsService.registerUsers(registerationActionMockData, <IUserToken>{ role: [config.authorizedRole] }), InvalidLicenseError);
  });

  it(`should fail in registering users because school's license validty is expired`, async () => {
    const mockSchool = getCloneSchool();
    mockSchool.license!.validFrom = new Date(1);
    mockSchool.license!.validTo = new Date(999999999999999999);
    repositoryReturns(Repo.users, { count: () => 1 });
    repositoryReturns(Repo.schools, { findById: () => mockSchool });
    await tryAndExpect(async () => schoolsService.registerUsers(registerationActionMockData, <IUserToken>{ role: [config.authorizedRole] }), InvalidLicenseError);
  });

  it(`should fail in registering users because school's license quota is over`, async () => {
    const mockSchool = getCloneSchool();
    mockSchool.license!.students!.max = 0;
    mockSchool.license!.validFrom = new Date('2019-1-1');
    mockSchool.license!.validTo = new Date('2029-1-1');
    repositoryReturns(Repo.users, { count: () => 1 });
    repositoryReturns(Repo.schools, { findById: () => mockSchool });
    await tryAndExpect(async () => schoolsService.registerUsers(registerationActionMockData, <IUserToken>{ role: [config.authorizedRole] }), InvalidLicenseError);
  });

  it(`should succeed in registering user`, async () => {
    const mockSchool = getCloneSchool();
    mockSchool.license!.validFrom = new Date('2019-1-1');
    mockSchool.license!.validTo = new Date('2029-1-1');
    repositoryReturns(Repo.users, { approveRegistrations: () => { }, count: () => 1 });
    repositoryReturns(Repo.schools, { findById: () => mockSchool, consumeLicense: () => { } });
    let called = false;
    _kafkaServiceStub.sendMany = () => { called = true; };
    await schoolsService.registerUsers(registerationActionMockData, <IUserToken>{ role: [config.authorizedRole] });
    expect(called).equal(true);
  });

  it(`should fail to register user because school validation action was 'reject'`, async () => {
    const mockSchool = getCloneSchool();
    const mockAction: IRegistrationAction = clone(registerationActionMockData);
    mockAction.action = RegistrationAction.reject;
    repositoryReturns(Repo.users, { count: () => 1, reject: () => { } });
    repositoryReturns(Repo.schools, { findById: () => mockSchool });
    const result = await schoolsService.registerUsers(mockAction, <IUserToken>{ role: [config.authorizedRole] });
    expect(result).to.deep.equal({ ok: 1 });
  });

  it(`should fail to register user because school validation action was 'withdraw'`, async () => {
    const mockSchool = getCloneSchool();
    const mockAction: IRegistrationAction = clone(registerationActionMockData);
    mockAction.action = RegistrationAction.withdraw;
    repositoryReturns(Repo.users, { count: () => 1, withdraw: () => { } });
    repositoryReturns(Repo.schools, { findById: () => mockSchool, releaseLicense: () => { } });
    repositoryReturns(Repo.sections, { removeStudents: () => { } });
    repositoryReturns(Repo.courses, { getActiveCoursesForUsers: () => [{}], finishUsersInCourses: () => { } });
    _kafkaServiceStub.sendMany = () => { };
    let called = false;
    _unitOfWorkStub.commit = () => { called = true; };
    await schoolsService.registerUsers(mockAction, <IUserToken>{ role: [config.authorizedRole] });
    expect(called).equal(true);
  });

  it(`should throw an error because the action is invalid in validating users in school`, async () => {
    const mockAction: IRegistrationAction = clone(registerationActionMockData);
    const mockSchool = getCloneSchool();
    mockAction.action = <any>'randomAction';
    repositoryReturns(Repo.schools, { findById: () => mockSchool });
    repositoryReturns(Repo.users, { count: () => 1 });
    await tryAndExpect(async () => schoolsService.registerUsers(mockAction, <IUserToken>{ role: [config.authorizedRole] }), InvalidRequestError);
  });

  it(`should succeed in deleting school`, async () => {
    let called = false;
    repositoryReturns(Repo.schools, { delete: () => { called = true; } });
    await schoolsService.delete('schoolId', <IUserToken>{ role: [config.authorizedRole] });
    expect(called).equal(true);
  });

  it(`should fail to get shool because token is missing/invalid`, async () => {
    await tryAndExpect(async () => schoolsService.get('scoolId', <any>undefined), ForbiddenError);
  });

  it(`should succeed in getting school`, async () => {
    let called = false;
    repositoryReturns(Repo.schools, { findById: () => { called = true; } });
    await schoolsService.get('schoolId', <IUserToken>{ role: [config.authorizedRole] });
    expect(called).equal(true);
  });

  it(`should succeed in adding many schools`, async () => {
    let called = false;
    repositoryReturns(Repo.schools, { addMany: () => { called = true; } });
    await schoolsService.doAddMany(<any>{});
    expect(called).equal(true);
  });

});
