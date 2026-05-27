import ModUtils, { insert } from "../modUtils.js";

// Display player/bot density under names, matching FXclient's colored density rendering.
export default (/** @type {ModUtils} */ { modifyCode, waitForMinification, matchCode, replaceOne }) => {
  const { placeBalanceAbove } = matchCode(`aLT += Math.floor(0.78 * fontSize);
    if (placeBalanceAbove) {/*...*/}`);

  modifyCode(
    `function aLY(ctx, i, fontSize, x, y, aLU) {
    var a4f = playerData.a4f[i];
    var aLe = Util.s1.formatNumber(playerData.playerBalances[i] - a4f);
    ${insert(`function drawDensity() {
      if (!placeBalanceAbove && __fx.settings.showPlayerDensity)
        __fx.settings.coloredDensity && (ctx.fillStyle = __fx.utils.textStyleBasedOnDensity(i)), ctx.fillText(__fx.utils.getDensity(i), x, y + fontSize);
    }`)}
    if (a4f) {
      var eY = ctx.fillStyle;
      ctx.fillStyle = aLX(fontSize, 2 + aLU % 2);
      ctx.fillText(aLe, x, y);
      ctx.fillStyle = eY;
      ${insert(`drawDensity();`)}
      return;
    }
    if (((aLU >> 1) & 1)) {
      ctx.lineWidth = 0.05 * fontSize;
      ctx.strokeStyle = aLX(fontSize, aLU % 2);
      ctx.strokeText(aLe, x, y);
      ${insert(`drawDensity();`)}
      return;
    }
    if (aLU > 1) {
      ctx.lineWidth = 0.12 * fontSize;
      ctx.strokeStyle = aLX(fontSize, aLU);
      ctx.strokeText(aLe, x, y);
    }
    ctx.fillText(aLe, x, y);
    ${insert(`drawDensity();`)}
  }`,
    { dictionary: { placeBalanceAbove } },
  );

  waitForMinification(() => {
    replaceOne(
      /(function \w+\((?<i>\w+),(?<fontSize>\w+),(?<x>\w+),(?<y>\w+),(?<canvas>\w+)\){)(\6\.fillText\((?<playerData>\w+)\.(?<playerNames>\w+)\[\2\],\4,\5\)),(\2<(?<game>\w+)\.(?<gHumans>\w+)&&2!==\8\.(?<playerStates>\w+)\[[^}]+)}/g,
      `$1 var ___id = $2;
        var showName = true;
        if (showName) $7, $10;
        ${placeBalanceAbove} && __fx.settings.showPlayerDensity && (
            __fx.settings.coloredDensity && ($<canvas>.fillStyle = __fx.utils.textStyleBasedOnDensity(___id)),
            $<canvas>.fillText(__fx.utils.getDensity(___id), $<x>, showName ? $<y> + $<fontSize> : $<y>)
        ); }`,
    );
  });
};
