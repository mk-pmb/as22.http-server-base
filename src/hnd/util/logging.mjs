// -*- coding: utf-8, tab-width: 2 -*-

import makeRequestSummarizer from 'summarize-express-request-pmb';

const requestSummarizer = makeRequestSummarizer.logLineArgs();


const urlSecretsFilterRgx = (function compile() {
  const sep = '(?:%[0-9a-f]{2}|\\W)';
  const maybeSep = sep + '?';
  const word1 = '(?:s|session)';
  const word2 = '(?:id|key)';
  const value = '[\\$\\*-;@-~]+';
  const rx = ('(' + sep + word1 + maybeSep + word2 + sep + ')' + value);
  return new RegExp(rx, 'ig');
}());


function logMsg(...args) {
  const d = (new Date()).toISOString();
  console.log(d.slice(0, 10), d.slice(11, 19), ...args);
}


function logIncomingRequest(req) {
  req.logMsg('WebReq', ...requestSummarizer(req));
  req.next();
}


function logRequestCheckpoint(where, ...details) {
  const req = this;
  const hints = [
    (req.complete && '[complete]'),
    (req.res.finished && '[finished]'),
  ].filter(Boolean);
  let url = String(req.originalUrl || '');
  url = url.replace(urlSecretsFilterRgx, '$1▒▒▒');
  req.logMsg(where,
    req.method,
    url,
    ...hints,
    ...details);
  return req;
}


const EX = {

  basics: {
    logMsg,
    urlSecretsFilterRgx,
  },

  middleware: {
    logIncomingRequest,
  },

  requestExtras: {
    logMsg,
    logCkp: logRequestCheckpoint,
  },



};


export default EX;
