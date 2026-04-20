// -*- coding: utf-8, tab-width: 2 -*-

import vTry from 'vtry';


const EX = new (function AppBaseDirAbstraction() {})();

Object.assign(EX, {
  path: process.cwd(),

  async importJs(subPath) {
    const absPath = EX.path + '/' + subPath;
    return vTry.pr(async () => (await import(absPath)).default,
      'Failed to import `' + subPath + '` from app dir')();
  },

});


export default EX;
