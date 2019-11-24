import 'koa-body';
import { Context } from 'koa';
import loggerFactory from '../utils/logging';
import { SkillRatingsService } from '../services/SkillRatingsService';
import { IPaging } from '@saal-oryx/unit-of-work';
import { IFilter } from '../models/entities/IFilter';
import { NotFoundError } from '../exceptions/NotFoundError';

const logger = loggerFactory.getLogger('SkillRatingsController');

export class SkillRatingsController {

  constructor(protected skillRatingsService: SkillRatingsService) {
  }

  async getForUserByFilter(ctx: Context, next: () => void) {
    const filter = this.extractFilter(ctx.request.query, ctx.params.userId, ctx.params.skillId);
    const paging = { index: 0, size: 1};
    const result = await this.skillRatingsService.getForUserByFilter(filter, paging, ctx.user);
    if (!result.items.length) throw new NotFoundError(`skill '${ctx.params.skillId}' for user '${ctx.params.userId}' was not found`);
    ctx.status = 200;
    ctx.body = result.items[0];
    ctx.type = 'json';
  }

  async getForOneUserByFilter(ctx: Context, next: () => void) {
    const filter = this.extractFilter(ctx.request.query, ctx.params.userId);
    const paging = this.extractPaging(ctx.request.query);
    const result = await this.skillRatingsService.getForUserByFilter(filter, paging, ctx.user);
    ctx.status = 200;
    ctx.body = { ok: true, result };
    ctx.type = 'json';
  }

  async getManyUsersByFilter(ctx: Context, next: () => void) {
    const filter = this.extractFilter(ctx.request.query);
    const paging = this.extractPaging(ctx.request.query);
    const result = await this.skillRatingsService.getForUserByFilter(filter, paging, ctx.user);
    ctx.status = 200;
    ctx.body = { ok: true, result };
    ctx.type = 'json';
  }

  extractFilter(query: any, user?: string, skill?: string) {
    return <IFilter>{
      users: user && [ user ] || query['filter.users'] && query['filter.users'].split(',') || [],
      skills: skill && [ skill ] || query['filter.skills'] && query['filter.skills'].split(',') || [],
      threshold: 'filter.threshold' in query ? parseFloat(query['filter.threshold']) : -1,
      operator: query['filter.operator'] || 'gte',
      historySize: parseInt(query['filter.history.size']) || undefined,
      historySince: query['filter.history.since'] ? new Date(query['filter.history.since']) : undefined
    };
  }

  extractPaging(object: any) {
    const { index, size } = object;
    let parsedIndex = parseInt(index);
    let parsedSize = parseInt(size);
    if (!parsedIndex || parsedIndex < 1 || isNaN(parsedIndex)) parsedIndex = 0;
    else parsedIndex -= 1;
    if (!parsedSize || parsedSize < 1 || isNaN(parsedSize)) parsedSize = 10;

    return <IPaging>{
      index: parsedIndex,
      size: parsedSize
    };
  }
}
