import 'mocha';
import sinon from 'sinon';
import chai, { expect } from 'chai';
chai.use(require('sinon-chai'));

import { tryAndExpect } from '../tryAndExpect';
import { UnitOfWork } from '@saal-oryx/unit-of-work';
import { UsersService } from '../../src/services/UsersService';
import { Repo } from '../../src/models/RepoNames';
import { Status } from '../../src/models/entities/IUser';
import { getTestData, Test } from '../mockdata/getTestData';
import { SignupMethods, ISchool } from '../../src/models/entities/ISchool';
import { IInviteCode } from '../../src/models/entities/IInviteCode';
import { ISignupRequest, IUserData } from '../../src/models/entities/IIRP';
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
  let _repoReturnsMap: any;
  let usersService: UsersService;
  const repositoryReturns = (repo: Repo, methods: object) => {
    _repoReturnsMap[repo] = { ...(_repoReturnsMap[repo] || {}), ...methods };
    _unitOfWorkStub.getRepository.withArgs(repo, true).returns(_repoReturnsMap[repo]);
  };
  const validateOutput = (isAsExpected: (updates: IUserUpdatedData) => void) => _kafkaServiceStub.send = (_, { data }) => isAsExpected(data);

  beforeEach(() => {
    _repoReturnsMap = {};
    _unitOfWorkStub = new unitOfWorkStub();
    _kafkaServiceStub = new kafkaServiceStub();
    usersService = new UsersService(_unitOfWorkStub, _kafkaServiceStub);
    repositoryReturns(Repo.courses, { getActiveCoursesForUsers: () => [] });
    repositoryReturns(Repo.users, {
      addRegisteration: () => undefined,
      findById: () => undefined,
      patch: () => undefined
    });
  });

  describe('Curio Registration', () => {
    it('should record student with SchoolNotRegistered status', async () => {
      const request: ISignupRequest = getTestData(Test.signupRequest, {}, false);
      repositoryReturns(Repo.schools, { findById: () => undefined });
      validateOutput(data => expect(data.status).equals(Status.schoolNotRegistered));
      await usersService.signupOrUpdate(request);
    });

    it('should record student with SchoolHasNoLicense status', async () => {
      const request: ISignupRequest = getTestData(Test.signupRequest, {}, false);
      const school = getTestData(Test.school, { license: undefined });
      repositoryReturns(Repo.schools, { findById: () => school });
      validateOutput(data => expect(data.status).equals(Status.schoolHasNoLicense));
      await usersService.signupOrUpdate(request);
    });

    it('should record student with OutOfQouta status', async () => {
      const request: ISignupRequest = getTestData(Test.signupRequest, {}, false);
      const school = getTestData(Test.school, { license: { students: { consumed: 100, max: 100 } } });
      repositoryReturns(Repo.schools, { findById: () => school });
      validateOutput(data => expect(data.status).equals(Status.outOfQuota));
      await usersService.signupOrUpdate(request);
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
      await usersService.signupOrUpdate(request);
    });

    it('should accept student/teacher/principal in school and enroll in active courses', async () => {
      for (const role of Object.values(Role)) {
        const request: ISignupRequest = getTestData(Test.signupRequest, {}, false);
        request.new_user_data.role = [role];
        const school = getTestData(Test.school);
        repositoryReturns(Repo.users, { assignSchool: () => undefined, findOne: () => undefined });
        repositoryReturns(Repo.schools, { findById: () => school, consumeLicense: () => undefined });
        repositoryReturns(Repo.sections, {
          findMany: () => request.new_user_data.section,
          addStudents: () => undefined
        });
        repositoryReturns(Repo.courses, {
          getActiveCoursesUnderSections: () => [{ _id: 'course_id_1' }],
          addUsersToCourses: () => undefined
        });
        validateOutput(data => expect(data.status).equals(Status.active));
        await usersService.signupOrUpdate(request);
      }
    });

    it('should succeed to update already registered user profile', async () => {
      let updateObj: any;
      const request: ISignupRequest = getTestData(Test.signupRequest, {}, false);
      repositoryReturns(Repo.users, {
        patch: (_, updates) => updateObj = updates,
        findById: () => ({ _id: 'user1', school: { _id: 'school1' }, role: [] })
      });
      await usersService.signupOrUpdate(request);
      expect(updateObj.profile).to.have.property('name');
    });
  });

  describe('Provider Registration', () => {
    it('should record student with SchoolHasNoLicense (Provider Not Present)', async () => {
      const request: ISignupRequest = getTestData(Test.signupRequest, { provider: 'Alef' }, false);
      const school = getTestData(Test.school);
      repositoryReturns(Repo.schools, { findOne: () => school });
      validateOutput(data => expect(data.status).equals(Status.schoolHasNoLicense));
      await usersService.signupOrUpdate(request);
    });

    it('should record student with SchoolHasNoLicense (Provider Doesn\'t Match)', async () => {
      const request: ISignupRequest = getTestData(Test.signupRequest, { provider: 'Alef' }, false);
      const school = getTestData(Test.school, { provider: { _id: 'NOT_Alef' } });
      repositoryReturns(Repo.schools, { findOne: () => school });
      validateOutput(data => expect(data.status).equals(Status.schoolHasNoLicense));
      await usersService.signupOrUpdate(request);
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
      await usersService.signupOrUpdate(request);
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
      await usersService.signupOrUpdate(request);
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
        },
        locales: { en: { name: 'Alef' } }
      });
      repositoryReturns(Repo.users, { assignSchool: () => undefined, findOne: () => undefined });
      repositoryReturns(Repo.courses, {
        addUsersToCourses: () => undefined,
        getActiveCoursesForUsers: () => [{}]
      });
      repositoryReturns(Repo.sections, { findMany: () => [], addStudents: () => undefined });
      repositoryReturns(Repo.schools, { findOne: () => school, consumeLicense: () => undefined });
      validateOutput(data => expect(data.status).equals(Status.active));
      await usersService.signupOrUpdate(request);
    });

    it('should accept student in provider school (With Auto Creation)', async () => {
      const request: ISignupRequest = getTestData(Test.signupRequest, { provider: 'Alef' }, false);
      const provider: IProvider = getTestData(Test.provider, { _id: 'Alef' });
      repositoryReturns(Repo.providers, { findById: () => provider });
      repositoryReturns(Repo.users, { assignSchool: () => undefined, findOne: () => undefined });
      repositoryReturns(Repo.courses, {
        addMany: courses => courses,
        getActiveCoursesUnderSections: () => [{ _id: 'course_id_1', grade: '4' }],
        addUsersToCourses: () => undefined
      });
      repositoryReturns(Repo.sections, {
        addMany: sections => sections,
        addStudents: () => undefined,
        findMany: () => []
      });
      repositoryReturns(Repo.schools, {
        add: school => school,
        consumeLicense: () => undefined,
        findOne: () => undefined
      });
      validateOutput(data => expect(data.status).equals(Status.active));
      await usersService.signupOrUpdate(request);
    });

    it('should fail registration (Requested Provider Not Found)', async () => {
      const request: ISignupRequest = getTestData(Test.signupRequest, { provider: 'Alef' }, false);
      repositoryReturns(Repo.providers, { findById: () => undefined });
      repositoryReturns(Repo.schools, { findOne: () => undefined });
      await tryAndExpect(() => usersService.signupOrUpdate(request), NotFoundError);
    });

    it('should fail registration (No Active Term in Provider School)', async () => {
      const provider: IProvider = getTestData(Test.provider, { _id: 'Alef' });
      const request: ISignupRequest = getTestData(Test.signupRequest, { provider: 'Alef' }, false);
      const school: ISchool = getTestData(Test.school, {
        academicTerms: [], provider: { _id: 'Alef' },
        license: provider.license,
        locales: { en: { name: 'Alef' } }
      });
      repositoryReturns(Repo.providers, { findById: () => provider });
      repositoryReturns(Repo.schools, { findOne: () => school, add: () => undefined });
      await tryAndExpect(() => usersService.signupOrUpdate(request), InvalidRequestError);
    });

    it('should fail registration (No Provider School Auto Creation)', async () => {
      const request: ISignupRequest = getTestData(Test.signupRequest, { provider: 'Alef' }, false);
      repositoryReturns(Repo.providers, { findById: () => ({ config: { autoCreateSchool: false } }) });
      repositoryReturns(Repo.schools, { findOne: () => undefined });
      await tryAndExpect(() => usersService.signupOrUpdate(request), InvalidRequestError);
    });

    it('should succeed to update provider user by drop old and enrolling new courses/section', async () => {
      let done = 0;
      const markDone = () => done++;
      const school = getTestData(Test.school, {
        locales: { en: { name: 'Alef' } },
        provider: { _id: 'Alef' },
        license: {
          students: { consumed: 0, max: 100 },
          package: {
            signupMethods: [SignupMethods.provider],
            grades: { ['4']: { math: ['moe'] } }
          }
        },
      });
      const user = { _id: 'user1', school: { _id: 'school1' }, role: ['student'] };
      const request: ISignupRequest = getTestData(Test.signupRequest, { provider: 'Alef' }, false);
      repositoryReturns(Repo.schools, { findOne: () => school });
      repositoryReturns(Repo.users, { findById: () => user, findOne: () => user });
      repositoryReturns(Repo.courses, {
        addMany: courses => courses,
        finishUsersInCourses: markDone,
        addUsersToCourses: markDone,
        getActiveCoursesForUser: () => [{ _id: 'course_id_1', sectionId: '1', subject: 'math' }],
        getActiveCoursesUnderSections: () => [{ _id: 'course_id_1' }]
      });
      repositoryReturns(Repo.sections, {
        findMany: () => [{ providerLinks: ['alef_section'] }],
        removeStudents: markDone, addStudents: markDone
      });
      await usersService.signupOrUpdate(request);
      expect(done).equal(4);
    });

    it('should succeed to update provider user by drop old school and enrolling in new one', async () => {
      let done = 0;
      const markDone = () => done++;
      const user = { _id: 'user1', school: { _id: 'school1' }, role: [] };
      const school = getTestData(Test.school, {
        locales: { en: { name: 'Alef' } },
        provider: { _id: 'Alef' },
        license: {
          students: { consumed: 0, max: 100 },
          package: {
            signupMethods: [SignupMethods.provider],
            grades: { ['4']: {} }
          }
        },
      });
      const request: ISignupRequest = getTestData(Test.signupRequest, { provider: 'Alef' }, false);
      repositoryReturns(Repo.schools, { findOne: ({ _id }) => _id ? undefined : school, releaseLicense: markDone });
      repositoryReturns(Repo.users, { findById: () => user, findOne: () => user });
      repositoryReturns(Repo.courses, { finishUsersInCourses: markDone, addUsersToCourses: markDone });
      repositoryReturns(Repo.sections, {
        findMany: () => [{ providerLinks: ['alef_section'] }],
        removeStudents: markDone, addStudents: markDone
      });
      await usersService.signupOrUpdate(request);
      expect(done).equal(5);
    });
  });

  describe('Invite Code Registration', () => {
    it('should record student with InvalidInviteCode (Not Found)', async () => {
      const request = getTestData(Test.signupRequest);
      repositoryReturns(Repo.inviteCodes, { findById: () => undefined });
      validateOutput(data => expect(data.status).equals(Status.invalidInviteCode));
      await usersService.signupOrUpdate(request);
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
      await usersService.signupOrUpdate(request);
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
      await usersService.signupOrUpdate(request);
    });

    it('should record student with InvalidInviteCode (No License)', async () => {
      const request = getTestData(Test.signupRequest);
      const school = getTestData(Test.school, { license: undefined });
      const inviteCode = getTestData(Test.inviteCode);
      repositoryReturns(Repo.inviteCodes, { findById: () => inviteCode });
      repositoryReturns(Repo.schools, { findById: () => school });
      validateOutput(data => expect(data.status).equals(Status.invalidInviteCode));
      await usersService.signupOrUpdate(request);
    });

    it('should record student with InvalidInviteCode (Not Enabled)', async () => {
      const request = getTestData(Test.signupRequest);
      const school = getTestData(Test.school);
      const inviteCode = getTestData(Test.inviteCode, { isEnabled: false });
      repositoryReturns(Repo.inviteCodes, { findById: () => inviteCode });
      repositoryReturns(Repo.schools, { findById: () => school });
      validateOutput(data => expect(data.status).equals(Status.invalidInviteCode));
      await usersService.signupOrUpdate(request);
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
      await usersService.signupOrUpdate(request);
    });

    it('should accept student in school with valid invite code (Auto Courses)', async () => {
      const testSchoolId = 'test_school_id';
      const request = getTestData(Test.signupRequest);
      const school = getTestData(Test.school);
      const inviteCode: IInviteCode = getTestData(Test.inviteCode, {
        schoolId: testSchoolId,
        enrollment: { sectionId: 'section', type: 'auto' }
      });
      repositoryReturns(Repo.users, { assignSchool: () => undefined, findOne: () => undefined });
      repositoryReturns(Repo.sections, {
        findMany: () => [{ _id: inviteCode.enrollment.sectionId }],
        addStudents: () => undefined
      });
      repositoryReturns(Repo.courses, {
        getActiveCoursesUnderSections: () => [{ _id: 'course_id_1' }],
        addUsersToCourses: () => undefined
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
      await usersService.signupOrUpdate(request);
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
      repositoryReturns(Repo.users, { assignSchool: () => undefined, findOne: () => undefined });
      repositoryReturns(Repo.sections, {
        findMany: () => [{ _id: inviteCode.enrollment.sectionId }],
        addStudents: () => undefined
      });
      repositoryReturns(Repo.courses, {
        addUsersToCourses: () => undefined
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
      await usersService.signupOrUpdate(request);
    });
  });
});
