import config from '../../config';

export const corsHandler = async (ctx, next) => {
  if (ctx.method !== 'HEAD') return next();
  if (config.production) return next();
  // CORS headers
  ctx.response.append('Access-Control-Allow-Origin', '*');
  ctx.response.append('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS');
  ctx.response.append('Access-Control-Allow-Headers', 'Content-type,Accept,X-Access-Token,X-Key');
  ctx.status = 200;
  return next();
};
