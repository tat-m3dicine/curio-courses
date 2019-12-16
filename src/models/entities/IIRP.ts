export interface IIRPSection {
    _id: string;
    uuid: string;
    name: string;
    grade: string;
    schoolUuid: string;
    inviteCode: string;
    mpq: Date;
    createdAt: Date;
    updatedAt: Date;
}

export interface IIRPUser {
    username: string;
    avatar: string;
    grade: string;
    sectionname: string;
    sectionuuid: string;
    name: string;
    key: string;
    role: string;
    preferences: string[];
}