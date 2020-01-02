import { SignupMethods } from '../src/models/entities/ISchool';

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
          name: 'A'
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
  }
};
