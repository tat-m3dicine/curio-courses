import { SectionsService } from '../../src/services/SectionsService';
import { SectionsController } from '../../src/controllers/SectionsController';
import 'mocha';
import { Context } from 'koa';
import chai, { expect } from 'chai';
import sinon from 'sinon';
import { tryAndExpect } from '../utils/tryAndExpect';
import { NotFoundError } from '../../src/exceptions/NotFoundError';
import { ValidationError } from '../../src/exceptions/ValidationError';
import { ServerError } from '../../src/exceptions/ServerError';
chai.use(require('sinon-chai'));


const sectionsServiceStub = sinon.spy(() => sinon.createStubInstance(SectionsService));

const createSectionData = {
  locales: {
    en: {
      name: 'english'
    }
  },
  schoolId: 'schoolId',
  grade: '5'

};

describe(`Sections Controller`, () => {

  let _sectionsServiceStub: SectionsService;
  let sectionsController: SectionsController;
  let ctx: Context;
  beforeEach(() => {
    ctx = JSON.parse(JSON.stringify({ params: {}, request: { query: {}, body: { validity: {} } }, query: {}, user: {} }));
    _sectionsServiceStub = new sectionsServiceStub();
    sectionsController = new SectionsController(_sectionsServiceStub);
  });

  it(`should fail to create/add a section (validation error)`, async () => {
    _sectionsServiceStub.create = async () => <any>{ done: false };
    await tryAndExpect(async () => sectionsController.create(ctx), ValidationError);
  });

  it(`should succeed in creating/adding a section`, async () => {
    ctx.request.body = createSectionData;
    ctx.params.schoolId = createSectionData.schoolId;
    _sectionsServiceStub.create = async () => <any>{ done: false };
    await sectionsController.create(ctx);
    expect(ctx.status).equal(202);
    _sectionsServiceStub.create = async () => <any>{ done: true };
    await sectionsController.create(ctx);
    expect(ctx.status).equal(201);
  });

  it(`should succeed in listing sections`, async () => {
    _sectionsServiceStub.list = async () => <any>{};
    await sectionsController.list(ctx);
    expect(ctx.status).equal(200);
    ctx.query.index = 1;
    ctx.query.size = 5;
    ctx.query['sorter.createdAt'] = '-1';
    _sectionsServiceStub.list = async () => <any>{};
    await sectionsController.list(ctx);
    expect(ctx.status).equal(200);
  });

  it(`should fail to get a section`, async () => {
    _sectionsServiceStub.get = async () => <any>undefined;
    await tryAndExpect(async () => sectionsController.get(ctx), NotFoundError);
  });

  it(`should succeed in getting a section`, async () => {
    _sectionsServiceStub.get = async () => <any>{};
    await sectionsController.get(ctx);
    expect(ctx.status).equal(200);
  });

  it(`should succeed in deleting a section`, async () => {
    _sectionsServiceStub.delete = async () => <any>{ done: false };
    await sectionsController.delete(ctx);
    expect(ctx.status).equal(202);
    _sectionsServiceStub.delete = async () => <any>{ done: true };
    await sectionsController.delete(ctx);
    expect(ctx.status).equal(200);
  });

  it(`should fail to get students in a section`, async () => {
    _sectionsServiceStub.getStudents = async () => <any>undefined;
    await tryAndExpect(async () => sectionsController.getStudents(ctx), NotFoundError);
  });

  it(`should succeed in getting stundents in a section`, async () => {
    _sectionsServiceStub.getStudents = async () => <any>{};
    await sectionsController.getStudents(ctx);
    expect(ctx.status).equal(200);
  });

  it(`should fail to register students in a section (server error)`, async () => {
    _sectionsServiceStub.registerStudents = async () => <any>undefined;
    ctx.request.body = { students: [''] };
    await tryAndExpect(async () => sectionsController.registerStudents(ctx), ServerError);
  });

  it(`should succeed in registering students in a section`, async () => {
    _sectionsServiceStub.registerStudents = async () => <any>{};
    ctx.request.body = { students: [''] };
    await sectionsController.registerStudents(ctx);
    expect(ctx.status).equal(200);
  });

  it(`should fail to remove students from a section (server error)`, async () => {
    _sectionsServiceStub.removeStudents = async () => <any>undefined;
    ctx.request.body = { students: [''] };
    await tryAndExpect(async () => sectionsController.removeStudents(ctx), ServerError);
  });

  it(`should succeed in removing students from a section`, async () => {
    _sectionsServiceStub.removeStudents = async () => <any>{};
    ctx.request.body = { students: [''] };
    await sectionsController.removeStudents(ctx);
    expect(ctx.status).equal(200);
  });
});
