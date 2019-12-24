import 'koa-body';
import { Context } from 'koa';
import loggerFactory from '../utils/logging';
import { IPaging } from '@saal-oryx/unit-of-work';
import { ProvidersService } from '../services/ProviderService';

const logger = loggerFactory.getLogger('ProvidersController');

export class ProvidersController {

  constructor(protected providersService: ProvidersService) {
  }

  async create(ctx: Context, next: () => void) {
    const result = await this.providersService.add(ctx.request.body);
    ctx.status = 200;
    ctx.body = { result, ok: true };
    ctx.type = 'json';
  }

  async updateAcademics(ctx: Context, next: () => void) {
    const result = await this.providersService.updateAcademicTerm(ctx.request.body, ctx.params.providerId, ctx.user);
    if (!result) ctx.status = 400;
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
