// -*- coding: utf-8, tab-width: 2 -*-

import arrayOfTruths from 'array-of-truths';
import bindAllMethods from 'bind-all-methods-nondestructive-pmb';
import mergeOpt from 'merge-options';
import mustBe from 'typechecks-pmb/must-be.js';
import objDive from 'objdive';
import objPop from 'objpop';
import pProps from 'p-props';
import vTry from 'vtry';


const EX = async function learnTopicDict(origLearnCtx, topic, learnImpl) {
  const { srv } = origLearnCtx;
  const cfgDict = await srv.configFiles.readAsDict(topic);
  const descr = 'Learn config topic ' + topic;
  const cfgMeta = { ...cfgDict[''] };
  delete cfgDict[''];
  const learnCtx = { ...origLearnCtx, cfgMeta };
  bindAllMethods.dest(learnCtx, EX.learnCtxApi);

  const mustPopCfgMeta = objPop(cfgMeta, { mustBe }).mustBe;
  mustPopCfgMeta.getRawCfgDict = Object.bind(null, cfgDict);
  // bindAllMethods.dest(learnCtx, EX.popperApi);

  function maybeLearnMetaFrom(lmSourceObj, lmSourceDescr) {
    const howFunc = lmSourceObj.learnMeta;
    if (!howFunc) { return; }
    const lmDescr = descr + ', common settings according to ' + lmSourceDescr;
    const pr = vTry.pr(lmSourceObj.learnMeta.bind(learnImpl), lmDescr,
    )(learnCtx, mustPopCfgMeta);
    return pr;
  }
  /* Why explicit function calls instead of pprops?
    If multiple LM methods can interpret (and thus pop) a key,
    their order of invocation matters, and we should express it.
    Our learnCtx is meant to be most specific to the current learnTopicDict
    invocation, so it should run first, then more generic LM methods. */
  await maybeLearnMetaFrom(learnCtx, 'learnCtx');
  await maybeLearnMetaFrom(learnImpl, 'learnImpl');

  mustPopCfgMeta.expectEmpty(descr + ': Unsupported common setting(s)');

  learnCtx.topicDefaults = (learnCtx.mergeInheritedFragments(
    learnCtx.topicDefaults) || {});

  if (learnImpl.learnItem) {
    const msg = 'learnItem is deprecated: It was ambiguous for rawList keys.';
    throw new Error(msg);
  }
  const lock = mustBe.tProp('', learnImpl, 'fun | undef', 'learnOneCfgKey');

  await pProps(cfgDict, async function learnListEntry(origDetails, key) {
    let det = origDetails || {};
    if (Array.isArray(det)) { det = { rawList: det }; }
    if (typeof det !== 'object') { det = { rawValue: det }; }
    det = mergeOpt(learnCtx.topicDefaults, det);
    det = learnCtx.mergeInheritedFragments(det);
    const mustPopDetail = objPop(det, { mustBe }).mustBe;
    await vTry.pr(lock || learnImpl, descr + ', entry ' + key,
    )(learnCtx, key, mustPopDetail);
  });
};


const learnCtxApi = {

  retrieveInheritedFragments(fragPaths) {
    if (!fragPaths) { return false; }
    const learnCtx = this;
    const { customData } = learnCtx.srv.configFiles;
    const frags = arrayOfTruths.ifAnyMap(fragPaths, function lookup(path) {
      const inc = objDive(customData, path);
      if (inc !== undefined) { return inc; }
      console.debug('Known top-level fragments:',
        Object.keys(customData).sort());
      throw new Error('Cannot find fragment ' + path);
    });
    return frags;
  },

  mergeInheritedFragments(origSpec) {
    if (!origSpec) { return origSpec; }
    const learnCtx = this;
    const inherited = learnCtx.retrieveInheritedFragments(origSpec.INHERITS);
    if (!inherited) { return origSpec; }
    const merged = mergeOpt(...inherited, origSpec);
    delete merged.INHERITS;
    return merged;
  },


};


Object.assign(EX, {
  learnCtxApi,
});


export default EX;
