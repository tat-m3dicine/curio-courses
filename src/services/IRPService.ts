import request from 'request';
import { IUnitOfWork } from '@saal-oryx/unit-of-work';

import config from '../config';
import loggerFactory from '../utils/logging';
import { CommandsProcessor } from './CommandsProcessor';
import { IIRPSection, IIRPUser } from '../models/entities/IIRP';
import correlationIDHelper from '../utils/correlationIDHelper';


const logger = loggerFactory.getLogger('IRPService');
export class IRPService {

  protected irpUrl = config.irpUrl + '/authenticate';
  constructor() {

  }

  public getAllSections() {
    console.log('getAllSections invoked');
    const sectionsIRPUrl = `${this.irpUrl}/sections`;
    console.log('sectionsIRPUrl:', sectionsIRPUrl);
    return new Promise<IIRPSection[]>((resolve, reject) => {
      request(sectionsIRPUrl, {
        headers: {
          'curio-request-correlation-id': correlationIDHelper.getCorrelationId(),
        }, gzip: true, json: true
      }, (error: any, response: request.Response, body: IIRPSection[]) => {
        console.log(`body: ${body},error: ${error} and  response: ${JSON.stringify(response, undefined, 2)}`);
        if (error) return reject(error);
        if (response.statusCode !== 200) return reject(body);
        logger.info('getAllSections from IRP service');
        return resolve(body);
      });
    });
  }

  public getAllUsersBySection(sectionId: string) {
    console.log('getAllSections invoked');
    const usersIRPUrl = `${this.irpUrl}/users/group/${sectionId}`;
    console.log('usersIRPUrl:', usersIRPUrl);
    return new Promise<IIRPUser[]>((resolve, reject) => {
      request(usersIRPUrl, {
        headers: {
          'curio-request-correlation-id': correlationIDHelper.getCorrelationId(),
        }, gzip: true, json: true
      }, (error: any, response: request.Response, body: IIRPUser[]) => {
        console.log(`body: ${body},error: ${error} and  response: ${JSON.stringify(response, undefined, 2)}`);
        if (error) return reject(error);
        if (response.statusCode !== 200) return reject(body);
        logger.info('getAllSections from IRP service');
        return resolve(body);
      });
    });
  }
}