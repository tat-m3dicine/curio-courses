import { SignupMethods } from '../../src/models/entities/ISchool';
import { ICreateSchoolRequest } from '../../src/models/requests/ISchoolRequests';

export const getTestData = (type: Test, override = {}, inviteCode = true) => {
    let data = <any>{ ...dataMap[type], ...override };
    if (type === Test.usersResponse) {
      data = dataMap[type];
    }
    return data;
};

export enum Test {
    usersResponse = 'usersResponse',
    schoolResponse = 'schoolResponse',
    sectionResponse = 'sectionResponse',
    allSectionsResponse = 'allSectionsResponse',
    createSectionWithStudents = 'createSection_Students',
    createSectionWithNoStudents = 'createSection_noStudents',
}

const dataMap = {
    [Test.schoolResponse]: {
        _id: 'ABCSchoolOTIPT1',
        license: {
            students: {
                max: 1000000,
                consumed: 0
            },
            teachers: {
                max: 1000000,
                consumed: 0
            },
            package: {
                grades: {
                    4: {
                        math: [
                            'moe'
                        ],
                        science: [
                            'moe'
                        ],
                        english: [
                            'moe'
                        ],
                        arabic: [
                            'moe'
                        ]
                    }
                },
                features: [
                    'others'
                ],
                signupMethods: [
                    'manual'
                ]
            }
        }
    },
    [Test.usersResponse]: [{
        _id: '123'
    }, {
        _id: '234'
    }],
    [Test.createSectionWithNoStudents]: {
        locales: {
            en: {
                name: 'Section 1',
                description: 'Grade 4 section'
            }
        },
        grade: '4',
        schoolId: 'aldar_ba526'
    },
    [Test.createSectionWithStudents]: {
        locales: {
            en: {
                name: 'Section 1',
                description: 'Grade 4 section'
            }
        },
        grade: '4',
        students: ['123', '243'],
        schoolId: 'aldar_ba526'
    },
    [Test.sectionResponse]: {
        ok: true,
        result: {
            _id: 'ABCSCHOOLOTIPT1_SECTION1_8',
            locales: {
                en: {
                    name: 'Section 1',
                    description: 'Grade 4 section'
                }
            },
            schoolId: 'aldar_ba526',
            grade: '4',
            students: ['123', '243'],
            createdAt: '2020-01-06T14:07:40.175Z'
        }
    },
    [Test.allSectionsResponse]: {
        index: 1,
        size: 10,
        total: 1,
        items: [
            {
                _id: '4_1_79586',
                students: [
                    '22',
                    '77',
                    'a',
                    'b'
                ],
                locales: {
                    en: {
                        name: 'section 1'
                    }
                },
                grade: '4',
                curriculum: 'moe',
                schoolId: 'aldar_ba526',
                createdAt: '2019-11-26T10:50:23.500Z'
            }
        ]
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