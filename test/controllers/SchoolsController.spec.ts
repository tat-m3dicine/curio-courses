import { SchoolsService } from '../../src/services/SchoolsService';
import { SchoolsController } from '../../src/controllers/SchoolsController';
import 'mocha';
import { Context } from 'koa';
import chai, { expect } from 'chai';
import sinon from 'sinon';
import { Role } from '../../src/models/Role';
chai.use(require('sinon-chai'));


const schoolsServiceStub = sinon.spy(() => sinon.createStubInstance(SchoolsService));

describe(`Schools Controller`, () => {

  let _schoolsServiceStub: SchoolsService;
  let schoolsController: SchoolsController;
  let ctx: Context;
  beforeEach(() => {
    ctx = JSON.parse(JSON.stringify({ params: {}, request: { query: {}, body: { validity: {} } }, query: {}, user: {} }));
    _schoolsServiceStub = new schoolsServiceStub();
    schoolsController = new SchoolsController(_schoolsServiceStub);
  });

  it(`should succeed in creating/adding a school`, async () => {
    _schoolsServiceStub.add = async () => <any>{ done: false };
    await schoolsController.create(ctx);
    expect(ctx.status).equal(202);
    _schoolsServiceStub.add = async () => <any>{ done: true };
    await schoolsController.create(ctx);
    expect(ctx.status).equal(201);
  });

  it(`should succeed in updating a school`, async () => {
    _schoolsServiceStub.update = async () => <any>{ done: false };
    await schoolsController.update(ctx);
    expect(ctx.status).equal(202);
    _schoolsServiceStub.update = async () => <any>{ done: true };
    await schoolsController.update(ctx);
    expect(ctx.status).equal(201);
  });

  it(`should succeed in updating academics in a school`, async () => {
    _schoolsServiceStub.updateAcademicTerm = async () => <any>{ done: false };
    await schoolsController.updateAcademics(ctx);
    expect(ctx.status).equal(200);
  });

  it(`should succeed in deleting academics of a school`, async () => {
    _schoolsServiceStub.deleteAcademicTerm = async () => <any>{ done: false };
    await schoolsController.deleteAcademics(ctx);
    expect(ctx.status).equal(202);
    _schoolsServiceStub.deleteAcademicTerm = async () => <any>{ done: true };
    await schoolsController.deleteAcademics(ctx);
    expect(ctx.status).equal(201);
  });

  it(`should succeed in updating users in a school`, async () => {
    _schoolsServiceStub.updateUsers = async () => <any>{};
    await schoolsController.updateUsers(ctx);
    expect(ctx.status).equal(200);
  });

  it(`should succeed in deleting users in a school`, async () => {
    _schoolsServiceStub.deleteUsers = async () => <any>{};
    await schoolsController.deleteUsers(ctx);
    expect(ctx.status).equal(200);
  });

  it(`should succeed in patching a school`, async () => {
    _schoolsServiceStub.patch = async () => <any>{};
    await schoolsController.patch(ctx);
    expect(ctx.status).equal(200);
  });

  it(`should succeed in listing schools`, async () => {
    ctx.query.index = '1';
    ctx.query.size = '5';
    _schoolsServiceStub.list = async () => <any>{};
    await schoolsController.list(ctx);
    expect(ctx.status).equal(200);
  });

  it(`should succeed in getting a school`, async () => {
    _schoolsServiceStub.get = async () => <any>{};
    await schoolsController.get(ctx);
    expect(ctx.status).equal(200);
  });

  it(`should succeed in deleting a school`, async () => {
    _schoolsServiceStub.delete = async () => <any>{ data: {} };
    await schoolsController.delete(ctx);
    expect(ctx.status).equal(200);
  });

  it(`should succeed in adding a school's license`, async () => {
    _schoolsServiceStub.patchLicense = async () => <any>{};
    await schoolsController.addLicense(ctx);
    expect(ctx.status).equal(200);
  });

  it(`should succeed in getting students`, async () => {
    _schoolsServiceStub.getUsers = async () => <any>{};
    await schoolsController.getStudents(ctx);
    expect(ctx.status).equal(200);
  });

  it(`should succeed in getting teachers`, async () => {
    _schoolsServiceStub.getUsers = async () => <any>{};
    await schoolsController.getTeachers(ctx);
    expect(ctx.status).equal(200);
  });

  it(`should succeed in registering users`, async () => {
    ctx.params.role = Role.student;
    _schoolsServiceStub.registerUsers = async () => <any>{};
    await schoolsController.registerUsers(ctx);
    expect(ctx.status).equal(200);
    ctx.params.role = Role.teacher;
    _schoolsServiceStub.registerUsers = async () => <any>{};
    await schoolsController.registerUsers(ctx);
    expect(ctx.status).equal(200);

  });
});
