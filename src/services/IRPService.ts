import request from 'request';
import config from '../config';
import loggerFactory from '../utils/logging';
import { IUser, Status } from '../models/entities/IUser';
import { IIRPSection, IIRPUser } from '../models/entities/IIRP';
import correlationIDHelper from '../utils/correlationIDHelper';

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
        role: (user.role && typeof(user.role) === 'string') ? user.role.split(',').map(r => r.toLowerCase().trim()) : [],
        registration: { schoolId, joinDate, status: Status.active }
      });
    }
    return result;
  }
}