import 'koa-body';
import { Context } from 'koa';
import loggerFactory from '../utils/logging';
import { IPaging } from '@saal-oryx/unit-of-work';
import { SchoolsService } from '../services/SchoolsService';

const logger = loggerFactory.getLogger('SkillRatingsController');

export class SchoolsController {

  constructor(protected schoolService: SchoolsService) {
  }

  async create(ctx: Context, next: () => void) {
    const result = await this.schoolService.add(ctx.request.body, ctx.user);
    ctx.status = result.done ? 201 : 202;
    ctx.body = { result, ok: true };
    ctx.type = 'json';
  }
  async update(ctx: Context, next: () => void) {
    const result = await this.schoolService.update(ctx.request.body, ctx.params.id, ctx.user);
    ctx.status = result.done ? 201 : 202;
    ctx.body = { result, ok: true };
    ctx.type = 'json';
  }
  async updateAcademics(ctx: Context, next: () => void) {
    const result = await this.schoolService.updateAcademics(ctx.request.body, ctx.params.id, ctx.user);
    ctx.status = 200;
    ctx.body = { result, ok: true };
    ctx.type = 'json';
  }
  async patch(ctx: Context, next: () => void) {
    const result = await this.schoolService.patch(ctx.request.body, ctx.params.id, ctx.user);
    ctx.status = 200;
    ctx.body = { result, ok: true };
    ctx.type = 'json';
  }
  async list(ctx: Context, next: () => void) {
    const result = await this.schoolService.list(this.extractPaging(ctx.request.query), ctx.user);
    ctx.status = 200;
    ctx.body = result;
    ctx.type = 'json';
  }
  async get(ctx: Context, next: () => void) {
    const result = await this.schoolService.get(ctx.params.id);
    ctx.status = 200;
    ctx.body = result;
    ctx.type = 'json';
  }
  async delete(ctx: Context, next: () => void) {
    const result = await this.schoolService.delete(ctx.params.id, ctx.user);
    ctx.status = 200;
    ctx.body = { result: result.data.result , done: result.done };
    ctx.type = 'json';
  }
  async addLicense(ctx: Context, next: () => void) {
    const result = await this.schoolService.patchLicense(ctx.request.body, ctx.params.id, ctx.user);
    ctx.status = 200;
    ctx.body = { result, ok: true };
    ctx.type = 'json';
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
