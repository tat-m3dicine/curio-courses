import { InviteCodesController } from '../../src/controllers/InviteCodesController';
import { InviteCodesService } from '../../src/services/InviteCodesService';
import 'mocha';
import { Context } from 'koa';
import chai, { expect } from 'chai';
import sinon from 'sinon';
import { tryAndExpect } from '../utils/tryAndExpect';
import { NotFoundError } from '../../src/exceptions/NotFoundError';
chai.use(require('sinon-chai'));


const inviteCodesServiceStub = sinon.spy(() => sinon.createStubInstance(InviteCodesService));

describe(`Invite Codes Controller`, () => {

  let _inviteCodesServiceStub: InviteCodesService;
  let inviteCodesController: InviteCodesController;
  let ctx: Context;
  beforeEach(() => {
    ctx = JSON.parse(JSON.stringify({ params: {}, request: { body: {} }, query: {}, user: {} }));
    _inviteCodesServiceStub = new inviteCodesServiceStub();
    inviteCodesController = new InviteCodesController(_inviteCodesServiceStub);
  });

  it(`should succeed in creating invite code`, async () => {
    _inviteCodesServiceStub.create = async () => <any>{ done: false };
    await inviteCodesController.create(ctx);
    expect(ctx.status).equal(202);
    _inviteCodesServiceStub.create = async () => <any>{ done: true };
    await inviteCodesController.create(ctx);
    expect(ctx.status).equal(201);
  });

  it(`should succeed in listing invite code`, async () => {
    _inviteCodesServiceStub.list = async () => <any>{};
    await inviteCodesController.list(ctx);
    expect(ctx.status).equal(200);
    ctx.query.index = 5;
    ctx.query.size = 10;
    ctx.query['sorter.createdAt'] = '-1';
    _inviteCodesServiceStub.list = async () => <any>{};
    await inviteCodesController.list(ctx);
    expect(ctx.status).equal(200);
  });

  it(`should fail to get invite code for a school because inv code doesn't exist for that school`, async () => {
    _inviteCodesServiceStub.getForSchool = async () => <any>undefined;
    await tryAndExpect(async () => inviteCodesController.getForSchool(ctx), NotFoundError);
  });

  it(`should succeed in getting invite code for a school`, async () => {
    _inviteCodesServiceStub.getForSchool = async () => <any>{};
    await inviteCodesController.getForSchool(ctx);
    expect(ctx.status).equal(200);
  });

  it(`should succeed in getting invite code`, async () => {
    _inviteCodesServiceStub.getWithAllInfo = async () => <any>{};
    await inviteCodesController.get(ctx);
    expect(ctx.status).equal(200);
  });

  it(`should succeed in deleting invite code`, async () => {
    _inviteCodesServiceStub.delete = async () => <any>{ done: false };
    await inviteCodesController.delete(ctx);
    expect(ctx.status).equal(202);
    _inviteCodesServiceStub.delete = async () => <any>{ done: true };
    await inviteCodesController.delete(ctx);
    expect(ctx.status).equal(200);
  });


});
