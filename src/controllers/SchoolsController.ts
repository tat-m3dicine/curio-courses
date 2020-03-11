import 'koa-body';
import { Context } from 'koa';
import loggerFactory from '../utils/logging';
import { IPaging } from '@saal-oryx/unit-of-work';
import { SchoolsService } from '../services/SchoolsService';
import { Role } from '../models/Role';
import { Status } from '../models/entities/IUser';
import { IRegistrationAction } from '../models/requests/IRegistrationAction';

const logger = loggerFactory.getLogger('SchoolsController');

export class SchoolsController {

  constructor(protected schoolService: SchoolsService) {
  }

  async create(ctx: Context) {
    const result = await this.schoolService.add(ctx.request.body, ctx.user);
    ctx.status = result.done ? 201 : 202;
    ctx.body = { result, ok: true };
    ctx.type = 'json';
  }
  async update(ctx: Context) {
    const result = await this.schoolService.update(ctx.request.body, ctx.params.schoolId, ctx.user);
    ctx.status = result.done ? 201 : 202;
    ctx.body = { result, ok: true };
    ctx.type = 'json';
  }
  async updateAcademics(ctx: Context) {
    const result = await this.schoolService.updateAcademicTerm(ctx.request.body, ctx.params.schoolId, ctx.user);
    ctx.status = 200;
    ctx.body = { result, ok: true };
    ctx.type = 'json';
  }
  async deleteAcademics(ctx: Context) {
    const result = await this.schoolService.deleteAcademicTerm(ctx.params, ctx.user);
    ctx.status = result.done ? 200 : 202;
    ctx.body = { result, ok: true };
    ctx.type = 'json';
  }
  async updateUsers(ctx: Context) {
    const result = await this.schoolService.updateUsers(ctx.request.body, ctx.params.schoolId, ctx.user);
    ctx.status = 200;
    ctx.body = { result: result.data, ok: true };
    ctx.type = 'json';
  }
  async deleteUsers(ctx: Context) {
    const result = await this.schoolService.deleteUsers(ctx.request.body, ctx.params.schoolId, ctx.user);
    ctx.status = 200;
    ctx.body = { result: result.data, ok: true };
    ctx.type = 'json';
  }
  async patch(ctx: Context) {
    const result = await this.schoolService.patch(ctx.request.body, ctx.params.schoolId, ctx.user);
    ctx.status = 200;
    ctx.body = { result, ok: true };
    ctx.type = 'json';
  }
  async list(ctx: Context) {
    const result = await this.schoolService.list(this.extractPaging(ctx.query), ctx.user);
    ctx.status = 200;
    ctx.body = result;
    ctx.type = 'json';
  }
  async get(ctx: Context) {
    const result = await this.schoolService.get(ctx.params.schoolId, ctx.user);
    ctx.status = 200;
    ctx.body = result;
    ctx.type = 'json';
  }
  async delete(ctx: Context) {
    const result = await this.schoolService.delete(ctx.params.schoolId, ctx.user);
    ctx.status = 200;
    ctx.body = { result: result.data.result, done: result.done };
    ctx.type = 'json';
  }
  async addLicense(ctx: Context) {
    const result = await this.schoolService.patchLicense(ctx.request.body, ctx.params.schoolId, ctx.user);
    ctx.status = 200;
    ctx.body = { result, ok: true };
    ctx.type = 'json';
  }
  async getStudents(ctx: Context) {
    const { query: { status = 'all', courses }, params: { schoolId } } = ctx;
    const result = await this.schoolService.getUsers({ schoolId, role: Role.student, status, courses }, this.extractPaging(ctx.request.query), ctx.user);
    ctx.status = 200;
    ctx.body = result;
    ctx.type = 'json';
  }
  async getTeachers(ctx: Context) {
    const { query: { status = 'all', courses }, params: { schoolId } } = ctx;
    const result = await this.schoolService.getUsers({ schoolId, role: Role.teacher, status, courses }, this.extractPaging(ctx.request.query), ctx.user);
    ctx.status = 200;
    ctx.body = result;
    ctx.type = 'json';
  }
  async registerUsers(ctx: Context) {
    const role: Role = ctx.params.role;
    const request: IRegistrationAction = {
      schoolId: ctx.params.schoolId,
      users: role === Role.student ? ctx.request.body.students : ctx.request.body.teachers,
      action: ctx.params.action,
      role
    };
    const result = await this.schoolService.registerUsers(request, ctx.user);
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
