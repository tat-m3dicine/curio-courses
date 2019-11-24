import { Context } from 'koa';
import { AppError } from '../../exceptions/AppError';
import { ServerError } from '../../exceptions/ServerError';

export const respondeWithError = (ctx: Context, err: any) => {
  if (err instanceof AppError) {
    ctx.type = 'json';
    ctx.body = err.getResponse();
    ctx.status = err.getStatusCode();
  } else {
    ctx.app.emit('error', err, ctx);
    const serverError = new ServerError(err, 500);
    ctx.type = 'json';
    ctx.body = serverError.getResponse();
    ctx.status = serverError.getStatusCode();
  }
};

export const errorHandler = (ctx, next) => next().catch(err => respondeWithError(ctx, err));