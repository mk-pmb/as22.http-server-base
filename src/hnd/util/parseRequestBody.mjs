// -*- coding: utf-8, tab-width: 2 -*-

import bpLib from 'body-parser';
import fixStringsDeeplyInplace from 'fix-unicode-strings-deeply-inplace-pmb';
import getOwn from 'getown';
import isFun from 'is-fn';
import loMapValues from 'lodash.mapvalues';
import mustBe from 'typechecks-pmb/must-be.js';
import objPop from 'objpop';
import pify from 'pify';

import exQuack from
  'express-final-text-response-pmb/src/quacksLikeExpressObj.mjs';

import httpErrors from '../../httpErrors.mjs';


const {
  badRequest,
  payloadTooLarge,
} = httpErrors.throwable;


const EX = function makeRequestBodyParser(cfgOrPopper) {
  if (isFun(cfgOrPopper)) {
    const pop = cfgOrPopper; // see popCfg in makeServer.mjs
    const cfg = {
      uploadSizeLimit: pop('str | undef', 'upload_size_limit'),
    };
    return EX(cfg);
  }
  const cfg = cfgOrPopper || false;
  const sizeLimit = (cfg.uploadSizeLimit || '1 MB');
  const state = {
    cfg,
    parsers: {},
    unicodeFixOpt: { ...EX.defaultUnicodeFixOpt },
  };

  Object.assign(state.parsers, {
    json: pify(bpLib.json({ limit: sizeLimit })),
    webform: pify(bpLib.urlencoded({ limit: sizeLimit, extended: true })),
  });

  const bp = EX.statefulCore.bind(null, state /* , [[opt],] req */);
  Object.assign(bp, {
    getInternalState() { return state; },
  });
  return bp;
};


Object.assign(EX, {

  defaultUnicodeFixOpt: { eol: true, trim: true },

  async statefulCore(state, ovr, req) {
    if (ovr && exQuack.request(ovr)) {
      return EX.statefulCore(state, null, ovr);
    }
    let { cfg } = state;
    exQuack.request.must('request to parse body from', req);
    if (ovr) { cfg = { ...cfg, ...ovr }; }
    const impl = getOwn(state.parsers, cfg.fmt);
    if (!impl) { throw new Error('No parser for format ' + cfg.fmt); }
    await impl(req, req.res).catch(EX.util.explainBodyParseError);
    // eslint-disable-next-line no-param-reassign
    req.body = fixStringsDeeplyInplace(req.body, state.unicodeFixOpt); /*
      The "inplace" part only works for containers. It would not affect flat
      body types, e.g. a plain string or a number. Thus we need to assign. */
    if (cfg.fancy) { return EX.util.fancify(req.body, req); }
    return req.body;
  },


});


const fancyMethods = {

  async catchBadInput(fancyCtx, impl, ...args) {
    try {
      return await impl(fancyCtx.mustPopInput, ...args, fancyCtx);
    } catch (e) {
      throw badRequest(['Parse input', e]);
    }
  },

};


EX.util = {

  explainBodyParseError(err) {
    if (err.type === 'entity.too.large') { throw payloadTooLarge(); }
    if (err.statusCode !== 400) { throw err; }
    throw badRequest(['Cannot parse request body', err]);
  },


  fancify(origInput, req) {
    const mustPopInput = objPop(origInput,
      { mustBe, leftoversMsg: 'Unsupported input field' }).mustBe;
    const fancyCtx = {
      req,
      origInput,
      mustPopInput,
    };
    Object.assign(fancyCtx,
      loMapValues(fancyMethods, m => m.bind(null, fancyCtx)));
    return fancyCtx;
  },


  requestExtras(cfgOrPopper) {
    const bp = EX(cfgOrPopper);
    const rx = {
      parseRequestBody(cfg) { return bp(cfg, this); },
    };
    rx.parseRequestBody.unbound = bp;
    return rx;
  },


};


export default EX;
