import 'koa-body';
import { Context } from 'koa';
import loggerFactory from '../utils/logging';
import { IPaging } from '@saal-oryx/unit-of-work';
import { ProvidersService } from '../services/ProviderService';

const logger = loggerFactory.getLogger('ProvidersController');

export class ProvidersController {

  constructor(protected providersService: ProvidersService) {
  }

  async create(ctx: Context) {
    const result = await this.providersService.add(ctx.request.body);
    ctx.status = 200;
    ctx.body = { result, ok: true };
    ctx.type = 'json';
  }

  async updateAcademics(ctx: Context) {
    const result = await this.providersService.updateAcademicTerm(ctx.request.body, ctx.params.providerId, ctx.user);
    if (!result) ctx.status = 400;
    else ctx.status = 200;
    ctx.body = { result, ok: true };
    ctx.type = 'json';
  }

  async deleteAcademicProviders(ctx: Context) {
    const result = await this.providersService.deleteAcademicTermProvider(ctx.params, ctx.user);
    ctx.status = result.done ? 201 : 202;
    ctx.body = { result, ok: true };
    ctx.type = 'json';
  }

  async deleteProvider(ctx: Context) {
    const result = await this.providersService.deleteProvider(ctx.params.providerId, ctx.user);
    ctx.status = result.done ? 201 : 202;
    ctx.body = { result, ok: true };
    ctx.type = 'json';
  }

  async get(ctx: Context) {
    const result = await this.providersService.get(ctx.params.providerId, ctx.user);
    ctx.status = 200;
    ctx.body = result;
    ctx.type = 'json';
  }
}
