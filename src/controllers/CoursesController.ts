import 'koa-body';
import { Context } from 'koa';
import loggerFactory from '../utils/logging';
import { CoursesService } from '../services/CoursesService';
import { IPaging } from '@saal-oryx/unit-of-work';
import { NotFoundError } from '../exceptions/NotFoundError';
import { Role } from '../models/Role';

const logger = loggerFactory.getLogger('CoursesController');

export class CoursesController {

  constructor(protected coursesService: CoursesService) {
  }

  async create(ctx: Context, next: () => void) {
    const { schoolId, sectionId } = ctx.params;
    const createObject = { ...ctx.request.body, schoolId, sectionId };
    const result = await this.coursesService.create(createObject, ctx.user);
    ctx.status = result.done ? 201 : 202;
    ctx.body = { ok: true, result: result.data };
    ctx.type = 'json';
  }

  async list(ctx: Context, next: () => void) {
    const { schoolId, sectionId } = ctx.params;
    const result = await this.coursesService.list(schoolId, sectionId, this.extractPaging(ctx.query), ctx.user);
    ctx.status = 200;
    ctx.body = { ok: true, result };
    ctx.type = 'json';
  }

  async get(ctx: Context, next: () => void) {
    const { schoolId, sectionId, courseId } = ctx.params;
    const result = await this.coursesService.get(schoolId, sectionId, courseId, ctx.user);
    if (!result) throw new NotFoundError(`Couldn't find course '${courseId}' in section '${sectionId}'`);
    ctx.status = 200;
    ctx.body = { ok: true, result };
    ctx.type = 'json';
  }

  async update(ctx: Context, next: () => void) {
    const { schoolId, sectionId, courseId } = ctx.params;
    const result = await this.coursesService.update(schoolId, sectionId, courseId, ctx.request.body, ctx.user);
    ctx.status = result.done ? 201 : 202;
    ctx.body = { ok: true, result: result.data };
    ctx.type = 'json';
  }

  async delete(ctx: Context, next: () => void) {
    const { schoolId, sectionId, courseId } = ctx.params;
    await this.coursesService.delete(schoolId, sectionId, courseId, ctx.user);
    ctx.status = 200;
    ctx.body = { ok: true };
    ctx.type = 'json';
  }

  async enrollStudent(ctx: Context, next: () => void) {
    const result = await this.coursesService.enrollStudent(ctx.params, ctx.user);
    ctx.status = 200;
    ctx.body = { ok: true, result: result.data };
    ctx.type = 'json';
  }

  async dropStudent(ctx: Context, next: () => void) {
    const result = await this.coursesService.dropStudent(ctx.params, ctx.user);
    ctx.status = 200;
    ctx.body = { ok: true, result: result.data };
    ctx.type = 'json';
  }

  async enrollTeacher(ctx: Context, next: () => void) {
    const result = await this.coursesService.enrollTeacher(ctx.params, ctx.user);
    ctx.status = 200;
    ctx.body = { ok: true, result: result.data };
    ctx.type = 'json';
  }

  async dropTeacher(ctx: Context, next: () => void) {
    const result = await this.coursesService.dropTeacher(ctx.params, ctx.user);
    ctx.status = 200;
    ctx.body = { ok: true, result: result.data };
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
