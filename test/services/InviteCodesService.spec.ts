import 'mocha';
import sinon from 'sinon';
import chai, { expect } from 'chai';
chai.use(require('sinon-chai'));

import clone from '../utils/clone';
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
import { ICourse } from '../../src/models/entities/ICourse';

const unitOfWorkStub = sinon.spy(() => sinon.createStubInstance(UnitOfWork));
const commandsProcessorStub = sinon.spy(() => sinon.createStubInstance(CommandsProcessor));

const course = <ICourse>{ _id: 'course1', schoolId: 'school1', sectionId: 'section1' };
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
  let invCode: IInviteCode;
  let school: ISchool;
  let _unitOfWorkStub: any;
  let _commandsProcessorStub: any;
  let inviteCodesService: InviteCodesService;
  const repositoryReturns = (repo: Repo, methods: object) => _unitOfWorkStub.getRepository.withArgs(repo).returns(methods);

  beforeEach(() => {
    invCode = clone(getTestData(Test.inviteCode));
    school = clone(getTestData(Test.school));
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

  it('should succeed to create an invite code with "auto" enrollment type', async () => {
    const school = getTestData(Test.school);
    repositoryReturns(Repo.schools, { findById: () => school });
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

  it(`should succeed to list all invite codes in a school with enrollment type filter (as principal)`, async () => {
    const schoolId = 'schoolId';
    repositoryReturns(Repo.inviteCodes, { findManyPage: () => ['code1', 'code2'] });
    const result = await inviteCodesService.list({ schoolId, type: EnrollmentType.auto }, <IPaging>{}, <any>{ role: Role.principal, schooluuid: schoolId });
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

  it('should fail to get invite code from a school with all info because invite code is missing', async () => {
    repositoryReturns(Repo.inviteCodes, { getValidCode: () => undefined });
    await tryAndExpect(async () => inviteCodesService.getWithAllInfo('code1', token), NotFoundError);
  });

  it('should fail to get invite code from a school because invite code is out of quota', async () => {
    invCode!.quota!.consumed = 10;
    invCode!.quota!.max = 9;
    repositoryReturns(Repo.inviteCodes, { getValidCode: () => invCode });
    await tryAndExpect(async () => inviteCodesService.getWithAllInfo('code1', token), InvalidRequestError);
  });

  it('should fail to get invite code from a school because section is undefined', async () => {
    repositoryReturns(Repo.inviteCodes, { getValidCode: () => invCode });
    repositoryReturns(Repo.schools, { findById: () => ({}) });
    repositoryReturns(Repo.sections, { findById: () => undefined });
    await tryAndExpect(async () => inviteCodesService.getWithAllInfo('code1', token), NotFoundError);
  });

  it('should succeed in getting invite code from a school (enrollment type: courses)', async () => {
    invCode.enrollment.type = EnrollmentType.courses;
    invCode.enrollment.courses = ['course1'];
    invCode!.quota!.consumed = 9;
    invCode!.quota!.max = 10;
    repositoryReturns(Repo.inviteCodes, { getValidCode: () => invCode });
    repositoryReturns(Repo.schools, { findById: () => school });
    repositoryReturns(Repo.sections, { findById: () => ({}) });
    repositoryReturns(Repo.courses, { findMany: () => [course] });
    const result = await inviteCodesService.getWithAllInfo('code1', token);
    expect(Object.keys(result)).to.have.lengthOf(5); // change?
  });

  it('should succeed in getting invite code from a school (enrollment type: auto)', async () => {
    invCode.enrollment.courses = ['course1'];
    invCode!.quota!.consumed = 9;
    invCode!.quota!.max = 10;
    repositoryReturns(Repo.inviteCodes, { getValidCode: () => invCode });
    repositoryReturns(Repo.schools, { findById: () => school });
    repositoryReturns(Repo.sections, { findById: () => ({}) });
    repositoryReturns(Repo.courses, { findMany: () => [course] });
    const result = await inviteCodesService.getWithAllInfo('code1', token);
    expect(Object.keys(result)).to.have.lengthOf(5);
  });
});
