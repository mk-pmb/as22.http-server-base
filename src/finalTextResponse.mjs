// -*- coding: utf-8, tab-width: 2 -*-

import genericFTR from 'express-final-text-response-pmb';
import loggers from 'express-final-text-response-pmb/extras/req.logCkp.mjs';


const permaFtrOpt = {
  ...loggers, // <- includes logHUnkErr
  knownMimeTypes: {
    ...genericFTR.dfCfg.knownMimeTypes,
    annoLD: 'application/ld+json; profile="http://www.w3.org/ns/anno.jsonld"',
  },
};


const EX = genericFTR.customize(permaFtrOpt);
const origJsonMthd = EX.json;


function debugFxDecideSendJsonAsPlainText(req, opt) {
  if (opt.redirTo) { return true; } /*
    Work-around for Waterfox's network debugger, which would otherwise try
    to parse the _destination_'s content as JSON (if the Content-Type of the
    redirect is JSON). This is especially bad when WF is configured to ask
    for permission before redirecting, because then it tries to parse the
    empty string instead and won't show the payload at all.
    */

  if (!req.untrustedDebugOpt().text) { return; }
  // Add potential future exceptions below this comment:
  // (currently none)

  return true;
}


Object.assign(EX, {

  json(req, anno, ftrOpt) {
    const opt = { ...ftrOpt };
    opt.headers = {
      Expires: true, // already expired = please don't cache
      ...opt.headers,
    };
    if (debugFxDecideSendJsonAsPlainText(req, opt)) { opt.type = 'plain'; }
    return origJsonMthd.call(this, req, anno, opt);
  },

});


export default EX;
