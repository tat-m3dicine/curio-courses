import 'koa-body';
import { Context } from 'koa';
import loggerFactory from '../utils/logging';
import { IPaging } from '@saal-oryx/unit-of-work';
import { SchoolsService } from '../services/SchoolsService';
import { Role } from '../models/Role';
import { Status } from '../models/entities/IUser';

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
    const result = await this.schoolService.update(ctx.request.body, ctx.params.schoolId, ctx.user);
    ctx.status = result.done ? 201 : 202;
    ctx.body = { result, ok: true };
    ctx.type = 'json';
  }
  async updateAcademics(ctx: Context, next: () => void) {
    const result = await this.schoolService.updateAcademicTerm(ctx.request.body, ctx.params.schoolId, ctx.user);
    ctx.status = 200;
    ctx.body = { result, ok: true };
    ctx.type = 'json';
  }
  async deleteAcademics(ctx: Context, next: () => void) {
    const result = await this.schoolService.deleteAcademicTerm(ctx.params, ctx.user);
    ctx.status = result.done ? 201 : 202;
    ctx.body = { result, ok: true };
    ctx.type = 'json';
  }
  async updateUsers(ctx: Context, next: () => void) {
    const result = await this.schoolService.updateUsers(ctx.request.body, ctx.params.schoolId, ctx.user);
    ctx.status = 200;
    ctx.body = { result: result.data, ok: true };
    ctx.type = 'json';
  }
  async deleteUsers(ctx: Context, next: () => void) {
    const result = await this.schoolService.deleteUsers(ctx.request.body, ctx.params.schoolId, ctx.user);
    ctx.status = 200;
    ctx.body = { result: result.data, ok: true };
    ctx.type = 'json';
  }
  async patch(ctx: Context, next: () => void) {
    const result = await this.schoolService.patch(ctx.request.body, ctx.params.schoolId, ctx.user);
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
    const result = await this.schoolService.get(ctx.params.schoolId, ctx.user);
    ctx.status = 200;
    ctx.body = result;
    ctx.type = 'json';
  }
  async delete(ctx: Context, next: () => void) {
    const result = await this.schoolService.delete(ctx.params.schoolId, ctx.user);
    ctx.status = 200;
    ctx.body = { result: result.data.result, done: result.done };
    ctx.type = 'json';
  }
  async addLicense(ctx: Context, next: () => void) {
    const result = await this.schoolService.patchLicense(ctx.request.body, ctx.params.schoolId, ctx.user);
    ctx.status = 200;
    ctx.body = { result, ok: true };
    ctx.type = 'json';
  }
  async getStudents(ctx: Context, next: () => void) {
    const status: Status = ctx.query.status || 'all';
    const result = await this.schoolService.getUsers({ schoolId: ctx.params.schoolId, role: Role.student, status }, this.extractPaging(ctx.request.query), ctx.user);
    ctx.status = 200;
    ctx.body = result;
    ctx.type = 'json';
  }
  async getTeachers(ctx: Context, next: () => void) {
    const status: Status = ctx.query.status;
    const result = await this.schoolService.getUsers({ schoolId: ctx.params.schoolId, role: Role.teacher, status }, this.extractPaging(ctx.request.query), ctx.user);
    ctx.status = 200;
    ctx.body = result;
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
