// -*- coding: utf-8, tab-width: 2 -*-

import expressTimeoutHandler from 'express-timeout-handler';
import isFun from 'is-fn';
import loMapValues from 'lodash.mapvalues';

import httpErrors from '../httpErrors.mjs';


const EX = function timeoutFallbackResponse(cfgOrPopper) {
  if (isFun(cfgOrPopper)) {
    const pop = cfgOrPopper; // see popCfg in makeServer.mjs
    const cfg = {
      timeoutMsec: pop('str | num | undef', 'response_timeout_sec') * 1e3,
    };
    return EX(cfg);
  }
  const cfg = cfgOrPopper || false;
  const opt = {
    timeout: (+cfg.timeoutMsec || 5e3),
    onTimeout: EX.timeoutHandler,
  };
  const hnd = expressTimeoutHandler.handler(opt);
  return hnd;
};


Object.assign(EX, {

  setLimitMs(ms) {
    // Make a middleware that sets a custom timeout for its route.
    return expressTimeoutHandler.set(ms);
  },


  timeoutHandler(req, rsp) {
    let hints = req.userFacingErrorDebugHints;
    if (hints) {
      hints = EX.resolveHintGenerators(hints, { req, rsp });
      hints = JSON.stringify(hints, null, 2);
    }
    if (hints === '{}') { hints = ''; }
    httpErrors.unexpectedlySlowTask.explain(hints || '(none)')(req, rsp);
  },


  resolveHintGenerators(rootDict, ctx) {
    function render(v, k) {
      let w = v;
      let t = typeof w;
      if (t === 'function') {
        try {
          w = w({ ...ctx, hintKey: k, hintFunc: v });
        } catch (caught) {
          w = 'E: ' + String(caught);
        }
      }
      if (!w) { return w; }
      t = typeof w;
      if (t === 'boolean') { return w; }
      if (t === 'number') { return w; }
      if (t === 'object') { return w; } /*
        Don't dive: For simplicity, we currently only allow generators
        at the top level. */
      return String(w);
    }
    return loMapValues(rootDict, render);
  },


});


export default EX;
