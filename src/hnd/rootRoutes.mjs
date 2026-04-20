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


const EX = async function installRootRouter(srv, how) {
  const { popCfg } = srv;
  const rt = PrRouter({ strict: trailingSlashMatters });
  // eslint-disable-next-line no-param-reassign
  srv.getRootRouter = Object.bind(null, rt);
  rt.getServer = Object.bind(null, srv);
  await installGlobalRequestExtras(srv, rt);
  rt.use(cookieParser());
  rt.use(loggingUtil.middleware.logIncomingRequest);

  await (how.installMainRoutes || doNothing)(rt, how);

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
  return rt;
};



export default EX;
