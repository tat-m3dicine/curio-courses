import 'koa-body';
import { Context } from 'koa';
import loggerFactory from '../utils/logging';
import { SkillRatingsService as SectionsService } from '../services/SkillRatingsService';
import { ServerError } from '../exceptions/ServerError';

const logger = loggerFactory.getLogger('SkillRatingsController');

export class SectionsController {

  constructor(protected sectionsService: SectionsService) {
  }

  async registerStudents(ctx: Context, next: () => void) {
    const { school_id, section_id } = ctx.params;
    const { students } = ctx.body;
    const result = await this.sectionsService.registerStudents(school_id, section_id, students, ctx.user);
    if (!result) throw new ServerError(`Couldn't register students in school '${school_id}' section '${section_id}'`);
    ctx.status = 200;
    ctx.body = { ok: true, result };
    ctx.type = 'json';
  }

  async removeStudents(ctx: Context, next: () => void) {
    const { school_id, section_id } = ctx.params;
    const { students } = ctx.body;
    const result = await this.sectionsService.removeStudents(school_id, section_id, students, ctx.user);
    if (!result) throw new ServerError(`Couldn't remove students from school '${school_id}' section '${section_id}'`);
    ctx.status = 200;
    ctx.body = { ok: true, result };
    ctx.type = 'json';
  }
}
