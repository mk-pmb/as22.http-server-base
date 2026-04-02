// -*- coding: utf-8, tab-width: 2 -*-


function unrefTimer(srv, setupFunc, optName, mtdName, ...args) {
  const sec = +srv.popCfg('num | str | undef', (optName || args[0]), 0);
  if (!sec) { return; }
  const hnd = srv[mtdName].bind(srv, ...args);
  setupFunc(hnd, sec * 1e3).unref();
}


const EX = async function setupCiTestFeatures(srv) {
  unrefTimer(srv, setTimeout, '', 'close', 'testfx_exit_soon_sec');
  unrefTimer(srv, setInterval, 'alive_pid_intv_sec', 'logMsg',
    'Still alive! pid = ' + process.pid);
};


EX.cliConfigDefaults = {
  alive_pid_intv_sec: 0,
  testfx_exit_soon_sec: 0,
};


export default EX;
