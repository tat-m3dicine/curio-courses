import { IUnitOfWork, IPaging } from '@saal-oryx/unit-of-work';
import { UnauthorizedError } from '../exceptions/UnauthorizedError';
import config from '../config';
import { IUserToken } from '../models/IUserToken';
import { SectionsRepository } from '../repositories/SectionsRepository';
import { NotFoundError } from '../exceptions/NotFoundError';
import { ISection } from '../models/entities/ISection';
import { CoursesRepository } from '../repositories/CoursesRepository';
import { SchoolsRepository } from '../repositories/SchoolsRepository';
import { ISchool, SignupMethods } from '../models/entities/ISchool';
import { InvalidLicenseError } from '../exceptions/InvalidLicenseError';
import { ForbiddenError } from '../exceptions/ForbiddenError';
import { CommandsProcessor } from './CommandsProcessor';
import { validateAllObjectsExist } from '../utils/validators/AllObjectsExist';
import { ICreateInviteCodeRequest } from '../models/requests/IInviteCodeRequests';
import { IInviteCode, EnrollmentType } from '../models/entities/IInviteCode';
import { InviteCodesRepository } from '../repositories/InviteCodesRepository';
import { ICourse } from '../models/entities/ICourse';
import { InvalidRequestError } from '../exceptions/InvalidRequestError';
import { newInviteCodeId } from '../utils/IdGenerator';
import { Repo } from '../repositories/RepoNames';

export class InviteCodesService {

  constructor(protected _uow: IUnitOfWork, protected _commandsProcessor: CommandsProcessor) {
  }

  protected get inviteCodesRepo() {
    return this._uow.getRepository(Repo.inviteCodes) as InviteCodesRepository;
  }

  protected get schoolsRepo() {
    return this._uow.getRepository(Repo.schools) as SchoolsRepository;
  }

  protected get sectionsRepo() {
    return this._uow.getRepository(Repo.sections) as SectionsRepository;
  }

  protected get coursesRepo() {
    return this._uow.getRepository(Repo.courses) as CoursesRepository;
  }

  async create(inviteCode: ICreateInviteCodeRequest, byUser: IUserToken) {
    this.authorize(byUser);
    const { schoolId, quota, validity, enrollment: { sectionId, type, courses } } = inviteCode;

    const school: ISchool | undefined = await this.schoolsRepo.findById(schoolId);
    if (!school) throw new NotFoundError(`'${schoolId}' school was not found!`);
    const section: ISection | undefined = await this.sectionsRepo.findOne({ _id: sectionId, schoolId });
    if (!section) throw new NotFoundError(`'${sectionId}' section was not found in '${schoolId}' school!`);
    if (type === EnrollmentType.courses) {
      if (courses) {
        const coursesObjs: ICourse[] = await this.coursesRepo.findMany({ _id: { $in: courses } });
        validateAllObjectsExist(coursesObjs, courses, schoolId, 'course');
      } else throw new InvalidRequestError(`A list of courses must be provided when enrollment type is 'courses'`);
    }
    if (!school.license || !school.license.package) throw new InvalidLicenseError(`'${schoolId}' school doesn't have a vaild license!`);
    const { signupMethods } = school.license.package;
    if (!(signupMethods instanceof Array) || !signupMethods.includes(SignupMethods.inviteCodes)) {
      throw new InvalidLicenseError(`Sign up through invite codes isn't included in '${schoolId}' school's license package!`);
    }
    return this._commandsProcessor.sendCommand('inviteCodes', this.doCreate, <IInviteCode>{
      _id: newInviteCodeId(),
      schoolId, validity, isEnabled: true,
      quota: { max: quota, consumed: 0 },
      enrollment: { sectionId, courses, type }
    });
  }

  private async doCreate(inviteCode: IInviteCode) {
    return this.inviteCodesRepo.add(inviteCode);
  }

  async get(schoolId: string, codeId: string, byUser: IUserToken) {
    this.authorize(byUser);
    return this.inviteCodesRepo.findOne({ _id: codeId, schoolId });
  }

  async list(schoolId: string, paging: IPaging, byUser: IUserToken) {
    this.authorize(byUser);
    return this.inviteCodesRepo.findManyPage({ schoolId }, paging);
  }

  async delete(schoolId: string, codeId: string, byUser: IUserToken) {
    this.authorize(byUser);
    const inviteCode = await this.inviteCodesRepo.findOne({ _id: codeId, schoolId });
    if (!inviteCode) throw new NotFoundError(`Couldn't find invite code '${codeId}' in school '${schoolId}'`);
    return this._commandsProcessor.sendCommand('inviteCodes', this.doDelete, codeId);
  }

  private async doDelete(codeId: string) {
    return this.inviteCodesRepo.delete({ _id: codeId });
  }

  protected authorize(byUser: IUserToken) {
    if (!byUser) throw new ForbiddenError('access token is required!');
    if (byUser.role.includes(config.authorizedRole)) return true;
    throw new UnauthorizedError('you are not authorized to do this action');
  }
}