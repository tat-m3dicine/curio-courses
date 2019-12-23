import request from 'request';
import config from '../config';
import nanoid = require('nanoid');
import loggerFactory from '../utils/logging';
import correlationIDHelper from '../utils/correlationIDHelper';
import { ISchool, IPackage, ILicense, ISchoolUserPermissions } from '../models/entities/ISchool';
import { IUser, Status } from '../models/entities/IUser';
import { IIRPSection, IIRPUser, IIRPSchool } from '../models/entities/IIRP';

const logger = loggerFactory.getLogger('IRPService');
export class IRPService {

  protected irpUrl = config.irpUrl + '/authenticate';

  public getAllSections() {
    const sectionsIRPUrl = `${this.irpUrl}/sections`;
    logger.info('getAllSections invoked', sectionsIRPUrl);
    return new Promise<IIRPSection[]>((resolve, reject) => {
      request(sectionsIRPUrl, {
        headers: {
          'curio-request-correlation-id': correlationIDHelper.getCorrelationId(),
        }, gzip: true, json: true
      }, (error: any, response: request.Response, body: IIRPSection[]) => {
        if (error) return reject(error);
        if (response.statusCode < 200 || response.statusCode >= 300) return reject(body);
        return resolve(body);
      });
    });
  }

  public getAllSchools() {
    const now = new Date();
    const schoolsIRPUrl = `${this.irpUrl}/schools`;
    logger.info('getAllShools invoked', schoolsIRPUrl);
    return new Promise<IIRPSchool[]>((resolve, reject) => {
      request(schoolsIRPUrl, {
        headers: {
          'curio-request-correlation-id': correlationIDHelper.getCorrelationId(),
        }, gzip: true, json: true
      }, (error: any, response: request.Response, body: IIRPSchool[]) => {
        if (error) return reject(error);
        if (response.statusCode < 200 || response.statusCode >= 300) return reject(body);
        return resolve(body);
      });
    });
  }

  public getAllUsersBySection(schoolId: string, sectionId: string) {
    const now = new Date();
    const usersIRPUrl = `${this.irpUrl}/users/group/${sectionId}`;
    logger.info('getAllUsersBySection invoked', usersIRPUrl);
    return new Promise<IUser[]>((resolve, reject) => {
      request(usersIRPUrl, {
        headers: {
          'curio-request-correlation-id': correlationIDHelper.getCorrelationId(),
        }, gzip: true, json: true
      }, (error: any, response: request.Response, body: IIRPUser[]) => {
        if (error) return reject(error);
        if (response.statusCode < 200 || response.statusCode >= 300) return reject(body);
        const result = this.mapIRPUsersToDbUsers(body, schoolId, now);
        return resolve(result);
      });
    });
  }

  private mapIRPUsersToDbUsers(irpUsers: IIRPUser[], schoolId: string, joinDate: Date) {
    const result: IUser[] = [];
    for (const user of irpUsers) {
      result.push({
        _id: user.username,
        profile: {
          name: user.name,
          avatar: user.avatar,
          grade: user.grade
        },
        role: (user.role && typeof (user.role) === 'string') ? user.role.split(',').map(r => r.toLowerCase().trim()) : [],
        registration: { schoolId, joinDate, status: Status.active }
      });
    }
    return result;
  }

  public mapIRPSchoolsToDbSchools(irpSchool: IIRPSchool, listOfUsers: IUser[]) {

    const result: any = [];
    const teacherUsers = listOfUsers.filter(user => (user.registration.schoolId === irpSchool.uuid && user.role.includes('teacher')));
    const studentUsers = listOfUsers.filter(user => (user.registration.schoolId === irpSchool.uuid && user.role.includes('student')));
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
        validTo: new Date('May 01, 2020 03:24:00'),
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
        endDate: new Date('May 01, 2020 03:24:00'),
        gracePeriod: 100,
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