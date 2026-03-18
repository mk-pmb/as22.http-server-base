// -*- coding: utf-8, tab-width: 2 -*-

const EX = async function setupCleanExit(srv) {
  Object.assign(srv, {

    close(reason) {
      srv.logMsg('Closing server due to', (reason || '(no reason provided)'));
      srv.getLowLevelWebServer().close();
    },

  });

  EX.exitSoonSignalNames.forEach(sigName => process.once(sigName,
    srv.close.bind(srv, sigName)));
};


Object.assign(EX, {

  exitSoonSignalNames: [
    'SIGHUP',
    'SIGINT',
    'SIGTERM',
  ],

});
export default EX;
