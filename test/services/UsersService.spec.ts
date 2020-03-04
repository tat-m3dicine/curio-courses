import 'mocha';
import sinon from 'sinon';
import chai, { expect } from 'chai';
chai.use(require('sinon-chai'));

import { tryAndExpect } from '../utils/tryAndExpect';
import { UnitOfWork } from '@saal-oryx/unit-of-work';
import { UsersService } from '../../src/services/UsersService';
import { Repo } from '../../src/models/RepoNames';
import { Status } from '../../src/models/entities/IUser';
import { getTestData, Test } from '../mockdata/getTestData';
import { SignupMethods, ISchool } from '../../src/models/entities/ISchool';
import { IInviteCode } from '../../src/models/entities/IInviteCode';
import { ISignupRequest } from '../../src/models/entities/IIRP';
import { IProvider } from '../../src/models/entities/IProvider';
import { IUserUpdatedData } from '../../src/models/events/IUserUpdatedEvent';
import { Role } from '../../src/models/Role';
import { NotFoundError } from '../../src/exceptions/NotFoundError';
import { InvalidRequestError } from '../../src/exceptions/InvalidRequestError';
import { KafkaService } from '@saal-oryx/event-sourcing';

const unitOfWorkStub = sinon.spy(() => sinon.createStubInstance(UnitOfWork));
const kafkaServiceStub = sinon.spy(() => sinon.createStubInstance(KafkaService));

// tslint:disable-next-line: no-big-function
describe('Users Service', () => {
  let _unitOfWorkStub: any;
  let _kafkaServiceStub: any;
  let usersService: UsersService;
  const repositoryReturns = (repo: Repo, methods: object) => _unitOfWorkStub.getRepository.withArgs(repo, true).returns(methods);
  const validateOutput = (isAsExpected: (updates: IUserUpdatedData) => void) => _kafkaServiceStub.send = (_, { data }) => isAsExpected(data);

  beforeEach(() => {
    _unitOfWorkStub = new unitOfWorkStub();
    _kafkaServiceStub = new kafkaServiceStub();
    usersService = new UsersService(_unitOfWorkStub, _kafkaServiceStub);
    repositoryReturns(Repo.users, { addRegisteration: () => undefined });
    repositoryReturns(Repo.courses, { getActiveCoursesForUsers: () => [] });
  });

  describe('Curio Registration', () => {
    it('should record student with SchoolNotRegistered status', async () => {
      const request: ISignupRequest = getTestData(Test.signupRequest, {}, false);
      repositoryReturns(Repo.schools, { findById: () => undefined });
      validateOutput(data => expect(data.status).equals(Status.schoolNotRegistered));
      await usersService.signup(request);
    });

    it('should record student with SchoolHasNoLicense status', async () => {
      const request: ISignupRequest = getTestData(Test.signupRequest, {}, false);
      const school = getTestData(Test.school, { license: undefined });
      repositoryReturns(Repo.schools, { findById: () => school });
      validateOutput(data => expect(data.status).equals(Status.schoolHasNoLicense));
      await usersService.signup(request);
    });

    it('should record student with OutOfQouta status', async () => {
      const request: ISignupRequest = getTestData(Test.signupRequest, {}, false);
      const school = getTestData(Test.school, { license: { students: { consumed: 100, max: 100 } } });
      repositoryReturns(Repo.schools, { findById: () => school });
      validateOutput(data => expect(data.status).equals(Status.outOfQuota));
      await usersService.signup(request);
    });

    it('should record student with PendingApproval status', async () => {
      const request: ISignupRequest = getTestData(Test.signupRequest, {}, false);
      const school = getTestData(Test.school, {
        license: {
          students: { consumed: 0, max: 100 },
          package: { signupMethods: [SignupMethods.manual] }
        }
      });
      repositoryReturns(Repo.schools, { findById: () => school });
      validateOutput(data => expect(data.status).equals(Status.pendingApproval));
      await usersService.signup(request);
    });

    it('should accept student in school and enroll in active courses', async () => {
      const request: ISignupRequest = getTestData(Test.signupRequest, {}, false);
      const school = getTestData(Test.school);
      repositoryReturns(Repo.users, { assignSchool: () => undefined });
      repositoryReturns(Repo.schools, { findById: () => school, consumeLicense: () => undefined });
      repositoryReturns(Repo.sections, {
        findMany: () => request.new_user_data.section,
        addStudents: () => undefined
      });
      repositoryReturns(Repo.courses, {
        getActiveCoursesUnderSections: () => [{ _id: 'course_id_1' }],
        addUsersToCourses: () => undefined,
        getActiveCoursesForUsers: () => []
      });
      validateOutput(data => expect(data.status).equals(Status.active));
      await usersService.signup(request);
    });

    it('should accept teacher in school and enroll in active courses', async () => {
      const request: ISignupRequest = getTestData(Test.signupRequest, {}, false);
      request.new_user_data.role = [Role.teacher];
      const school = getTestData(Test.school);
      repositoryReturns(Repo.users, { assignSchool: () => undefined });
      repositoryReturns(Repo.schools, { findById: () => school, consumeLicense: () => undefined });
      repositoryReturns(Repo.sections, {
        findMany: () => request.new_user_data.section,
        addStudents: () => undefined
      });
      repositoryReturns(Repo.courses, {
        getActiveCoursesUnderSections: () => [{ _id: 'course_id_1' }],
        addUsersToCourses: () => undefined,
        getActiveCoursesForUsers: () => []
      });
      validateOutput(data => expect(data.status).equals(Status.active));
      await usersService.signup(request);
    });

    it('should succeed to update user role and profile using patch', async () => {
      let updateObj: any;
      const request: ISignupRequest = getTestData(Test.signupRequest, {}, false);
      repositoryReturns(Repo.users, { patch: (_, updates) => updateObj = updates });
      await usersService.update(request);
      expect(updateObj.role).to.have.lengthOf(1);
      expect(updateObj.profile).to.have.property('name');
    });

    it('should not update user role and profile if they\'re not sent', async () => {
      let updateObj: any;
      repositoryReturns(Repo.users, { patch: (_, updates) => updateObj = updates });
      await usersService.update({ user_id: 'user1', new_user_data: {} });
      expect(updateObj).equal(undefined);
    });
  });

  describe('Provider Registration', () => {
    it('should record student with SchoolHasNoLicense (Provider Not Present)', async () => {
      const request: ISignupRequest = getTestData(Test.signupRequest, { provider: 'Alef' }, false);
      const school = getTestData(Test.school);
      repositoryReturns(Repo.schools, { findOne: () => school });
      validateOutput(data => expect(data.status).equals(Status.schoolHasNoLicense));
      await usersService.signup(request);
    });

    it('should record student with SchoolHasNoLicense (Provider Doesn\'t Match)', async () => {
      const request: ISignupRequest = getTestData(Test.signupRequest, { provider: 'Alef' }, false);
      const school = getTestData(Test.school, { provider: { _id: 'NOT_Alef' } });
      repositoryReturns(Repo.schools, { findOne: () => school });
      validateOutput(data => expect(data.status).equals(Status.schoolHasNoLicense));
      await usersService.signup(request);
    });

    it('should record student with gradeNotPurchased (Provider Didn\'t Buy)', async () => {
      const request: ISignupRequest = getTestData(Test.signupRequest, { provider: 'Alef' }, false);
      const school = getTestData(Test.school, {
        provider: { _id: 'Alef' },
        license: {
          students: { consumed: 0, max: 100 },
          package: {
            signupMethods: [SignupMethods.provider],
            grades: { ['5']: {} }
          }
        }
      });
      repositoryReturns(Repo.schools, { findOne: () => school });
      validateOutput(data => expect(data.status).equals(Status.gradeNotPurchased));
      await usersService.signup(request);
    });

    it('should record student with PendingApproval (Provider Not Supported)', async () => {
      const request: ISignupRequest = getTestData(Test.signupRequest, { provider: 'Alef' }, false);
      const school = getTestData(Test.school, {
        provider: { _id: 'Alef' },
        license: {
          students: { consumed: 0, max: 100 },
          package: {
            signupMethods: [SignupMethods.auto],
            grades: { ['4']: {} }
          }
        }
      });
      repositoryReturns(Repo.schools, { findOne: () => school });
      validateOutput(data => expect(data.status).equals(Status.pendingApproval));
      await usersService.signup(request);
    });

    it('should accept student in provider school (No Auto Creation)', async () => {
      const request: ISignupRequest = getTestData(Test.signupRequest, { provider: 'Alef' }, false);
      request.new_user_data.section = undefined;
      const school = getTestData(Test.school, {
        provider: { _id: 'Alef' },
        license: {
          students: { consumed: 0, max: 100 },
          package: {
            signupMethods: [SignupMethods.provider],
            grades: { ['4']: {} }
          }
        }
      });
      repositoryReturns(Repo.users, { assignSchool: () => undefined });
      repositoryReturns(Repo.courses, {
        addUsersToCourses: () => undefined,
        getActiveCoursesForUsers: () => [{}]
      });
      repositoryReturns(Repo.sections, { findMany: () => [], addStudents: () => undefined });
      repositoryReturns(Repo.schools, { findOne: () => school, consumeLicense: () => undefined });
      validateOutput(data => expect(data.status).equals(Status.active));
      await usersService.signup(request);
    });

    it('should accept student in provider school (With Auto Creation)', async () => {
      const request: ISignupRequest = getTestData(Test.signupRequest, { provider: 'Alef' }, false);
      const provider: IProvider = getTestData(Test.provider, { _id: 'Alef' });
      repositoryReturns(Repo.providers, { findById: () => provider });
      repositoryReturns(Repo.users, { assignSchool: () => undefined });
      repositoryReturns(Repo.courses, {
        addMany: () => undefined,
        getActiveCoursesUnderSections: () => [{ _id: 'course_id_1', grade: '4' }],
        addUsersToCourses: () => undefined,
        getActiveCoursesForUsers: () => []
      });
      repositoryReturns(Repo.sections, {
        addMany: () => undefined,
        addStudents: () => undefined,
        findMany: () => []
      });
      repositoryReturns(Repo.schools, {
        add: () => undefined,
        consumeLicense: () => undefined,
        findOne: () => undefined
      });
      validateOutput(data => expect(data.status).equals(Status.active));
      await usersService.signup(request);
    });

    it('should fail registration (Requested Provider Not Found)', async () => {
      const request: ISignupRequest = getTestData(Test.signupRequest, { provider: 'Alef' }, false);
      repositoryReturns(Repo.providers, { findById: () => undefined });
      repositoryReturns(Repo.schools, { findOne: () => undefined });
      await tryAndExpect(() => usersService.signup(request), NotFoundError);
    });

    it('should fail registration (No Active Term in Provider School)', async () => {
      const provider: IProvider = getTestData(Test.provider, { _id: 'Alef' });
      const request: ISignupRequest = getTestData(Test.signupRequest, { provider: 'Alef' }, false);
      const school: ISchool = getTestData(Test.school, {
        academicTerms: [], provider: { _id: 'Alef' },
        license: provider.license
      });
      repositoryReturns(Repo.providers, { findById: () => provider });
      repositoryReturns(Repo.schools, { findOne: () => school, add: () => undefined });
      await tryAndExpect(() => usersService.signup(request), InvalidRequestError);
    });

    it('should fail registration (No Provider School Auto Creation)', async () => {
      const request: ISignupRequest = getTestData(Test.signupRequest, { provider: 'Alef' }, false);
      repositoryReturns(Repo.providers, { findById: () => ({ config: { autoCreateSchool: false } }) });
      repositoryReturns(Repo.schools, { findOne: () => undefined });
      await tryAndExpect(() => usersService.signup(request), InvalidRequestError);
    });
  });

  describe('Invite Code Registration', () => {
    it('should record student with InvalidInviteCode (Not Found)', async () => {
      const request = getTestData(Test.signupRequest);
      repositoryReturns(Repo.inviteCodes, { findById: () => undefined });
      validateOutput(data => expect(data.status).equals(Status.invalidInviteCode));
      await usersService.signup(request);
    });

    it('should record student with InvalidInviteCode (Expired)', async () => {
      const request = getTestData(Test.signupRequest);
      const school = getTestData(Test.school);
      const inviteCode = getTestData(Test.inviteCode, {
        validity: {
          fromDate: new Date('2019-12-15'),
          toDate: new Date('2019-12-20')
        }
      });
      repositoryReturns(Repo.inviteCodes, { findById: () => inviteCode });
      repositoryReturns(Repo.schools, { findById: () => school });
      validateOutput(data => expect(data.status).equals(Status.invalidInviteCode));
      await usersService.signup(request);
    });

    it('should record student with InvalidInviteCode (Out Of Qouta)', async () => {
      const request = getTestData(Test.signupRequest);
      const school = getTestData(Test.school);
      const inviteCode = getTestData(Test.inviteCode, {
        quota: { max: 100, consumed: 100 }
      });
      repositoryReturns(Repo.inviteCodes, { findById: () => inviteCode });
      repositoryReturns(Repo.schools, { findById: () => school });
      validateOutput(data => expect(data.status).equals(Status.invalidInviteCode));
      await usersService.signup(request);
    });

    it('should record student with InvalidInviteCode (No License)', async () => {
      const request = getTestData(Test.signupRequest);
      const school = getTestData(Test.school, { license: undefined });
      const inviteCode = getTestData(Test.inviteCode);
      repositoryReturns(Repo.inviteCodes, { findById: () => inviteCode });
      repositoryReturns(Repo.schools, { findById: () => school });
      validateOutput(data => expect(data.status).equals(Status.invalidInviteCode));
      await usersService.signup(request);
    });

    it('should record student with InvalidInviteCode (Not Enabled)', async () => {
      const request = getTestData(Test.signupRequest);
      const school = getTestData(Test.school);
      const inviteCode = getTestData(Test.inviteCode, { isEnabled: false });
      repositoryReturns(Repo.inviteCodes, { findById: () => inviteCode });
      repositoryReturns(Repo.schools, { findById: () => school });
      validateOutput(data => expect(data.status).equals(Status.invalidInviteCode));
      await usersService.signup(request);
    });

    it('should record student with InvalidInviteCode (No Signup Method)', async () => {
      const request = getTestData(Test.signupRequest);
      const school = getTestData(Test.school, {
        license: {
          students: { consumed: 0, max: 100 },
          package: { signupMethods: [SignupMethods.manual] }
        }
      });
      const inviteCode = getTestData(Test.inviteCode);
      repositoryReturns(Repo.inviteCodes, { findById: () => inviteCode });
      repositoryReturns(Repo.schools, { findById: () => school });
      validateOutput(data => expect(data.status).equals(Status.invalidInviteCode));
      await usersService.signup(request);
    });

    it('should accept student in school with valid invite code (Auto Courses)', async () => {
      const testSchoolId = 'test_school_id';
      const request = getTestData(Test.signupRequest);
      const school = getTestData(Test.school);
      const inviteCode: IInviteCode = getTestData(Test.inviteCode, {
        schoolId: testSchoolId,
        enrollment: { sectionId: 'section', type: 'auto' }
      });
      repositoryReturns(Repo.users, { assignSchool: () => undefined });
      repositoryReturns(Repo.sections, {
        findMany: () => [{ _id: inviteCode.enrollment.sectionId }],
        addStudents: () => undefined
      });
      repositoryReturns(Repo.courses, {
        getActiveCoursesUnderSections: () => [{ _id: 'course_id_1' }],
        addUsersToCourses: () => undefined,
        getActiveCoursesForUsers: () => []
      });
      repositoryReturns(Repo.inviteCodes, {
        findById: () => inviteCode,
        incrementConsumedCount: () => undefined
      });
      repositoryReturns(Repo.schools, {
        findById: () => school,
        consumeLicense: () => undefined
      });
      validateOutput(data => {
        expect(data.status).equals(Status.active);
        expect(data.schoolId).equals(testSchoolId);
      });
      await usersService.signup(request);
    });

    it('should accept student in school with valid invite code (Specific Courses)', async () => {
      const testSchoolId = 'test_school_id';
      const testCoursesIds = ['test_course_id_1', 'test_course_id_2'];
      const request = getTestData(Test.signupRequest);
      const school = getTestData(Test.school);
      const inviteCode: IInviteCode = getTestData(Test.inviteCode, {
        schoolId: testSchoolId,
        enrollment: {
          sectionId: 'section',
          type: 'courses',
          courses: testCoursesIds
        }
      });
      repositoryReturns(Repo.users, { assignSchool: () => undefined });
      repositoryReturns(Repo.sections, {
        findMany: () => [{ _id: inviteCode.enrollment.sectionId }],
        addStudents: () => undefined
      });
      repositoryReturns(Repo.courses, {
        addUsersToCourses: () => undefined,
        getActiveCoursesForUsers: () => []
      });
      repositoryReturns(Repo.inviteCodes, {
        findById: () => inviteCode,
        incrementConsumedCount: () => undefined
      });
      repositoryReturns(Repo.schools, {
        findById: () => school,
        consumeLicense: () => undefined
      });
      validateOutput(data => {
        expect(data.status).equals(Status.active);
        expect(data.schoolId).equals(testSchoolId);
      });
      await usersService.signup(request);
    });
  });
});
