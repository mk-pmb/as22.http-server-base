// -*- coding: utf-8, tab-width: 2 -*-

import mustBe from 'typechecks-pmb/must-be.js';
import objPop from 'objpop';


let cachedMiscConfig;
const topicsCache = new Map();


async function readMiscConfig(srv) {
  if (cachedMiscConfig) { return cachedMiscConfig; }
  const cfg = await srv.configFiles.readAsDict('misc');
  if (cfg[''] !== undefined) {
    throw new Error('Misc config does not support a meta section.');
  }
  const pop = objPop(cfg, { mustBe }).mustBe;
  cachedMiscConfig = { pop };
  return cachedMiscConfig;
}


const EX = async function useMiscConfig(srv, topic) {
  if (!cachedMiscConfig) { cachedMiscConfig = readMiscConfig(srv); }
  await cachedMiscConfig;
  const tCfg = cachedMiscConfig.pop('dictObj | ary | undef | nul', topic);
  if (!tCfg) { return false; }
  if (Array.isArray(tCfg)) { return tCfg; }
  return objPop(tCfg, { mustBe }).mustBe;
};


Object.assign(EX, {

  async learnMiscCfgTopic(topic, learnImpl, srv) {
    const had = topicsCache.get(topic);
    if (had !== undefined) { return had; }
    const pr = (async function learnNow() {
      let tCfg = await EX(srv, topic);
      if (learnImpl) {
        const learned = await learnImpl(tCfg, srv);
        tCfg?.expectEmpty?.();
        if (learned !== undefined) { tCfg = learned; }
      }
      topicsCache.set(topic, tCfg);
      return tCfg;
    }());
    topicsCache.set(topic, pr);
    return pr;
  },




});




export default EX;
