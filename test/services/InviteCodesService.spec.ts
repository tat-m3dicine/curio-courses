import 'mocha';
import sinon from 'sinon';
import chai, { expect } from 'chai';
chai.use(require('sinon-chai'));

import { UnitOfWork, IPaging } from '@saal-oryx/unit-of-work';
import { InviteCodesService } from '../../src/services/InviteCodesService';
import { Repo } from '../../src/models/RepoNames';
import { IUserToken } from '../../src/models/IUserToken';
import config from '../../src/config';
import { tryAndExpect } from '../utils/tryAndExpect';
import { ForbiddenError } from '../../src/exceptions/ForbiddenError';
import { Role } from '../../src/models/Role';
import { UnauthorizedError } from '../../src/exceptions/UnauthorizedError';
import { NotFoundError } from '../../src/exceptions/NotFoundError';
import { ICreateInviteCodeRequest } from '../../src/models/requests/IInviteCodeRequests';
import { EnrollmentType, IInviteCode } from '../../src/models/entities/IInviteCode';
import { InvalidRequestError } from '../../src/exceptions/InvalidRequestError';
import { getTestData, Test } from '../mockdata/getTestData';
import { InvalidLicenseError } from '../../src/exceptions/InvalidLicenseError';
import { SignupMethods, ISchool } from '../../src/models/entities/ISchool';
import { CommandsProcessor } from '@saal-oryx/event-sourcing';

const unitOfWorkStub = sinon.spy(() => sinon.createStubInstance(UnitOfWork));
const commandsProcessorStub = sinon.spy(() => sinon.createStubInstance(CommandsProcessor));

const clone = (object: any) => JSON.parse(JSON.stringify(object));
const inviteCodeMockData: IInviteCode = clone(getTestData(Test.inviteCode));
const schoolMockData: ISchool = clone(getTestData(Test.school));


const token = <IUserToken>{ role: [config.authorizedRole] };
const request: ICreateInviteCodeRequest = {
  schoolId: 'school1',
  quota: 10,
  validity: {
    fromDate: new Date('2019'),
    toDate: new Date('2021')
  },
  enrollment: {
    sectionId: 'section1',
    type: EnrollmentType.auto
  }
};

describe('Invite Codes Service', () => {
  let _unitOfWorkStub: any;
  let _commandsProcessorStub: any;
  let inviteCodesService: InviteCodesService;
  const repositoryReturns = (repo: Repo, methods: object) => _unitOfWorkStub.getRepository.withArgs(repo).returns(methods);

  beforeEach(() => {
    _unitOfWorkStub = new unitOfWorkStub();
    _commandsProcessorStub = new commandsProcessorStub();
    _commandsProcessorStub.sendCommand = (service, method, ...args) => inviteCodesService[method.name](...args);
    inviteCodesService = new InviteCodesService(_unitOfWorkStub, _commandsProcessorStub);
  });

  it('should fail to create invite code due to school not found error', async () => {
    repositoryReturns(Repo.schools, { findById: () => undefined });
    await tryAndExpect(() => inviteCodesService.create(request, token), NotFoundError);
  });

  it('should fail to create invite code due to section not found error', async () => {
    repositoryReturns(Repo.schools, { findById: () => ({}) });
    repositoryReturns(Repo.sections, { findOne: () => undefined });
    await tryAndExpect(() => inviteCodesService.create(request, token), NotFoundError);
  });

  it('should fail to create invite code due to courses not provided in "courses" mode', async () => {
    repositoryReturns(Repo.schools, { findById: () => ({}) });
    repositoryReturns(Repo.sections, { findOne: () => ({}) });
    const _request = { ...request, enrollment: { ...request.enrollment, type: EnrollmentType.courses } };
    await tryAndExpect(() => inviteCodesService.create(_request, token), InvalidRequestError);
  });

  it('should fail to create invite code due to some courses not found in "courses" mode', async () => {
    repositoryReturns(Repo.schools, { findById: () => ({}) });
    repositoryReturns(Repo.sections, { findOne: () => ({}) });
    repositoryReturns(Repo.courses, { findMany: () => [] });
    const _request = { ...request, enrollment: { ...request.enrollment, type: EnrollmentType.courses, courses: ['course1', 'course2'] } };
    await tryAndExpect(() => inviteCodesService.create(_request, token), NotFoundError);
  });

  it('should fail to create invite code due to school has no license error', async () => {
    const school = getTestData(Test.school, { license: {} });
    repositoryReturns(Repo.schools, { findById: () => school });
    repositoryReturns(Repo.sections, { findOne: () => ({}) });
    await tryAndExpect(() => inviteCodesService.create(request, token), InvalidLicenseError);
  });

  it('should fail to create invite code because school does not support invite codes', async () => {
    const school = getTestData(Test.school, { license: { package: { signupMethods: [SignupMethods.auto] } } });
    repositoryReturns(Repo.schools, { findById: () => school });
    repositoryReturns(Repo.sections, { findOne: () => ({}) });
    await tryAndExpect(() => inviteCodesService.create(request, token), InvalidLicenseError);
  });

  it(`should fail to create an invite code if the enrollment type is 'auto'`, async () => {
    const school = getTestData(Test.school);
    repositoryReturns(Repo.schools, { findById: () => school });
    repositoryReturns(Repo.sections, { findOne: () => ({}) });
    repositoryReturns(Repo.inviteCodes, { add: () => true });
    await tryAndExpect(async () => inviteCodesService.create(request, token), InvalidLicenseError);

  });

  it(`should succeed to create an invite code with 'invite code' enrollment type`, async () => {
    schoolMockData.license!.package!.signupMethods = [SignupMethods.inviteCodes];
    repositoryReturns(Repo.schools, { findById: () => schoolMockData });
    repositoryReturns(Repo.sections, { findOne: () => ({}) });
    repositoryReturns(Repo.inviteCodes, { add: () => true });
    const result = await inviteCodesService.create(request, token);
    expect(result).equal(true);
  });

  it('should fail to authorize user as no token is sent', async () => {
    await tryAndExpect(() => inviteCodesService.getForSchool('school1', 'code1', <any>undefined), ForbiddenError);
  });

  it('should fail to authorize user as role is not "root"', async () => {
    await tryAndExpect(() => inviteCodesService.getForSchool('school1', 'code1', <IUserToken>{ role: [Role.teacher] }), UnauthorizedError);
  });

  it('should succeed to get invite code in school by id', async () => {
    repositoryReturns(Repo.inviteCodes, { findOne: ({ _id }) => _id });
    const result = await inviteCodesService.getForSchool('school1', 'code1', token);
    expect(result).equal('code1');
  });

  it('should succeed to list all invite codes in school', async () => {
    repositoryReturns(Repo.inviteCodes, { findManyPage: () => ['code1', 'code2'] });
    const result = await inviteCodesService.list({ schoolId: 'school1' }, <IPaging>{}, token);
    expect(result).to.have.lengthOf(2);
  });

  it('should fail to delete an invite code due to not found error', async () => {
    repositoryReturns(Repo.inviteCodes, { findOne: () => undefined });
    await tryAndExpect(() => inviteCodesService.delete('school1', 'code1', token), NotFoundError);
  });

  it('should succeed to delete an invite code from school by id', async () => {
    repositoryReturns(Repo.inviteCodes, { findOne: () => 'code1', delete: () => true });
    const result = await inviteCodesService.delete('school1', 'code1', token);
    expect(result).equal(true);
  });

  it(`should fail to return all info of the invite code because token is missing/invalid`, async () => {
    await tryAndExpect(async () => inviteCodesService.getWithAllInfo('codeid', <any>undefined), ForbiddenError);
  });

  it(`should fail to return all info of the invite code (Not found)`, async () => {
    repositoryReturns(Repo.inviteCodes, { getValidCode: () => undefined });
    await tryAndExpect(async () => inviteCodesService.getWithAllInfo('codeid', token), NotFoundError);
  });

  it(`should fail to return all info of the invite code because invite code is out of quota`, async () => {
    repositoryReturns(Repo.inviteCodes, { getValidCode: () => ({ ...inviteCodeMockData, quota: { consumed: 15, max: 10 } }) });
    await tryAndExpect(async () => inviteCodesService.getWithAllInfo('codeid', token), InvalidRequestError);
  });

  it(`should fail to return all info of the invite code because school/section doesn't exist`, async () => {
    repositoryReturns(Repo.inviteCodes, { getValidCode: () => inviteCodeMockData });
    repositoryReturns(Repo.schools, { findById: () => ({}) });
    repositoryReturns(Repo.sections, { findById: () => undefined });
    await tryAndExpect(async () => inviteCodesService.getWithAllInfo('codeid', token), NotFoundError);
  });

  it(`should succeed in returning all info of the invite code`, async () => {
    repositoryReturns(Repo.inviteCodes, { getValidCode: () => ({ ...inviteCodeMockData, enrollment: { ...inviteCodeMockData.enrollment, type: EnrollmentType.courses } }) });
    repositoryReturns(Repo.schools, { findById: () => schoolMockData });
    repositoryReturns(Repo.sections, { findById: () => ({ section: '1' }) });
    const courses = ['course1'];
    repositoryReturns(Repo.courses, { findMany: () => courses });
    const result = await inviteCodesService.getWithAllInfo('codeid', token);
    expect(result.courses).to.deep.equal(courses);
  });

  it(`should fail to list invite codes because token is missing/invalid`, async () => {
    await tryAndExpect(async () => inviteCodesService.list({ schoolId: 'schoolId' }, <any>{}, <any>undefined), ForbiddenError);
  });

  it(`should succeed in lisitng invite codes (as principal)`, async () => {
    const schoolId = 'schoolId';
    const modifiedToken = <IUserToken>{ role: [Role.principal], schooluuid: schoolId };
    let called = false;
    repositoryReturns(Repo.inviteCodes, { findManyPage: () => { called = true; } });
    await inviteCodesService.list({ schoolId: 'schoolId' }, <any>{}, modifiedToken);
    expect(called).equal(true);
  });


});
