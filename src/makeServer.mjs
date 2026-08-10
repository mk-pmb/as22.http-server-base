// -*- coding: utf-8, tab-width: 2 -*-

import envcfgMergeConfigs from 'envcfg-merge-configs-pmb';
import express from 'express';
import makeHookRunner from 'hookrunner25a-pmb';
import mustBe from 'typechecks-pmb/must-be.js';
import nodeHttp from 'node:http';
import objPop from 'objpop';


import configFilesAdapter from './cfg/configFilesAdapter/ad.mjs';
import fallbackErrorHandler from './hnd/fallbackErrorHandler.mjs';
import installListenAddrPlumbing from './listenAddrPlumbing.mjs';
import installRootRouter from './hnd/rootRoutes.mjs';
import loggingUtil from './hnd/util/logging.mjs';
import makeRequestBodyParser from './hnd/util/parseRequestBody.mjs';
import setupCiTestFeatures from './setupCiTestFeatures.mjs';
import setupCleanExit from './setupCleanExit.mjs';


const doNothing = Boolean;


const EX = async function createServer(how) {
  const entireConfig = envcfgMergeConfigs({ ifPrefixProp: 'envcfg_prefix' },
    EX.cliConfigDefaults,
    how.cliConfigDefaults,
    how.allCliOpt);
  const popCfg = objPop.d(entireConfig, { mustBe }).mustBe;
  popCfg('str | eeq:false', 'envcfg_prefix');
  console.debug('Server config:', entireConfig);

  const webSrv = nodeHttp.createServer();
  const srv = {
    ...loggingUtil.basics,
    configFiles: await configFilesAdapter.make({ popCfg }),
    getLowLevelWebServer() { return webSrv; },
    popCfg,
    runHook: makeHookRunner(),

    initialConfigDone() {
      popCfg.expectEmpty('Unsupported server config option(s)');
      srv.popCfg = EX.denyLateConfigRead;
    },

  };
  await (how.installHooks || doNothing)(srv, how);
  await srv.runHook('server/makeServer/early', { srv, how });

  await (how.installPlugins || doNothing)(srv, how);
  // ^-- e.g. from `./pluginsLib.mjs`, await pluginsLib.install(srv);

  const app = express();
  app.set('x-powered-by', false);
  app.set('case sensitive routing', true);
  app.set('etag', false);
  app.set('strict routing', true);
  await srv.runHook('server/expressApp/config', { app, srv });

  app.use(await installRootRouter(srv, how));
  app.use(fallbackErrorHandler.decide(popCfg, webSrv));

  app.once('close', async function cleanup(...args) {
    console.debug('App cleanup:', args);
    await srv.runHook('server/cleanup/before', { srv, args });
    await srv.runHook('server/cleanup/after', { srv, args });
  });

  await installListenAddrPlumbing(srv);
  await setupCleanExit(srv);
  await setupCiTestFeatures(srv);

  srv.globalRequestExtras({
    ...loggingUtil.requestExtras,
    ...makeRequestBodyParser.util.requestExtras(popCfg),
  });

  await srv.runHook('server/installRequestHandler/before', { app, srv });
  webSrv.on('request', app);
  await srv.runHook('server/installRequestHandler/after', { app, srv });
  await srv.runHook('server/makeServer/after', { srv, how });
  return srv;
};


const guessDockerized = (process.getuid() === 0);


Object.assign(EX, {

  cliConfigDefaults: {

    cfgfiles: configFilesAdapter.getConfigDefaults(),
    envcfg_prefix: 'anno_',

    listen_addr: (guessDockerized ? '0.0.0.0' : '127.0.0.1'),
    listen_port: 8080,
    notify_server_listening: '',
    public_baseurl: '',
    wwwpub_path: process.cwd() + '/wwwpub',

    ...setupCleanExit.cliConfigDefaults,
    ...setupCiTestFeatures.cliConfigDefaults,

  },


  denyLateConfigRead(expectedType, slot) {
    const err = new Error('Late attempt to read server config');
    Object.assign(err, { expectedType, slot });
    throw err;
  },


});


export default EX;
