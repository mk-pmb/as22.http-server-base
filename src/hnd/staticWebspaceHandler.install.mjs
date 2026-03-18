// -*- coding: utf-8, tab-width: 2 -*-

import express from 'express';
import mustBe from 'typechecks-pmb/must-be.js';
import objPop from 'objpop';

import eternal from './wrap/eternal.mjs';
import httpErrors from '../httpErrors.mjs';
import plumb from './util/miscPlumbing.mjs';
import simpleFilenameRedirector from './simpleFilenameRedirector.mjs';


const EX = function installStaticWebspaceHandler(routerOrApp, how) {
  const rt = routerOrApp;
  const popHow = objPop.d(how, { mustBe }).mustBe;
  const subUrl = popHow('nonEmpty str', 'subUrl');

  if (subUrl.startsWith('/') || subUrl.endsWith('/')) {
    const msg = 'Static webspace subUrl must not start or end with a slash!';
    const err = new Error(msg);
    err.inputValue = subUrl;
    throw err;
  }

  const wwwPubPath = popHow('nonEmpty str', 'wwwPubPath');
  const redirFrom = popHow('ary | undef', 'redirectFilenamesFrom');
  popHow.expectEmpty('Unsupported config option(s) for static webspace');

  const serveFile = express.static(wwwPubPath);
  rt.use('/' + subUrl, serveFile);
  rt.use('/' + subUrl, httpErrors.noSuchResource);

  (redirFrom || []).forEach(function reg(from) {
    mustBe.nest('Base URL for redirect', from);
    if (!from.endsWith('/')) {
      const err = new Error('Base URL for redirect must end with a slash!');
      err.inputValue = from;
      throw err;
    }
    rt.get(from, plumb.makeRedirector(subUrl + '/'));
    rt.get(from + ':filename', eternal(simpleFilenameRedirector(
      '/' + subUrl + '/:filename')));
  });

  return rt;
};


export default EX;
