import { IUnitOfWork, IPaging } from '@saal-oryx/unit-of-work';
import validators from '../utils/validators';
import { UnauthorizedError } from '../exceptions/UnauthorizedError';
import config from '../config';
import { IUserToken } from '../models/IUserToken';
import { SkillRatingsRepository } from '../repositories/SkillRatingsFactory';
import { IFilter } from '../models/entities/IFilter';

export class SkillRatingsService {

  constructor(protected _uow: IUnitOfWork) {
  }

  protected get skillRatingsRepo() {
    return this._uow.getRepository('SkillRatings') as SkillRatingsRepository;
  }

  async getForUserByFilter(filter: IFilter, paging: IPaging, byUser: IUserToken) {
    const isAuthorized = await this.authorize(byUser);
    if (!isAuthorized) throw new UnauthorizedError();
    await this.validate(filter);
    const projectHistory = filter.historySince || filter.historySize;
    const projection = this.projection(false, projectHistory);
    const results = await this.skillRatingsRepo.findManyPage({
      'user_id': filter.users.length > 0 ? { $in: filter.users } : { $exists: true },
      'overall.rating': { [`\$${filter.operator}`]: filter.threshold },
      'skill_id': filter.skills.length > 0 ? { $in: filter.skills } : { $exists: true }
    }, paging, projection);
    if (projectHistory) {
      for (const skill of results.items) {
        if (!(skill.history instanceof Array)) skill.history = [];
        if (filter.historySince) {
          skill.history = skill.history.filter(history => history.time > filter.historySince);
        }
        skill.history = skill.history.slice(-filter.historySize);
      }
    }
    return results;
  }

  protected async authorize(byUser: IUserToken) {
    return true;
    // tslint:disable-next-line: no-commented-code
    // return byUser.role.split(',').includes(config.authorizedRole);
  }

  protected async validate(filter: IFilter) {
    return Promise.resolve(validators.validateFilter(filter));
  }

  protected projection(ratings = false, history) {
    return {
      user_id: 1,
      skill_id: 1,
      overall: 1,
      ...(ratings ? { ratings: 1 } : {}),
      ...(history ? { history: 1 } : {})
    };
  }
}