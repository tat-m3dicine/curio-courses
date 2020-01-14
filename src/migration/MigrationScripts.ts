import loggerFactory from '../utils/logging';
import { UnitOfWork, IUnitOfWork } from '@saal-oryx/unit-of-work';
import { getFactory } from '../repositories/RepositoryFactory';
import { getDbClient } from '../utils/getDbClient';
import { ISchool } from '../models/entities/ISchool';
import { IIRPUserMigrationRequest, IIRPSchool } from '../models/entities/IIRP';
import { IUser } from '../models/entities/IUser';
import { UsersRepository } from '../repositories/UsersRepository';
import { SchoolsRepository } from '../repositories/SchoolsRepository';
import nanoid = require('nanoid');
import { ICreateSectionRequest } from '../models/requests/ISectionRequests';
import { ISection } from '../models/entities/ISection';
import { ICreateCourseRequest } from '../models/requests/ICourseRequests';
import { CoursesRepository } from '../repositories/CoursesRepository';
import { ICourse } from '../models/entities/ICourse';
import config from '../config';
import { IUserToken } from '../models/IUserToken';
import { Role } from '../models/Role';
import { Repo } from '../repositories/RepoNames';
import { CoursesService } from '../services/CoursesService';
import { IRPRequests } from './IRPRequests';
import { UpdatesProcessor } from '../services/processors/UpdatesProcessor';
import { CommandsProcessor } from '../services/processors/CommandsProcessor';
import { SectionsRepository } from '../repositories/SectionsRepository';

const logger = loggerFactory.getLogger('MigrationScripts');

export class MigrationScripts {
  constructor(protected _updatesProcessor: UpdatesProcessor, protected _commandsProcessor: CommandsProcessor) {

  }

  async migrateIRPSchools() {
    logger.info('Migrating Schools ... ');
    const client = await getDbClient();
    const uow = new UnitOfWork(client, getFactory(), { useTransactions: false });
    const irpRequests = new IRPRequests();
    const usersRepo: UsersRepository = uow.getRepository(Repo.users);
    const schoolsRepo: SchoolsRepository = uow.getRepository(Repo.schools);

    const listOfUsers = await usersRepo.findMany({});
    const allSchools = await irpRequests.getAllSchools();
    let schoolList: ISchool[] = [];
    await Promise.all(allSchools.map(async school => {
      const results = await this.mapIRPSchoolsToDbSchools(school, listOfUsers);
      schoolList = schoolList.concat(results);
    }));
    schoolsRepo.addMany(schoolList, false).catch(err => {
      if (err && err.code === 11000) return undefined;
      throw err;
    });
  }

  async migrateIRPSections() {
    logger.info('Migrating Sections ... ');

    const client = await getDbClient();
    const uow = new UnitOfWork(client, getFactory(), { useTransactions: false });

    const irpRequests = new IRPRequests();
    const irpSections = await irpRequests.getAllSections();

    const sections: ISection[] = irpSections.map(section => ({
      _id: section.uuid,
      locales: {
        en: {
          name: section.name
        }
      },
      schoolId: section.schoolUuid,
      grade: section.grade,
      students: [],
      providerLinks: []
    }));
    uow.getRepository(Repo.sections).addMany(sections, false).catch(err => {
      if (err && err.code === 11000) return undefined;
      throw err;
    });

  }

  private async usersList() {
    const irpRequests = new IRPRequests();
    const allSections = await irpRequests.getAllSections();
    let usersList: IIRPUserMigrationRequest[] = [];
    await Promise.all(allSections.map(async section => {
      const results = await irpRequests.getAllUsersBySection(section.uuid);
      usersList = usersList.concat(results);
    }));
    return usersList;
  }

  async migrateIRPUsers() {
    logger.info('migrateIRPUsers invoked');

    const usersList = await this.usersList();
    const [users] = await Promise.all([this.migrateUsers(usersList), this.migrateUsersInSections(usersList)]);
    logger.info('Count of Users Migrated', users && users.length);
  }


  async migrateTeachers() {
    const client = await getDbClient();
    const uow = new UnitOfWork(client, getFactory(), { useTransactions: false });
    const irpRequests = new IRPRequests();
    const schoolsRepo: SchoolsRepository = uow.getRepository('Schools');
    const coursesRepo: CoursesRepository = uow.getRepository('Courses');
    const courseService = new CoursesService(uow, this._commandsProcessor, this._updatesProcessor);

    const userIds: string[] = [];
    const schools = await schoolsRepo.findMany({});
    await Promise.all(schools.map(async school => {
      const irpTeachers = await irpRequests.getTeachersByPrefrences(school._id);
      irpTeachers.forEach(t => userIds.push(t._id));
      await this.registerTeachers(school._id, irpTeachers.map(t => ({ _id: t._id, name: t.name, avatar: t.avatar })));
      for (const teacher of irpTeachers) {
        if (!teacher.preferences) continue;
        for (const preference of teacher.preferences) {
          for (const subject of preference.subjects) {
            await coursesRepo.addUsersToCourses([{
              filter: { schoolId: school._id, sectionId: preference.sectionId, subject },
              usersObjs: [{ _id: teacher._id, joinDate: new Date(), isEnabled: true }]
            }], Role.teacher);
          }
        }
      }
    }));

    await courseService.notifyForUserEnrollment(Role.teacher, userIds);
  }

  async registerTeachers(schoolId: string, profiles: { _id: string, name: string, avatar: string }[]) {
    const now = new Date();
    const client = await getDbClient();
    const uow = new UnitOfWork(client, getFactory(), { useTransactions: false });
    const users: IUser[] = profiles.map(profile => ({
      _id: profile._id,
      role: [Role.teacher],
      profile: {
        name: profile.name,
        avatar: profile.avatar
      },
      school: {
        _id: schoolId,
        joinDate: now
      }
    }));
    if (!users || users.length === 0) {
      logger.debug('No teachers found to migrate!');
      return [];
    }
    return uow.getRepository('Users').addMany(users, false)
      .catch(err => {
        if (err && err.code === 11000) return undefined;
        throw err;
      });
  }


  async migrateUsers(requests: IIRPUserMigrationRequest[]) {
    const now = new Date();

    const client = await getDbClient();
    const uow = new UnitOfWork(client, getFactory(), { useTransactions: false });

    const users: IUser[] = requests.filter(user => user.schooluuid).map(user => ({
      _id: user._id,
      role: [Role.student],
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
    return uow.getRepository(Repo.users).addMany(users, false)
      .catch(err => {
        if (err && err.code === 11000) return undefined;
        throw err;
      });
  }

  async migrateUsersInSections(requests: IIRPUserMigrationRequest[]) {
    const client = await getDbClient();
    const uow = new UnitOfWork(client, getFactory(), { useTransactions: false });
    const sectionRepo: SectionsRepository = uow.getRepository(Repo.sections);
    const sections = Object.values(requests.reduce((updates: { filter: object, usersIds: string[] }[], curVal: IIRPUserMigrationRequest) => {
      if (!updates[curVal.sectionuuid]) {
        updates[curVal.sectionuuid] = {
          filter: { _id: curVal.sectionuuid }
        };
      }
      if (!updates[curVal.sectionuuid].usersIds) updates[curVal.sectionuuid].usersIds = [];
      updates[curVal.sectionuuid].usersIds.push(curVal.username);

      return updates;
    }, {} as { filter: object, usersIds: string[] }[]));
    // Update With BulkWrite
    return sectionRepo.addStudentsToSections(sections);
  }

  async prepareCourses() {
    const client = await getDbClient();
    const uow = new UnitOfWork(client, getFactory(), { useTransactions: false });
    const usersList = await this.usersList();
    const sections: ISection[] = Object.values(usersList.filter(user => user.schooluuid).reduce((section: ICreateSectionRequest, curVal: IIRPUserMigrationRequest) => {
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
    await this.createCourses(sections, uow);
    const userIds = usersList.map(x => x._id);

    const courseService = new CoursesService(uow, this._commandsProcessor, this._updatesProcessor);
    await courseService.notifyForUserEnrollment(Role.student, userIds);
  }

  async createCourses(sections: ISection[], uow: IUnitOfWork) {
    const schoolRepo = uow.getRepository(Repo.schools) as SchoolsRepository;
    const courseRepo = uow.getRepository(Repo.courses) as CoursesRepository;
    const [schools, courses] = await Promise.all([
      schoolRepo.findMany({ _id: { $in: sections.map(section => section.schoolId) } }),
      courseRepo.findMany({ sectionId: { $in: sections.map(section => section._id) } }, { sectionId: 1, subject: 1 })
    ]);
    const courseService = new CoursesService(uow, this._commandsProcessor, this._updatesProcessor);

    for (const section of sections) {
      const school: ISchool | undefined = schools.find(school => school._id === section.schoolId);
      if (!school || !school.license || !school.license.package || !school.license.package.grades || !school.license.package.grades[section.grade]) {
        logger.warn('section was not migrated because its not included in the school.license.package');
        continue;
      }
      const subjects = school.license.package.grades[section.grade];

      for (const subject in subjects) {
        const course: ICourse | undefined = courses.find(c => c.sectionId === section._id && c.subject === subject);
        if (course) {
          await courseRepo.addUsersToCourses([{
            filter: { _id: course._id },
            usersObjs: section.students.map(studentId => ({ _id: studentId, joinDate: new Date(), isEnabled: true }))
          }], Role.student);
        } else {
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
          await courseService.create(req, <IUserToken>{ role: [config.authorizedRole] });
        }
      }
    }
  }

  public mapIRPSchoolsToDbSchools(irpSchool: IIRPSchool, listOfUsers: IUser[]) {
    const result: any = [], teacherUsers = <IUser[]>[], studentUsers = <IUser[]>[];
    for (const user of listOfUsers) {
      if (user.registration && user.registration.school && user.registration.school._id === irpSchool.uuid) {
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
      users: irpSchool.adminUsers ? irpSchool.adminUsers.reduce((previousValue, user) => {
        const response = {
          _id: user,
          permissions: ['admin']
        };
        previousValue.push(response);
        return previousValue;
      }, [] as any) : []
    });
    return result;
  }

  generateGrades(irpSchool: IIRPSchool) {
    if (!irpSchool.grades) return {};
    return irpSchool.grades.reduce((previousValue, grade) => {
      if (!previousValue[grade]) previousValue[grade] = {};
      return irpSchool.subjects.reduce((_, subject) => {
        previousValue[grade][subject] = irpSchool.curriculum.split(', ');
        return previousValue;
      }, {});
    }, {});
  }
}