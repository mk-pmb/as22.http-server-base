// -*- coding: utf-8, tab-width: 2 -*-

import mustBe from 'typechecks-pmb/must-be.js';
import objDive from 'objdive';
import vTry from 'vtry';


import appBaseDirOps from './appBaseDirOps.mjs';
import learnTopicDict from './cfg/learnTopicDict.mjs';


const EX = {

  async install(srv) {
    const mgr = {
      pluginsByName: new Map(),
    };
    const learnCtx = { srv, mgr };
    await learnTopicDict(learnCtx, 'plugins', EX.learnOnePlugin);
  },


  defaultImportDive: ['as22plugin', 'installOnto'],

  rulesForOptionIfMissing: [['oneOf', [
    undefined,
    'error',
    'ignore',
    'warn',
  ]]],


  async learnOnePlugin(learnCtx, plugName, mustPopCfg) {
    const { srv } = learnCtx;
    if (plugName === 'About the plugins directory') {
      mustPopCfg('str', 'rawValue');
      if (mustPopCfg.empty()) { return; }
    }
    let tmp = mustPopCfg('nonEmpty str | ary', 'import');
    if (!Array.isArray(tmp)) { tmp = [tmp, ...EX.defaultImportDive]; }
    const [importFrom, ...importDive] = tmp;
    mustBe.nest('import file path', importFrom);
    const ifMissing = mustPopCfg(EX.rulesForOptionIfMissing, 'ifMissing');
    tmp = null;
    try {
      tmp = await vTry.pr(() => appBaseDirOps.importJs('./' + importFrom),
        'Import plugin ' + plugName + ' from ' + importFrom)();
    } catch (importFailed) {
      let cause = importFailed;
      // If we'd search for the cause even deeper, we should use a loop.
      cause = (cause.jse_cause || cause);
      cause = (cause.jse_cause || cause);
      if (cause.code === 'MODULE_NOT_FOUND') {
        if (ifMissing === 'warn') {
          return console.warn('W: Skipping plugin', plugName,
            'due to missing import file.');
        }
        if (ifMissing === 'ignore') { return; }
      }
      throw importFailed;
    }
    if (!tmp) { throw new TypeError('import()ed a false-y value!'); }
    const instFunc = objDive(tmp, importDive);
    mustBe.fun("The plugin's install function", instFunc);
    const instCtx = { plugName, mustPopCfg, srv };
    tmp = await instFunc(instCtx);
    mustPopCfg.done('Unsupported user plugin option(s)');
  },





};


export default EX;
