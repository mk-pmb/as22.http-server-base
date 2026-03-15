// -*- coding: utf-8, tab-width: 2 -*-

import 'p-fatal';
import 'usnam-pmb';


import makeServer from './makeServer.mjs';


const EX = async function runServer() {
  process.chdir('/');

  console.debug(
    'node.js version:', process.version,
    'server pid:', process.pid,
  );

  const srv = await makeServer({
  });

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
