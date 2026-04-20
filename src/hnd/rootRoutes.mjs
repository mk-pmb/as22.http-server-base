// -*- coding: utf-8, tab-width: 2 -*-

import cookieParser from 'cookie-parser';
import PrRouter from 'express-promise-router';

import eternal from './wrap/eternal.mjs';
import httpErrors from '../httpErrors.mjs';
import installGlobalRequestExtras from './globalRequestExtras.mjs';
import installStaticWebspaceHandler from './staticWebspaceHandler.install.mjs';
import loggingUtil from './util/logging.mjs';
import siteLocalReservedRoutes from './siteLocalReservedRoutes.mjs';


const trailingSlashMatters = true; /*
  Discern /subdir from /subdir/, because the trailing slash is relevant
  for relative paths.

  Beware: This doesn't fully protect sub-routes:
  https://github.com/expressjs/express/issues/2281
  */


const doNothing = Boolean;

function hideInGetter(x) { return function get() { return x; }; }


const EX = async function installRootRouter(srv, how) {
  const hookCtx = { srv, getRootRouterHow: hideInGetter(how) };
  const { popCfg } = srv;
  const rt = PrRouter({ strict: trailingSlashMatters });
  // eslint-disable-next-line no-param-reassign
  srv.getRootRouter = hideInGetter(rt);
  rt.getServer = hideInGetter(srv);

  await srv.runHook('server/installGlobalRequestExtras/before', hookCtx);
  await installGlobalRequestExtras(srv, rt);
  await srv.runHook('server/installGlobalRequestExtras/after', hookCtx);

  rt.use(cookieParser());
  rt.use(loggingUtil.middleware.logIncomingRequest);

  await srv.runHook('server/installMainRoutes/before', hookCtx);
  await (how.installMainRoutes || doNothing)(rt, how);
  await srv.runHook('server/installMainRoutes/after', hookCtx);

  await srv.runHook('server/siteLocalReservedRoutes/before', hookCtx);
  siteLocalReservedRoutes.installRoutes(rt); // safe to ignore.

  // Static file serving for use as a stand-alone debug server:
  rt.use('/static/favicon.ico', eternal());
  installStaticWebspaceHandler(rt, {
    subUrl: 'static',
    wwwPubPath: popCfg('nonEmpty str', 'wwwpub_path'),
    redirectFilenamesFrom: ['/'],
  });

  // If no previous route has matched, default to:
  rt.use(httpErrors.noHandlerForUrl);

  await srv.runHook('server/installRootRouter/after', hookCtx);
  return rt;
};



export default EX;
