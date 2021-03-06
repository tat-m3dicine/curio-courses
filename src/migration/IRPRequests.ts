import request from 'request';
import config from '../config';
import loggerFactory from '../utils/logging';
import { IIRPSection, IIRPUserMigrationRequest, IIRPSchool } from '../models/entities/IIRP';
import correlationIDHelper from '../utils/correlationIDHelper';

const logger = loggerFactory.getLogger('IRPService');
export class IRPRequests {

  protected irpUrl = config.irpUrl + '/authenticate';

  public getAllSections() {
    const sectionsIRPUrl = `${this.irpUrl}/sections`;
    logger.info('getAllSections invoked', sectionsIRPUrl);
    return new Promise<IIRPSection[]>(this.requestURL(sectionsIRPUrl));
  }

  public getAllSchools() {
    const schoolsIRPUrl = `${this.irpUrl}/schools`;
    logger.info('getAllShools invoked', schoolsIRPUrl);
    return new Promise<IIRPSchool[]>(this.requestURL(schoolsIRPUrl));
  }

  public getAllUsersBySection(sectionId: string) {
    const usersIRPUrl = `${this.irpUrl}/users/group/${sectionId}`;
    logger.info('getAllUsersBySection invoked', usersIRPUrl);
    return new Promise<IIRPUserMigrationRequest[]>(this.requestURL(usersIRPUrl));
  }

  public getTeachersByPrefrences(schoolId: string) {
    const usersIRPUrl = `${config.irpUrl}/internal/schools/${schoolId}/teachers?size=10000`;
    logger.info('getTeachersByPrefrences invoked', usersIRPUrl);
    return new Promise<IIRPUserMigrationRequest[]>(this.requestURL(usersIRPUrl));
  }

  private requestURL(usersIRPUrl: string) {
    return (resolve, reject) => {
      request(usersIRPUrl, {
        headers: {
          'curio-request-correlation-id': correlationIDHelper.getCorrelationId(),
        }, gzip: true, json: true,
        timeout: 60000,
      }, (error: any, response: request.Response, body: any[]) => {
        if (error) return reject(error);
        if (response.statusCode < 200 || response.statusCode >= 300) return reject(body);
        return resolve(body);
      });
    };
  }
}