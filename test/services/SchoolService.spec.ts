import 'mocha';
import sinon from 'sinon';
import chai from 'chai';
chai.use(require('sinon-chai'));
const expect = chai.expect;

import { tryAndExpect } from '../utils/tryAndExpect';
import { UnitOfWork, defaultPaging } from '@saal-oryx/unit-of-work';
import { SchoolsService } from '../../src/services/SchoolsService';
import { Repo } from '../../src/models/RepoNames';
import { IUserToken } from '../../src/models/IUserToken';
import config from '../../src/config';
import { schoolRequest, getTestData, Test } from '../mockData/getTestData';
import { CommandsProcessor, KafkaService } from '@saal-oryx/event-sourcing';
import { ForbiddenError } from '../../src/exceptions/ForbiddenError';
import { IUpdateSchoolRequest, ICreateSchoolRequest, IUpdateUserRequest } from '../../src/models/requests/ISchoolRequests';
import { UnauthorizedError } from '../../src/exceptions/UnauthorizedError';
import { ValidationError } from '../../src/exceptions/ValidationError';
import { NotFoundError } from '../../src/exceptions/NotFoundError';
import { reporters } from 'mocha';
import { UsersRepository } from '../../src/repositories/UsersRepository';
import { Status } from '../../src/models/entities/IUser';
import { IRegistrationAction, RegistrationAction } from '../../src/models/requests/IRegistrationAction';
import { Role } from '../../src/models/Role';
import { InvalidRequestError } from '../../src/exceptions/InvalidRequestError';

const unitOfWorkStub = sinon.spy(() => sinon.createStubInstance(UnitOfWork));
const kafkaServiceStub = sinon.spy(() => sinon.createStubInstance(KafkaService));
const commandsProcessorStub = sinon.spy(() => sinon.createStubInstance(CommandsProcessor));

const clone = (object: any) => JSON.parse(JSON.stringify(object));

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

const registerationActionMockData: IRegistrationAction = {
  role: Role.student,
  schoolId: 'schoolId',
  users: ['user1'],
  action: RegistrationAction.approve
}

// tslint:disable-next-line: no-big-function
describe('Schools Service', () => {
  let _unitOfWorkStub: any;
  let _kafkaServiceStub: any;
  let _commandsProcessorStub: any;
  let schoolService: SchoolsService;
  const repositoryReturns = (repo: Repo, methods: object) => _unitOfWorkStub.getRepository.withArgs(repo).returns(methods);

  beforeEach(() => {
    _unitOfWorkStub = new unitOfWorkStub();
    _kafkaServiceStub = new kafkaServiceStub();
    _commandsProcessorStub = new commandsProcessorStub();
    schoolService = new SchoolsService(_unitOfWorkStub, _commandsProcessorStub, _kafkaServiceStub);
    repositoryReturns(Repo.users, { addRegisteration: () => undefined });
    repositoryReturns(Repo.courses, { getActiveCoursesForUsers: () => [] });
  });

  it('should able to create the school, with valid request', async () => {
    _commandsProcessorStub.sendCommand.resolves({ result: { done: true } });
    await schoolService.add(schoolRequest, <IUserToken>{ role: [config.authorizedRole] });
  });

  it(`should fail to update school because the token is invalid/missing`, async () => {
    await tryAndExpect(async () => schoolService.update(requestMockData, 'schoolId', <any>undefined), ForbiddenError);
  });

  it(`should fail to update school because the user is not root user`, async () => {
    await tryAndExpect(async () => schoolService.update(requestMockData, 'schoolId', <IUserToken>{ role: [''] }), UnauthorizedError);
  });

  it(`should fail to update school because school was not validated`, async () => {
    const modifiedMockData = JSON.parse(JSON.stringify(requestMockData));
    delete modifiedMockData.locales.en;
    await tryAndExpect(() => schoolService.update(modifiedMockData, 'schoolId', <IUserToken>{ role: [config.authorizedRole] }), ValidationError);
  });

  it(`should succeed in updating school`, async () => {
    _commandsProcessorStub.sendCommand.resolves({ result: { done: true } });
    await schoolService.update(requestMockData, 'schoolId', <IUserToken>{ role: [config.authorizedRole] });
  });

  it(`should fail to create school because the token is invalid/missing`, async () => {
    await tryAndExpect(async () => schoolService.add(<any>{}, <any>undefined), ForbiddenError);
  });

  it(`should fail to create school because the user is not root user`, async () => {
    await tryAndExpect(async () => schoolService.add(requestMockData, <IUserToken>{ role: [''] }), UnauthorizedError);
  });

  it(`should fail to create school because school was not validated`, async () => {
    const modifiedData = JSON.parse(JSON.stringify(requestMockData));
    delete modifiedData.locales.en;
    await tryAndExpect(() => schoolService.add(modifiedData, <IUserToken>{ role: [config.authorizedRole] }), ValidationError);
  });

  it(`should succeed in creating school with default locale language other than en`, async () => {
    _commandsProcessorStub.sendCommand.resolves({ result: { done: true } });
    const modifiedMockData = JSON.parse(JSON.stringify(requestMockData));
    delete modifiedMockData.locales.en;
    await schoolService.add(modifiedMockData, <IUserToken>{ role: [config.authorizedRole] });
  });

  it(`should fail to list schools because token is missing/invalid`, async () => {
    await tryAndExpect(() => schoolService.list(<any>{}, <any>undefined), ForbiddenError);
  });

  // it.only(`should succeed in listing schools`, async () => {
  //   repositoryReturns(Repo.schools, { findManyPage: () => { } });
  //   const result = await schoolService.list(<any>{}, <IUserToken>{ role: [config.authorizedRole] });
  //   console.log(`result`, result);
  //   expect(1).equal(1);
  // });

  it(`should fail to update users because token is missing/invalid`, async () => {
    await tryAndExpect(async () => schoolService.updateUsers(<any>{}, 'schoolId', <any>undefined), ForbiddenError);
  });

  it(`should fail to update users because update users were not validated`, async () => {
    await tryAndExpect(async () => schoolService.updateUsers(<any>{}, 'schoolId', <IUserToken>{ role: [config.authorizedRole] }), ValidationError);
  });

  // it.only(`should fail in updating users because one or more data objects doesn't exist`, async () => {
  //   const data = {
  //     users: [{
  //       _id: 'id1',
  //       permissions: ['root']
  //     }, {
  //       _id: 'id2',
  //       permissions: ['root']
  //     }]
  //   };

  //   repositoryReturns(Repo.users, { findMany: () => undefined }); // undefined
  //   await tryAndExpect(() => schoolService.updateUsers(<any>data, 'schoolId', <IUserToken>{ role: [config.authorizedRole] }), NotFoundError);
  // });

  it(`should fail to get users because the token is missing/invalid`, async () => {
    await tryAndExpect(() => schoolService.getUsers(<any>{}, <any>{}, <any>undefined), ForbiddenError);
  });

  it(`should fail to get users because the user is not root user`, async () => {
    await tryAndExpect(async () => schoolService.getUsers(<any>{}, <any>{}, <IUserToken>{ role: [''] }), UnauthorizedError);
  });

  it(`should succeed in getting users when status is 'all'`, async () => {
    repositoryReturns(Repo.users, { findManyPage: () => ({ test: 1 }) });
    const result = await schoolService.getUsers(<any>{ status: 'all' }, <any>{}, <IUserToken>{ role: [config.authorizedRole] });
    expect(result).to.deep.equal({ test: 1 });
  });

  it(`should succeed in getting users when status is 'active'`, async () => {
    repositoryReturns(Repo.users, { findManyPage: () => ({ test: 1 }) });
    const result = await schoolService.getUsers(<any>{ status: Status.active }, <any>{}, <IUserToken>{ role: [config.authorizedRole] });
    expect(result).to.deep.equal({ test: 1 });
  });

  it(`should succeed in getting users when status is 'inactive'`, async () => {
    repositoryReturns(Repo.users, { findManyPage: () => ({ test: 1 }) });
    const result = await schoolService.getUsers(<any>{ status: Status.inactive }, <any>{}, <IUserToken>{ role: [config.authorizedRole] });
    expect(result).to.deep.equal({ test: 1 });
  });

  it(`should succeed in getting users if status doesn't exist`, async () => {
    repositoryReturns(Repo.users, { findManyPage: () => ({ test: 1 }) });
    const result = await schoolService.getUsers(<any>{}, <any>{}, <IUserToken>{ role: [config.authorizedRole] });
    expect(result).to.deep.equal({ test: 1 });
  });

  it(`should succeed in getting users if status is none of the above (out of quota)`, async () => {
    repositoryReturns(Repo.users, { findManyPage: () => ({ test: 1 }) });
    const result = await schoolService.getUsers(<any>{ status: Status.outOfQuota }, <any>{}, <IUserToken>{ role: [config.authorizedRole] });
    expect(result).to.deep.equal({ test: 1 });
  });

  it(`should fail to register users because the token is missing/invalid`, async () => {
    await tryAndExpect(async () => schoolService.registerUsers(<any>{}, <any>undefined), ForbiddenError);
  });

  it.only(`should fail to register users because users registeration was not validated`, async () => {
    await tryAndExpect(async () => schoolService.registerUsers(<any>{}, <IUserToken>{ role: [config.authorizedRole] }), ValidationError);
  });

  it(`should fail to register users because the users in school were not validated (withdraw action)`, async () => {
    const data = clone(registerationActionMockData);
    data.action = RegistrationAction.withdraw;
    repositoryReturns(Repo.users, { count: () => 0 });
    await tryAndExpect(async () => schoolService.registerUsers(data, <IUserToken>{ role: [config.authorizedRole] }), InvalidRequestError);
  });

  it.only(`should fail to register users because the users in school were not validated (other actions)`, async () => {
    const data = clone(registerationActionMockData);
    data.action = RegistrationAction.reject;
    repositoryReturns(Repo.users, { count: () => 0 });
    await tryAndExpect(async () => schoolService.registerUsers(data, <IUserToken>{ role: [config.authorizedRole] }), InvalidRequestError);
  });
});
