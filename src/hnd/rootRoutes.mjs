// -*- coding: utf-8, tab-width: 2 -*-

import cookieParser from 'cookie-parser';
import PrRouter from 'express-promise-router';

import httpErrors from '../httpErrors.mjs';
import installGlobalRequestExtras from './globalRequestExtras.mjs';
import loggingUtil from './util/logging.mjs';


const trailingSlashMatters = true; /*
  Discern /subdir from /subdir/, because the trailing slash is relevant
  for relative paths.

  Beware: This doesn't fully protect sub-routes:
  https://github.com/expressjs/express/issues/2281
  */


const EX = async function installRootRouter(srv) {
  const rt = PrRouter({ strict: trailingSlashMatters });
  // eslint-disable-next-line no-param-reassign
  srv.getRootRouter = Object.bind(null, rt);
  await installGlobalRequestExtras(srv, rt);
  rt.use(cookieParser());
  rt.use(loggingUtil.middleware.logIncomingRequest);

  // :TODO: Hook to register custom routes here.

  // If no previous route has matched, default to:
  rt.use(httpErrors.noHandlerForUrl);
  return rt;
};


export default EX;
