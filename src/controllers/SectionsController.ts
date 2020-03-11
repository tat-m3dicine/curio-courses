import 'koa-body';
import { Context } from 'koa';
import loggerFactory from '../utils/logging';
import { SectionsService } from '../services/SectionsService';
import { ServerError } from '../exceptions/ServerError';
import { IPaging } from '@saal-oryx/unit-of-work';
import { NotFoundError } from '../exceptions/NotFoundError';
import validators from '../utils/validators';

const logger = loggerFactory.getLogger('SectionsController');

export class SectionsController {

  constructor(protected sectionsService: SectionsService) {
  }

  async create(ctx: Context) {
    const createObject = { ...ctx.request.body, schoolId: ctx.params.schoolId };
    const result = await this.sectionsService.create(createObject, ctx.user);
    ctx.status = result.done ? 201 : 202;
    ctx.body = { ok: true, result: result.data };
    ctx.type = 'json';
  }

  async list(ctx: Context) {
    const { grade } = ctx.query;
    const { schoolId } = ctx.params;
    const result = await this.sectionsService.list({ schoolId, grade }, this.extractPaging(ctx.query), ctx.user);
    ctx.status = 200;
    ctx.body = result;
    ctx.type = 'json';
  }

  async get(ctx: Context) {
    const { schoolId, sectionId } = ctx.params;
    const result = await this.sectionsService.get(schoolId, sectionId, ctx.user);
    if (!result) throw new NotFoundError(`Couldn't find section '${sectionId}' in school '${schoolId}'`);
    ctx.status = 200;
    ctx.body = result;
    ctx.type = 'json';
  }

  async delete(ctx: Context) {
    const { schoolId, sectionId } = ctx.params;
    const result = await this.sectionsService.delete(schoolId, sectionId, ctx.user);
    ctx.status = result.done ? 200 : 202;
    ctx.body = { ok: true };
    ctx.type = 'json';
  }

  async getStudents(ctx: Context) {
    const { schoolId, sectionId } = ctx.params;
    const result = await this.sectionsService.getStudents(schoolId, sectionId, ctx.user);
    if (!result) throw new NotFoundError(`Couldn't find section '${sectionId}' of '${schoolId}' school`);
    ctx.status = 200;
    ctx.body = result;
    ctx.type = 'json';
  }

  async registerStudents(ctx: Context) {
    validators.validateStudentsList(ctx.request.body);
    const { schoolId, sectionId } = ctx.params;
    const result = await this.sectionsService.registerStudents(schoolId, sectionId, ctx.request.body.students, ctx.user);
    ctx.status = 200;
    ctx.body = { ok: true, result };
    ctx.type = 'json';
  }

  async removeStudents(ctx: Context) {
    validators.validateStudentsList(ctx.request.body);
    const { schoolId, sectionId } = ctx.params;
    const result = await this.sectionsService.removeStudents(schoolId, sectionId, ctx.request.body.students, ctx.user);
    ctx.status = 200;
    ctx.body = { ok: true, result };
    ctx.type = 'json';
  }

  protected extractPaging(query: any) {
    const { index, size } = query;
    const createdAt = query['sorter.createdAt'] === '-1' ? -1 : 1;
    let parsedIndex = parseInt(index);
    let parsedSize = parseInt(size);
    if (!parsedIndex || parsedIndex < 1 || isNaN(parsedIndex)) parsedIndex = 0;
    else parsedIndex -= 1;
    if (!parsedSize || parsedSize < 1 || isNaN(parsedSize)) parsedSize = 10;
    const result = <IPaging>{
      index: parsedIndex,
      size: parsedSize,
      sorter: { createdAt }
    };
    return result;
  }
}
