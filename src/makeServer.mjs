// -*- coding: utf-8, tab-width: 2 -*-

import express from 'express';
import nodeHttp from 'node:http';


const EX = async function createServer() {

  const webSrv = nodeHttp.createServer();
  const srv = {
    getLowLevelWebServer() { return webSrv; },
    listen() { webSrv.listen(); },
  };

  const app = express();
  app.set('x-powered-by', false);
  app.set('case sensitive routing', true);
  app.set('etag', false);
  app.set('strict routing', true);

  app.once('close', function cleanup(...args) {
    console.debug('App cleanup:', args);
  });

  webSrv.on('request', app);
  return srv;
};


export default EX;
