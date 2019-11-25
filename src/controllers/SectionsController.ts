import 'koa-body';
import { Context } from 'koa';
import loggerFactory from '../utils/logging';
import { SectionsService } from '../services/SectionsService';
import { ServerError } from '../exceptions/ServerError';
import { IPaging } from '@saal-oryx/unit-of-work';
import { NotFoundError } from '../exceptions/NotFoundError';

const logger = loggerFactory.getLogger('SectionsController');

export class SectionsController {

  constructor(protected sectionsService: SectionsService) {
  }

  async create(ctx: Context, next: () => void) {
    const result = await this.sectionsService.create(ctx.request.body, ctx.user);
    ctx.status = 200;
    ctx.body = { ok: true, result };
    ctx.type = 'json';
  }

  async get(ctx: Context, next: () => void) {
    const result = await this.sectionsService.get(ctx.params.id, ctx.user);
    if (!result) throw new NotFoundError(`Couldn't find section '${ctx.params.id}'`);
    ctx.status = 200;
    ctx.body = { ok: true, result };
    ctx.type = 'json';
  }

  async list(ctx: Context, next: () => void) {
    const result = await this.sectionsService.list(this.extractPaging(ctx.query), ctx.user);
    ctx.status = 200;
    ctx.body = { ok: true, result };
    ctx.type = 'json';
  }

  async delete(ctx: Context, next: () => void) {
    await this.sectionsService.delete(ctx.params.id, ctx.user);
    ctx.status = 200;
    ctx.body = { ok: true };
    ctx.type = 'json';
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

  protected extractPaging(query: any) {
    const { index, size } = query;
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
