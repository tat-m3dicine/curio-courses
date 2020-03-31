import { ProvidersService } from '../../src/services/ProviderService';
import { ProvidersController } from '../../src/controllers/ProvidersController';
import 'mocha';
import { Context } from 'koa';
import chai, { expect } from 'chai';
import sinon from 'sinon';
import { tryAndExpect } from '../utils/tryAndExpect';
import { NotFoundError } from '../../src/exceptions/NotFoundError';
import { ValidationError } from '../../src/exceptions/ValidationError';
chai.use(require('sinon-chai'));


const providersServiceStub = sinon.spy(() => sinon.createStubInstance(ProvidersService));

describe(`Invite Codes Controller`, () => {

  let _providersServiceStub: ProvidersService;
  let providersController: ProvidersController;
  let ctx: Context;
  beforeEach(() => {
    ctx = JSON.parse(JSON.stringify({ params: {}, request: { body: { validity: {} } }, query: {}, user: {} }));
    _providersServiceStub = new providersServiceStub();
    providersController = new ProvidersController(_providersServiceStub);
  });

  it(`should succeed in creating/adding a provider`, async () => {
    _providersServiceStub.add = async () => <any>{};
    await providersController.create(ctx);
    expect(ctx.status).equal(200);
  });

  it(`should fail to update academics of a provider`, async () => {
    _providersServiceStub.updateAcademicTerm = async () => <any>undefined;
    await providersController.updateAcademics(ctx);
    expect(ctx.status).equal(400);
  });

  it(`should succeed in updating academics of a provider`, async () => {
    _providersServiceStub.updateAcademicTerm = async () => <any>{};
    await providersController.updateAcademics(ctx);
    expect(ctx.status).equal(200);
  });

  it(`should succeed in deleting academics of a provider`, async () => {
    _providersServiceStub.deleteAcademicTermProvider = async () => <any>{ done: false };
    await providersController.deleteAcademicProviders(ctx);
    expect(ctx.status).equal(202);
    _providersServiceStub.deleteAcademicTermProvider = async () => <any>{ done: true };
    await providersController.deleteAcademicProviders(ctx);
    expect(ctx.status).equal(201);
  });

  it(`should succeed in deleting a provider`, async () => {
    _providersServiceStub.deleteProvider = async () => <any>{ done: false };
    await providersController.deleteProvider(ctx);
    expect(ctx.status).equal(202);
    _providersServiceStub.deleteProvider = async () => <any>{ done: true };
    await providersController.deleteProvider(ctx);
    expect(ctx.status).equal(201);
  });

  it(`should succeed in getting a provider`, async () => {
    _providersServiceStub.get = async () => <any>{};
    await providersController.get(ctx);
    expect(ctx.status).equal(200);
  });
});
