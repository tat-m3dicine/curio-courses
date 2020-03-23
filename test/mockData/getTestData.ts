import { SignupMethods } from '../../src/models/entities/ISchool';
import { ICreateSchoolRequest } from '../../src/models/requests/ISchoolRequests';

export const getTestData = (type: Test, override = {}, inviteCode = true) => {
  let data = <any>{ ...dataMap[type], ...override };
  if (type === Test.signupRequest) {
    data = JSON.parse(JSON.stringify(data));
    if (!inviteCode) data.new_user_data.inviteCode = undefined;
  }
  return data;
};

export enum Test {
  signupRequest = 'signup_request',
  inviteCode = 'invite_code',
  provider = 'provider',
  school = 'school',
  providerObj = 'providerObj',
  activeCourses = 'activeCourses',
  providerRequest = 'providerRequest',
  updateProviderRequest = 'updateProviderRequest',
  updateProviderResponse = 'updateProviderResponse',
  deleteAcademicProviderResponse = 'deleteAcademicProviderResponse',
  deleteAcademicTermProviderRequest = 'deleteAcademicTermProviderRequest',
  dateValidationUpdateProviderRequest = 'dateValidationUpdateProviderRequest'
}

const dataMap = {
  [Test.signupRequest]: {
    user_id: 'user_id',
    provider: 'curio',
    new_user_data: {
      name: 'Omar',
      avatar: 'image.png',
      role: [
        'student'
      ],
      curriculum: 'moe',
      inviteCode: 'c9e473f7',
      grade: '4',
      school: {
        name: 'Al Dar School',
        uuid: 'aldar_ba526'
      },
      section: [
        {
          uuid: '6_A_SAAL56ND02',
          name: 'A',
          grade: '4'
        }
      ]
    }
  },
  [Test.inviteCode]: {
    _id: 'c9e473f7',
    schoolId: 'aldar_ba526',
    validity: {
      fromDate: new Date('2000-12-15'),
      toDate: new Date('2099-12-28')
    },
    isEnabled: true,
    quota: {
      max: 10,
      consumed: 2
    },
    enrollment: {
      sectionId: '4_section1_aldar_ba526',
      type: 'auto'
    }
  },
  [Test.school]: {
    _id: 'aldar_ba526',
    academicTerms: [
      {
        _id: '1234',
        year: '2019',
        startDate: new Date('2000-05-04'),
        endDate: new Date('2099-12-30')
      }
    ],
    license: {
      students: { consumed: 0, max: 100 },
      teachers: { consumed: 0, max: 100 },
      package: {
        signupMethods: [SignupMethods.auto, SignupMethods.inviteCodes],
        grades: { ['4']: { math: ['moe'] } }
      }
    },
    users: [
      {
        _id: 'saad',
        permissions: [
          'admin',
          'user'
        ]
      }
    ]
  },
  [Test.provider]: {
    _id: 'Not-Curio',
    location: 'Abu Dhabi',
    config: {
      autoCreateSchool: true,
      autoCreateSection: true,
      autoCreateCourse: true
    },
    academicTerms: [
      {
        _id: '1234',
        year: '2019',
        startDate: new Date('2000-05-04'),
        endDate: new Date('2099-12-30')
      }
    ],
    license: {
      students: { consumed: 0, max: 100 },
      teachers: { consumed: 0, max: 100 },
      validFrom: new Date('2000-10-2'),
      validTo: new Date('2099-12-15'),
      package: {
        features: [],
        signupMethods: [SignupMethods.provider],
        grades: { ['4']: { math: ['moe'], arabic: ['moe'] } }
      }
    }
  },
  [Test.providerRequest]: {
    _id: 'school35',
    config: {
      autoCreateSchool: true,
      autoCreateSection: true,
      autoCreateCourse: true
    },
    location: 'abudhabi',
    license: {
      package: {
        grades: {
          5: {
            math: ['moe', 'us']
          }
        },
        features: ['all'],
        signupMethods: ['auto']
      }
    },
    academicTerm: {
      location: 'AbuDhabi',
      year: '2011',
      term: 'term1',
      startDate: '1990-01-27T13:12:11.210Z',
      endDate: '1990-11-27T13:12:11.210Z',
      gracePeriod: 20,
      isEnabled: true
    }
  },
  [Test.dateValidationUpdateProviderRequest]: {
    year: '2011',
    term: 'term2',
    startDate: '2021-01-27T13:12:11.210Z',
    endDate: '2020-11-27T13:12:11.210Z',
    gracePeriod: 20,
    isEnabled: true
  },
  [Test.updateProviderRequest]: {
    year: '2011',
    term: 'term2',
    startDate: '2019-01-27T13:12:11.210Z',
    endDate: '2020-11-27T13:12:11.210Z',
    gracePeriod: 20,
    isEnabled: true
  },
  [Test.updateProviderResponse]: {
    _id: '37b7177133',
    year: '2011',
    term: 'term2',
    startDate: '2019-01-27T13:12:11.210Z',
    endDate: '2020-11-27T13:12:11.210Z',
    gracePeriod: 20,
    isEnabled: true
  },
  [Test.deleteAcademicTermProviderRequest]: {
    providerId: '123',
    academicTermId: '2345'
  },
  [Test.activeCourses]: [{
    _id: '4_2_50afb',
    schoolId: 'aldar_ba526',
    sectionId: '4_1_79586',
    curriculum: 'moe',
    grade: '4',
    subject: 'math',
    academicTerm: {
      _id: 'c45c9e633f',
      year: '2019',
      startDate: '2019-05-04T20:00:00.000Z',
      endDate: '2019-12-11T20:00:00.000Z'
    },
    defaultLocale: 'en',
    isEnabled: true,
    locales: { en: { name: 'Math 101' } },
    teachers: [],
    students: [],
    createdAt: '2019-12-05T11:47:25.533Z'
  }],
  [Test.deleteAcademicProviderResponse]: {
    n: 1,
    nModified: 0
  },
  [Test.providerObj]: {
    _id: 'schooltest15',
    config:
    {
      autoCreateSchool: true,
      autoCreateSection: true,
      autoCreateCourse: true
    },
    license:
    {
      package:
        { grades: [Object], features: [Array], signupMethods: [Array] }
    },
    location: 'abudhabi',
    academicTerms:
      [{
        _id: 'c45c9e633f',
        location: 'AbuDhabi',
        year: '2011',
        term: 'term1',
        startDate: '1990-01-27T13:12:11.210Z',
        endDate: '1990-11-27T13:12:11.210Z',
        gracePeriod: 20,
        isEnabled: true
      }],
    createdAt: '2020-01-02T13:23:24.323Z'
  }
};

export const schoolRequest: ICreateSchoolRequest = {
  locales: {
    en: {
      name: 'CurioTestSchool'
    }
  },
  location: 'Abu Dhabi'
};