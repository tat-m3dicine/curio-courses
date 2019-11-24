export interface IUserToken {
  jti: string;
  sub: string;
  iss: string;
  iat: number;
  exp: number;
  scope: string;
  name: string;
  key: string;
  aud: string;
  avatar: string;
  role: string;
  curriculum: string;
  grade: string;
  schooluuid: string;
  schoolname: string;
  sectionuuid: string;
  sectionname: string;
  fullname: string;
}

export interface IUserProfile {
  id: string;
  name: string;
  avatar: string;
  grade: string;
  schoolId: string;
  sectionId: string;
  curriculum: string;
}