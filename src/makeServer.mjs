// -*- coding: utf-8, tab-width: 2 -*-

import envcfgMergeConfigs from 'envcfg-merge-configs-pmb';
import express from 'express';
import mustBe from 'typechecks-pmb/must-be.js';
import nodeHttp from 'node:http';
import objPop from 'objpop';


import installListenAddrPlumbing from './listenAddrPlumbing.mjs';
import installRootRouter from './hnd/rootRoutes.mjs';
import loggingUtil from './hnd/util/logging.mjs';


const EX = async function createServer(customConfig) {
  const entireConfig = envcfgMergeConfigs({ ifPrefixProp: 'envcfg_prefix' },
    EX.cliConfigDefaults, customConfig);
  const popCfg = objPop.d(entireConfig, { mustBe }).mustBe;
  popCfg('str | eeq:false', 'envcfg_prefix');
  console.debug('Server config:', entireConfig);

  const webSrv = nodeHttp.createServer();
  const srv = {
    ...loggingUtil.basics,
    getLowLevelWebServer() { return webSrv; },
    popCfg,

    initialConfigDone() {
      popCfg.expectEmpty('Unsupported server config option(s)');
      srv.popCfg = EX.denyLateConfigRead;
    },

  };

  const app = express();
  app.set('x-powered-by', false);
  app.set('case sensitive routing', true);
  app.set('etag', false);
  app.set('strict routing', true);
  app.use(await installRootRouter(srv));

  app.once('close', function cleanup(...args) {
    console.debug('App cleanup:', args);
  });

  await installListenAddrPlumbing(srv);

  srv.globalRequestExtras({
    ...loggingUtil.requestExtras,
  });

  webSrv.on('request', app);
  return srv;
};


const guessDockerized = (process.getuid() === 0);


Object.assign(EX, {

  cliConfigDefaults: {

    envcfg_prefix: 'anno_',

    listen_addr: (guessDockerized ? '0.0.0.0' : '127.0.0.1'),
    listen_port: 8080,
    notify_server_listening: '',
    public_baseurl: '',
    wwwpub_path: process.cwd() + '/wwwpub',

  },


  denyLateConfigRead(expectedType, slot) {
    const err = new Error('Late attempt to read server config');
    Object.assign(err, { expectedType, slot });
    throw err;
  },


});


export default EX;
