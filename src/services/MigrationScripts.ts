import loggerFactory from '../utils/logging';
import { IRPService } from './IRPService';
import { UnitOfWork, IUnitOfWork } from '@saal-oryx/unit-of-work';
import { getFactory } from '../repositories/RepositoryFactory';
import { getDbClient } from '../utils/getDbClient';
import { ISchool } from '../models/entities/ISchool';
import { IIRPUserMigrationRequest, IIRPSchool } from '../models/entities/IIRP';
import validators from '../utils/validators';
import { IUser } from '../models/entities/IUser';
import { UsersRepository } from '../repositories/UsersRepository';
import { SchoolsRepository } from '../repositories/SchoolsRepository';
import nanoid = require('nanoid');
import { ICreateSectionRequest } from '../models/requests/ISectionRequests';
import { ISection } from '../models/entities/ISection';
import { CoursesService } from './CoursesService';
import { UpdatesProcessor } from './UpdatesProcessor';
import { CommandsProcessor } from './CommandsProcessor';
import { ICreateCourseRequest } from '../models/requests/ICourseRequests';
import { CoursesRepository } from '../repositories/CoursesRepository';
import { ICourse } from '../models/entities/ICourse';
import config from '../config';
import { IUserToken } from '../models/IUserToken';

const logger = loggerFactory.getLogger('MigrationScripts');

export class MigrationScripts {
  constructor(protected _updatesProcessor: UpdatesProcessor, protected _commandsProcessor: CommandsProcessor) {

  }

  async migrateIRPSchools() {
    const client = await getDbClient();
    const uow = new UnitOfWork(client, getFactory(), { useTransactions: false });
    const irpService = new IRPService();
    const usersRepo: UsersRepository = uow.getRepository('Users');
    const schoolsRepo: SchoolsRepository = uow.getRepository('Schools');

    const listOfUsers = await usersRepo.findMany({});
    const allSchools = await irpService.getAllSchools();
    let schoolList: ISchool[] = [];
    await Promise.all(allSchools.map(async school => {
      const results = await this.mapIRPSchoolsToDbSchools(school, listOfUsers);
      schoolList = schoolList.concat(results);
    }));
    const response = await schoolsRepo.addMany(schoolList, false);
    logger.info('Count of schools Migrated', response.length);
  }

  async migrateIRPUsersAndSections() {
    logger.info('migrateIRPUsers invoked');

    const irpService = new IRPService();
    const allSections = await irpService.getAllSections();
    let usersList: IIRPUserMigrationRequest[] = [];
    await Promise.all(allSections.map(async section => {
      const results = await irpService.getAllUsersBySection(section.uuid);
      usersList = usersList.concat(results);
    }));
    const [users, sections] = await Promise.all([this.migrate(usersList), this.migrateSections(usersList)]);
    logger.info('Count of Users Migrated', users.length);
    logger.info('Count of Sections Migrated', sections.length);
  }

  async migrate(requests: IIRPUserMigrationRequest[]) {
    const now = new Date();

    const client = await getDbClient();
    const uow = new UnitOfWork(client, getFactory(), { useTransactions: false });

    requests = requests.filter(request => {
      return validators.validateMigrateUser(request);
    });
    const users: IUser[] = requests.map(user => ({
      _id: user._id,
      role: [user.role.toLowerCase()],
      profile: {
        name: user.name,
        avatar: user.avatar
      },
      school: {
        _id: user.schooluuid,
        joinDate: now
      }
    }));
    if (!users || users.length === 0) {
      logger.debug('No users found to migrate!');
      return [];
    }
    return uow.getRepository('Users').addMany(users, false);
  }

  async migrateSections(requests: IIRPUserMigrationRequest[]) {
    const client = await getDbClient();
    const uow = new UnitOfWork(client, getFactory(), { useTransactions: false });
    const sections: ISection[] = Object.values(requests.reduce((section: ICreateSectionRequest, curVal: IIRPUserMigrationRequest) => {
      if (!section[curVal.sectionuuid]) {
        section[curVal.sectionuuid] = {
          _id: curVal.sectionuuid,
          locales: {
            en: {
              name: curVal.sectionname
            }
          },
          schoolId: curVal.schooluuid,
          grade: curVal.grade
        };
      }

      if (!section[curVal.sectionuuid].students) section[curVal.sectionuuid].students = [];
      section[curVal.sectionuuid].students.push(curVal.username);
      return section;
    }, {} as ICreateSectionRequest));
    const response = await uow.getRepository('Sections').addMany(sections, false);
    await this.createCourses(sections, uow);
    return response;
  }

  async createCourses(sections: ISection[], uow: IUnitOfWork) {
    const schoolRepo = uow.getRepository('Schools') as SchoolsRepository;
    const courseRepo = uow.getRepository('Courses') as CoursesRepository;
    const [schools, courses] = await Promise.all([
      schoolRepo.findMany({ _id: { $in: sections.map(section => section.schoolId) } }),
      courseRepo.findMany({ sectionId: { $in: sections.map(section => section._id) } }, { sectionId: 1 })
    ]);

    return Promise.all(sections.map(section => {
      const school: ISchool | undefined = schools.find(school => school._id === section.schoolId);
      const course: ICourse | undefined = courses.find(course => course.sectionId === section._id);
      if (!course && school && school.license && school.license.package && school.license.package.grades && school.license.package.grades[section.grade]) {
        const subjects = school.license.package.grades[section.grade];
        return Promise.all(Object.keys(subjects).map(subject => {
          const req: ICreateCourseRequest = {
            schoolId: school._id,
            sectionId: section._id,
            subject,
            locales: {
              en: {
                name: subject
              }
            },
            curriculum: subjects[subject][0],
            grade: section.grade,
            students: section.students
          };
          const courseService = new CoursesService(uow, this._commandsProcessor, this._updatesProcessor);
          return courseService.create(req, <IUserToken>{role: config.authorizedRole});
        }));
      }
      return;
    }).filter(x => x));
  }

  public mapIRPSchoolsToDbSchools(irpSchool: IIRPSchool, listOfUsers: IUser[]) {
    const result: any = [], teacherUsers = <IUser[]>[], studentUsers = <IUser[]>[];
    for (const user of listOfUsers) {
      if (user.registration && user.registration.school._id === irpSchool.uuid) {
        if (user.role.includes('teacher')) {
          teacherUsers.push(user);
        } else if (user.role.includes('student')) {
          studentUsers.push(user);
        }
      }
    }
    result.push({
      _id: irpSchool.uuid,
      locales: {
        en: {
          name: irpSchool.name
        }
      },
      location: 'AbuDhabi',
      license: {
        students: {
          max: 1000000,
          consumed: studentUsers.length,
        },
        teachers: {
          max: 1000000,
          consumed: teacherUsers.length,
        },
        validFrom: new Date(),
        validTo: new Date('Apr 01, 2020 03:24:00'),
        reference: 'Curio-IRP',
        isEnabled: true, // enable/disable
        package: {
          grades: this.generateGrades(irpSchool),
          features: ['all'],
          signupMethods: ['auto']
        }
      },
      academicTerms: [{
        _id: nanoid(5),
        year: '2020',
        term: '1',
        startDate: new Date(),
        endDate: new Date('Apr 01, 2020 03:24:00'),
        gracePeriod: 30,
        isEnabled: true
      }],
      users: irpSchool.adminUsers.reduce((previousValue, user) => {
        const response = {
          _id: user,
          permissions: ['admin']
        };
        previousValue.push(response);
        return previousValue;
      }, [] as any)
    });
    return result;
  }

  generateGrades(irpSchool: IIRPSchool) {
    return irpSchool.grades.reduce((previousValue, grade) => {
      if (!previousValue[grade]) previousValue[grade] = {};
      return irpSchool.subjects.reduce((_, subject) => {
        previousValue[grade][subject] = irpSchool.curriculum.split(', ');
        return previousValue;
      }, {});
    }, {});
  }
}