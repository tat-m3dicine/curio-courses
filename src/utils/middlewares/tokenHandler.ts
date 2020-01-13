import jwt from 'jsonwebtoken';
import loggerFactory from '../logging';
import { IUserToken } from '../../models/IUserToken';

const logger = loggerFactory.getLogger('tokenHandler');

const decode = (token) => {
  return new Promise((resolve, reject) => {
    try {
      const decoded = jwt.decode(token);
      return resolve(decoded);
    } catch (err) {
      return reject(err);
    }
  });
};

// jwt-decode application/json
export const tokenHandler = async (ctx, next) => {
  let token = '';
  if (ctx.headers) token = (ctx.headers.authorization + '').split(' ')[1];
  if ((!token || token === '') && next) return next();
  const user = await decode(token).catch(err => undefined) as IUserToken;
  ctx.user = user;
  if (user && user.sub) {
    ctx.user._id = user.sub;
    if (typeof ctx.user.role === 'string') ctx.user.role = ctx.user.role.split(',');
    ctx.user.role = ctx.user.role.map((r: string) => typeof r === 'string' && r.toLowerCase());
    ctx.profile = {
      id: user.sub,
      name: user.fullname,
      avatar: user.avatar,
      grade: user.grade,
      schoolId: user.schooluuid,
      sectionId: user.sectionuuid,
      curriculum: user.curriculum,
    };
  }
  return next();
};