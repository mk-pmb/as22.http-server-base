// -*- coding: utf-8, tab-width: 2 -*-
//
// These are added to ALL routes, so make sure to keep them as minimal
// and as quick as possible.

import qrystr from 'qrystr';

import sendFinalTextResponse from '../finalTextResponse.mjs';
import guessClientPrefersHtml from './util/guessClientPrefersHtml.mjs';


const EX = function installGlobalRequestExtras(srv, appOrRouter) {
  const allSharedExtras = {
    ...EX.initialExtras,
    getSrv() { return srv; },
  };
  appOrRouter.use(EX.enhanceOneRequest.bind(null, allSharedExtras));
  const add = Object.assign.bind(null, allSharedExtras);
  // ^- This function can be used to easily add more extras later on
  //    once they are available (like `.getDb`).
  srv.globalRequestExtras = add; // eslint-disable-line no-param-reassign
  return add;
};


Object.assign(EX, {

  enhanceOneRequest(allSharedExtras, req) {
    Object.assign(req, allSharedExtras, {
      userFacingErrorDebugHints: {},
    }).next();
  },


});


EX.initialExtras = {

  ...((ftr => ({
    sendJsonResult(x, o) { return ftr.json(this, x, o); },
    sendTextResult(x, o) { return ftr(this, x, { type: 'plain', ...o }); },
  }))(sendFinalTextResponse)),

  untrustedDebugOpt() {
    const req = this;
    let o = req.cachedDebugOpts;
    if (o === undefined) {
      o = req.cookies.as22debug;
      o = (o ? qrystr(o) : false);
      req.cachedDebugOpts = o;
    }
    return o;
  },


  nicerRedirect(destUrl) {
    const req = this;
    if (guessClientPrefersHtml(req) && req.untrustedDebugOpt().noredir) {
      const msg = 'Debug cookie prevented redirect to: <' + destUrl + '>\n';
      return sendFinalTextResponse(req, msg, { type: 'plain' });
    }
    req.logCkp('RedirN', // <-- The "N" means "nicer".
      // … $verb $url …
      '->', destUrl);
    return req.res.redirect(destUrl);
  },


};


export default EX;
