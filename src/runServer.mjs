// -*- coding: utf-8, tab-width: 2 -*-

import 'p-fatal';
import 'usnam-pmb';

import parseCliArgs from 'cfg-cli-env-180111-pmb/node.js';
/* parseCliArgs: because we do NOT use the "env" part.
    Environment options are dealt with in `serverCore.mjs`,
    using another module. */


import makeServer from './makeServer.mjs';


const EX = async function runServer() {
  process.chdir('/');

  const { allCliOpt } = parseCliArgs(); // see import above!
  console.debug(
    'node.js version:', process.version,
    'server pid:', process.pid,
    'server CLI options:', allCliOpt,
  );

  const srv = await makeServer({
    ...allCliOpt,
  });

  srv.initialConfigDone();
  await srv.listen();
};





EX.autorunTimer = setTimeout(function autorun() {
  if (!EX.autorunTimer) { return; } /*
    Timer IDs are always truthy: HTML prescribes a positive integer,
    and node.js uses timeout objects. */
  delete EX.autorunTimer;
  EX();
}, 10);

export default EX;
