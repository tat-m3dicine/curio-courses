import 'koa-body';
import { Context } from 'koa';
import loggerFactory from '../utils/logging';
import { InviteCodesService } from '../services/InviteCodesService';
import { IPaging } from '@saal-oryx/unit-of-work';
import { NotFoundError } from '../exceptions/NotFoundError';
import validators from '../utils/validators';

const logger = loggerFactory.getLogger('InviteCodesController');

export class InviteCodesController {

  constructor(protected inviteCodesService: InviteCodesService) {
  }

  async create(ctx: Context, next: () => void) {
    const { validity = {}, ...body } = ctx.request.body;
    const createObject = {
      ...body, schoolId: ctx.params.schoolId, validity: {
        fromDate: new Date(validity.fromDate),
        toDate: new Date(validity.toDate)
      }
    };
    validators.validateCreateInviteCode(createObject);
    const result = await this.inviteCodesService.create(createObject, ctx.user);
    ctx.status = result.done ? 201 : 202;
    ctx.body = { ok: true, result: result.data };
    ctx.type = 'json';
  }

  async list(ctx: Context, next: () => void) {
    const result = await this.inviteCodesService.list(ctx.params.schoolId, this.extractPaging(ctx.query), ctx.user);
    ctx.status = 200;
    ctx.body = result;
    ctx.type = 'json';
  }

  async getForSchool(ctx: Context, next: () => void) {
    const { schoolId, codeId } = ctx.params;
    const result = await this.inviteCodesService.getForSchool(schoolId, codeId, ctx.user);
    if (!result) throw new NotFoundError(`Couldn't find invite code '${codeId}' in school '${schoolId}'`);
    ctx.status = 200;
    ctx.body = result;
    ctx.type = 'json';
  }

  async get(ctx: Context, next: () => void) {
    const { codeId } = ctx.params;
    const result = await this.inviteCodesService.getWithSchoolAndCourse(codeId, ctx.user);
    if (result) {
      ctx.body = result;
    } else {
      ctx.body = { valid: false };
    }
    ctx.status = 200;
    ctx.type = 'json';
  }

  async delete(ctx: Context, next: () => void) {
    const { schoolId, codeId } = ctx.params;
    const result = await this.inviteCodesService.delete(schoolId, codeId, ctx.user);
    ctx.status = result.done ? 200 : 202;
    ctx.body = { ok: true };
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
