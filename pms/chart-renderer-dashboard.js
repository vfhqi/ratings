/* chart-renderer-dashboard.js: the PMS Per-stock Dashboard's copy of the Master Dashboard's share price chart.
 * Built by scripts/pms_dashboard_renderer_build.py v1.6 on 2026-10-31T06:12:02 from master-dashboard/index.html (md5 cd3abb28a86e0ed273dce00da44a70e3),
 * lines between 'var chartVis={' and 'window.openChart=function(t){', with the changes marked PMS-DASH 1 to 18. DO NOT EDIT BY HAND: rebuild.
 */
var CHART_REGISTRY=window.CHART_REGISTRY||{};window.CHART_REGISTRY=CHART_REGISTRY;
var chartZoom=window.chartZoom||'6M',chartScaleMode=window.chartScaleMode||'lin',chartWidth=50,chartTicker=null,currentTab='pms_dashboard',D=window.D||{universe:[]};
var chartVis={ma5:false,ma10:false,ma20:true,ma50:true,ma100:true,ma150:true,ma200:true,obv:true,vol:true,vol20:true,vol50:true};
// MD-S76-CHART-PERSIST: localStorage helpers. Key shared across sessions and browser windows.
var _CHART_PREFS_KEY='vf_chart_prefs_v1';
function saveChartPrefs(){return; /* PMS-DASH 1 */
  try{localStorage.setItem(_CHART_PREFS_KEY,JSON.stringify({zoom:chartZoom,scale:chartScaleMode,width:chartWidth,vis:chartVis}));}catch(e){}
}
function loadChartPrefs(){
  try{
    var _p=JSON.parse(localStorage.getItem(_CHART_PREFS_KEY)||'null');
    if(!_p)return;
    if(_p.zoom)chartZoom=_p.zoom;
    if(_p.scale)chartScaleMode=_p.scale;
    if(typeof _p.width==='number')chartWidth=_p.width;
    if(_p.vis&&typeof _p.vis==='object'){var _vk=Object.keys(_p.vis);for(var _vi=0;_vi<_vk.length;_vi++){if(typeof chartVis[_vk[_vi]]==='boolean')chartVis[_vk[_vi]]=!!_p.vis[_vk[_vi]];}}
  }catch(e){}
}
// Load persisted prefs immediately so first chart open uses saved settings.
/* PMS-DASH 1: the Master Dashboard's saved chart settings are neither read nor written on this page. */
// PHASE-4A 2026-05-04: nice-number tick algorithm (Heckbert 1990, {1,2,5} step set per Richard).
function niceNum(range,round){if(range<=0)return 1;var exponent=Math.floor(Math.log10(range));var fraction=range/Math.pow(10,exponent);var nf;if(round){if(fraction<1.5)nf=1;else if(fraction<3.5)nf=2;else if(fraction<7.5)nf=5;else nf=10}else{if(fraction<=1)nf=1;else if(fraction<=2)nf=2;else if(fraction<=5)nf=5;else nf=10}return nf*Math.pow(10,exponent)}
function niceTicks(min,max,maxTicks){if(!isFinite(min)||!isFinite(max)||max<=min)return{ticks:[min],min:min,max:max+1,step:1};var range=niceNum(max-min,false);var step=niceNum(range/(maxTicks-1),true);var nMin=Math.floor(min/step)*step;var nMax=Math.ceil(max/step)*step;var ticks=[];for(var t=nMin;t<=nMax+step/2;t+=step)ticks.push(t);return{ticks:ticks,min:nMin,max:nMax,step:step}}
// PHASE-4A 2026-05-04: B suffix + integer M (15M, not 15.0M).
function fmtVol(v){if(v==null)return"";var a=Math.abs(v);if(a>=1e9)return(v/1e9).toFixed(1)+"B";if(a>=1e6)return Math.round(v/1e6)+"M";if(a>=1e3)return Math.round(v/1e3)+"K";return Math.round(v).toString()}
function getChartSlice(chart,zoom){
  var n=chart.length;
  var days={"1M":Math.min(n,22),"3M":Math.min(n,63),"6M":Math.min(n,125),"12M":Math.min(n,252),"2Y":Math.min(n,504),"3Y":Math.min(n,756),"5Y":Math.min(n,1260)};
  var count=days[zoom]||days["6M"];
  return chart.slice(Math.max(0,n-count));
}
window.toggleChartLayer=function(layer){
  chartVis[layer]=!chartVis[layer];
  saveChartPrefs();
  if(window._sspOpen&&window._sspTicker){
    drawMasterChart(window._sspTicker,{canvasId:'ssp-chart-canvas',containerId:'ssp-chart-body'});
  } else {
    drawMasterChart(chartTicker);
  }
  /* MD-SSP-LEGEND-2026-09-16: the same legend markup can now be on the page twice, once in the chart panel and
     once in the Stock View, so the two share an element id. getElementById would dim only the first.
     Update every element carrying the id instead. */
  var els=document.querySelectorAll('[id="legend-'+layer+'"]');
  for(var _li=0;_li<els.length;_li++)els[_li].style.opacity=chartVis[layer]?"1":"0.3";
};
// === LAZY CHART LOADER ===
// Chart data lives in charts/<TICKER>.js files (~200KB each).
// Each file self-registers: var CHART_REGISTRY=CHART_REGISTRY||{};CHART_REGISTRY["TICKER"]=[...];
// Data is compact array format: [date, o, h, l, c, v, ma5, ma10, ma20, ma50, ma100, ma150, ma200]
// CHART_REGISTRY is declared at global scope (before IIFE) so eval'd chart files can register into it
var _chartLoading = {};

function _safeTickerFile(t){
  return t.replace(/[.\/]/g,"_");
}

function _expandChartRows(rows){
  // Convert compact [d,o,h,l,c,v,ma5,...,ma200] back to object format
  var maKeys=["ma5","ma10","ma20","ma50","ma100","ma150","ma200"];
  var out=[];
  for(var i=0;i<rows.length;i++){
    var r=rows[i];
    var obj={d:r[0],o:r[1],h:r[2],l:r[3],c:r[4],v:r[5]};
    for(var m=0;m<maKeys.length;m++){
      if(r[6+m]!=null)obj[maKeys[m]]=r[6+m];
    }
    out.push(obj);
  }
  return out;
}

function loadChartData(ticker, callback){
  // SESSION 12 D-MD-CHART-1: pure script-tag injection. XHR+eval path failed silently
  // on GitHub Pages because eval(xhr.responseText) runs in IIFE-local scope, and the
  // chart file's `var CHART_REGISTRY=CHART_REGISTRY||{}` shadows the global registry.
  // Script-tag injection executes at GLOBAL scope and writes to window.CHART_REGISTRY directly.
  // Already loaded?
  if(CHART_REGISTRY[ticker]){
    callback(_expandChartRows(CHART_REGISTRY[ticker]));
    return;
  }
  // Already loading?
  if(_chartLoading[ticker]){
    _chartLoading[ticker].push(callback);
    return;
  }
  _chartLoading[ticker]=[callback];
  var _cb=(typeof D!=="undefined"&&D&&D.meta&&D.meta.generated)?String(D.meta.generated).replace(/[^0-9]/g,""):"";
  var url=(window.PMS_CHART_BASE||"charts/")+_safeTickerFile(ticker)+".js"+(_cb?("?v="+_cb):"");
  var s=document.createElement("script");
  s.src=url;
  s.onload=function(){
    var cbs=_chartLoading[ticker]||[];
    delete _chartLoading[ticker];
    var data=CHART_REGISTRY[ticker]?_expandChartRows(CHART_REGISTRY[ticker]):null;
    for(var i=0;i<cbs.length;i++)cbs[i](data);
  };
  s.onerror=function(){
    var cbs=_chartLoading[ticker]||[];
    delete _chartLoading[ticker];
    for(var i=0;i<cbs.length;i++)cbs[i](null);
  };
  document.head.appendChild(s);
}
// === END LAZY CHART LOADER ===

function drawMasterChart(ticker,_sspo){
  var _cid=(_sspo&&_sspo.canvasId)||"chart-canvas";
  var _did=(_sspo&&_sspo.containerId)||"chart-container";
  var canvas=document.getElementById(_cid);
  if(!canvas)return;
  // Use lazy-loaded registry data, fall back to legacy CHART_DATA for compatibility
  var chartAll=null;
  if(CHART_REGISTRY[ticker]){
    chartAll=_expandChartRows(CHART_REGISTRY[ticker]);
  }else if(typeof CHART_DATA!=="undefined"&&CHART_DATA[ticker]){
    chartAll=CHART_DATA[ticker];
  }
  if(!chartAll||chartAll.length===0){
    // Try lazy-loading — show loading message, then redraw on completion
    document.getElementById(_did).innerHTML='<div style="text-align:center;padding:40px;color:var(--text-dim)">Loading chart data for '+ticker+'...</div>';
    loadChartData(ticker,function(data){
      if(data&&data.length>0){drawMasterChart(ticker,_sspo)}
      else{document.getElementById(_did).innerHTML='<div style="text-align:center;padding:40px;color:var(--text-dim)">No chart data for '+ticker+'</div>'}
    });
    return;
  }
  if(_sspo&&_sspo.upto){chartAll=chartAll.filter(function(r){return r.d<=_sspo.upto})} /* PMS-DASH 5 */
  var vis=chartVis;
  var chart=getChartSlice(chartAll,(_sspo&&_sspo.zoom)||chartZoom); /* PMS-DASH 4 */
  var fullChart=chartAll;
  // FIX-S4-CHART-V3: Use canvas.getBoundingClientRect for true rendered size
  var dpr=window.devicePixelRatio||1;
  var rect=canvas.getBoundingClientRect();
  var W=Math.round(rect.width);
  var H=(_sspo&&_sspo.height)||Math.max(400,Math.round(window.innerHeight-rect.top-20)); /* PMS-DASH 3 */
  canvas.style.height=H+"px";
  // Internal resolution = CSS size * DPI
  canvas.width=W*dpr;
  canvas.height=H*dpr;
  var ctx=canvas.getContext("2d");
  ctx.scale(dpr,dpr);
  var pad=(_sspo&&_sspo.pad)||{t:22,r:68,b:62,l:78}; /* PMS-DASH 10: the caller may set the margins (the six-panel summary's small chart) */
  var plotW=W-pad.l-pad.r;
  var plotH=H-pad.t-pad.b;
  var n=chart.length;
  // SESSION 12 D-MD-CHART-2: drop barW floor so bars shrink to fit.
  // Old: Math.max(4, plotW/n) — forced 4px min, caused overflow at 2Y zoom on narrow panels.
  var barW=plotW/n;
  var candleW=Math.max(1,barW*0.78);

  var monthFull=["JANUARY","FEBRUARY","MARCH","APRIL","MAY","JUNE","JULY","AUGUST","SEPTEMBER","OCTOBER","NOVEMBER","DECEMBER"];
  var monthShort=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  var dayNames=["Su","Mo","Tu","We","Th","Fr","Sa"];
  var dates=[];
  var i;for(i=0;i<chart.length;i++)dates.push(new Date(chart[i].d+"T00:00:00"));

  // Price range
  var allVals=[];var j,p;
  var maPeriods=[5,10,20,50,100,150,200];
  for(j=0;j<chart.length;j++){
    allVals.push(chart[j].h);allVals.push(chart[j].l);
    for(p=0;p<maPeriods.length;p++){var mk="ma"+maPeriods[p];if(chart[j][mk])allVals.push(chart[j][mk])}
  }
  var _pov=(_sspo&&_sspo.overlay)||window.PMS_OVERLAY||null,_mal=[]; /* PMS-DASH 6; _mal: the right-margin values, PMS-DASH 15 */
  /* PMS-DASH 16 (29-Oct-2026, Richard: "Do not have such extreme decimal places"): 100 or more as a whole number, 10 to 100 to one decimal, below 10 to two */
  var _fpx=function(v){return v>=100?String(Math.round(v)):v>=10?v.toFixed(1):v.toFixed(2)};
  /* PMS-DASH 13 (28-Oct-2026, Richard: the scale must "dynamically update to use the space more effectively"; on 1M "all the info is in a narrow band"):
     the price range fits the candles of the zoom shown; a switched-on MA or an exit level widens it only when it lies within 35% of the
     candles' span beyond them; one further away is clipped at the plot's edge and named there (PMS-DASH 14) */
  (function(){var lo=Infinity,hi=-Infinity,k,q;for(k=0;k<chart.length;k++){q=chart[k];if(q.l!=null&&q.l<lo)lo=q.l;if(q.h!=null&&q.h>hi)hi=q.h}
    if(!(hi>=lo))return;var sp=(hi-lo)||Math.abs(hi)*0.05||1,a=lo-0.35*sp,b=hi+0.35*sp,keep=[lo,hi],add=function(v){if(v!=null&&v>=a&&v<=b)keep.push(v)};
    /* PMS-DASH 17 (29-Oct-2026, Richard: "Dont expand y-axis for the dotted red line or other equivalent indicators; just indicate it is off the page;
       the point of the chart is for me to eyeball the price and MAs"): only the switched-on MAs widen the range; exit levels never do */
    for(k=0;k<chart.length;k++){for(var pp=0;pp<maPeriods.length;pp++){if(vis['ma'+maPeriods[pp]])add(chart[k]['ma'+maPeriods[pp]])}}
    allVals=keep})();
  var priceMin=Math.min.apply(null,allVals)*0.98;
  var priceMax=Math.max.apply(null,allVals)*1.02;
  var priceRange=priceMax-priceMin||1;

  // Volume
  var vols=[];for(j=0;j<chart.length;j++)vols.push(chart[j].v);
  var volMax=Math.max.apply(null,vols)||1;
  var volZoneH=plotH*0.50;

  // Volume MAs (20D + 50D)
  var fullVols=[];for(j=0;j<fullChart.length;j++)fullVols.push(fullChart[j].v);
  var visStart=fullChart.length-n;
  var volMA20=[],volMA50=[];
  for(j=0;j<n;j++){
    var ai=visStart+j;
    var s20=Math.max(0,ai-19);var sl20=fullVols.slice(s20,ai+1);
    volMA20.push(sl20.reduce(function(a,b){return a+b},0)/sl20.length);
    var s50=Math.max(0,ai-49);var sl50=fullVols.slice(s50,ai+1);
    volMA50.push(sl50.reduce(function(a,b){return a+b},0)/sl50.length);
  }
  var avgVol50=volMA50.length>0?volMA50[volMA50.length-1]:volMax*0.5;

  // OBV
  var obv=[0];
  for(j=1;j<chart.length;j++){
    if(chart[j].c>chart[j-1].c)obv.push(obv[j-1]+chart[j].v);
    else if(chart[j].c<chart[j-1].c)obv.push(obv[j-1]-chart[j].v);
    else obv.push(obv[j-1]);
  }
  var obvMin=Math.min.apply(null,obv);var obvMax=Math.max.apply(null,obv);var obvRange=obvMax-obvMin||1;

  // Coordinate functions
  // PHASE-4C 2026-05-04: priceY supports linear and log scales.
  // Log path uses Math.log10; clipped at minimum positive value to avoid log(0).
  function priceY(v){
    if(chartScaleMode==="log"){
      if(!(v>0))return pad.t+plotH;
      var lv=Math.log10(v);
      var lMin=Math.log10(priceMin>0?priceMin:0.01);
      var lMax=Math.log10(priceMax>0?priceMax:1);
      var lRange=lMax-lMin||1;
      return pad.t+plotH*(1-(lv-lMin)/lRange);
    }
    return pad.t+plotH*(1-(v-priceMin)/priceRange);
  }
  function volY(v){return pad.t+plotH-(v/volMax)*volZoneH}
  function volMALineY(v){return pad.t+plotH-(v/volMax)*volZoneH}
  var obvZoneTop=pad.t+plotH*0.75;var obvZoneBot=pad.t+plotH;var obvZoneH2=obvZoneBot-obvZoneTop;
  function obvY(v){return obvZoneBot-((v-obvMin)/obvRange)*obvZoneH2}
  function xPos(i){return pad.l+i*barW+barW/2}

  // Light theme colours
  var bgCol="#ffffff";var gridCol="rgba(180,190,200,0.6)";var gridColMonth="rgba(140,150,160,0.7)";var gridColWeek="rgba(200,210,220,0.5)";
  var textCol="#4a5568";var textColBright="#1f2328";
  var candleUpStroke="#26a641";var candleDnFill="#da3633";var candleDnStroke="#da3633";
  var maColors={5:"#8b0000",10:"#e88a9a",20:"#e74c3c",50:"#ff8c00",100:"#2ca02c",150:"#1a5276",200:"#4a3d9e"};
  var maWidths={200:5,150:3,100:2.5,50:2.2,20:1.8,10:1.5,5:1.5};

  // Clear
  ctx.fillStyle=bgCol;ctx.fillRect(0,0,W,H);

  // PHASE-4A 2026-05-04 + 4C 2026-05-04: nice-number ticks (linear mode) OR log ticks (log mode).
  var priceLo=Math.min.apply(null,allVals);var priceHi=Math.max.apply(null,allVals);
  var priceTickList;
  if(chartScaleMode==='log'){
    // PHASE-4D 2026-05-04: log-tick generation with cascading fallbacks for tight ranges.
    var loSafe=priceLo>0?priceLo:0.01;
    var hiSafe=priceHi>loSafe?priceHi:loSafe*1.1;
    // priceMin/priceMax track the ACTUAL data extents (not snapped to decades),
    // so the chart fills the available height regardless of where ticks land.
    priceMin=loSafe*0.97;priceMax=hiSafe*1.03;priceRange=priceMax-priceMin||1;
    var minExp=Math.floor(Math.log10(loSafe));
    var maxExp=Math.ceil(Math.log10(hiSafe));
    function _logTicks(mults){var out=[];for(var ee=minExp;ee<=maxExp;ee++){var base=Math.pow(10,ee);for(var mi2=0;mi2<mults.length;mi2++){var vv=mults[mi2]*base;if(vv>=priceMin&&vv<=priceMax)out.push(vv)}}return out}
    // Cascade: coarse {1,2,5} -> medium {1,1.5,2,3,5,7} -> dense {1..9}.
    priceTickList=_logTicks([1,2,5]);
    if(priceTickList.length<3)priceTickList=_logTicks([1,1.5,2,3,5,7]);
    if(priceTickList.length<3)priceTickList=_logTicks([1,2,3,4,5,6,7,8,9]);
    // Final fallback: if STILL no ticks (price range smaller than one decade with no integer multipliers),
    // compute linear nice-ticks and use those even in log-render mode. Labels are the priority.
    if(priceTickList.length<2){
      var fbNT=niceTicks(priceLo,priceHi,H>500?9:6);
      priceTickList=fbNT.ticks;
    }
  }else{
    var priceTickTarget=H>500?9:6;
    var priceNT=niceTicks(priceLo,priceHi,priceTickTarget);
    priceMin=priceNT.min;priceMax=priceNT.max;priceRange=priceMax-priceMin||1;
    priceTickList=priceNT.ticks;
  }
  for(var pti=0;pti<priceTickList.length;pti++){
    var ptVal=priceTickList[pti];var ptY=priceY(ptVal);
    if(ptY<pad.t-1||ptY>pad.t+plotH+1)continue;
    ctx.strokeStyle=gridCol;ctx.lineWidth=0.8;
    ctx.beginPath();ctx.moveTo(pad.l,ptY);ctx.lineTo(W-pad.r,ptY);ctx.stroke();
    var ptLabel=ptVal>=1000?Math.round(ptVal).toString():(ptVal<10?ptVal.toFixed(2):ptVal<100?ptVal.toFixed(1):Math.round(ptVal).toString());
    ctx.fillStyle=textCol;ctx.font="13px monospace";ctx.textAlign="left";
    ctx.fillText(ptLabel,W-pad.r+6,ptY+4);
  }

  // PHASE-4B 2026-05-04: tiered x-axis gridlines + labels.
  // Determine tier from n.
  var xt;
  if(n<=25)      xt={major:'week',  label:'D-Mon',  minor:'day',     labelTier:'day'};
  /* MD-XAXIS-3M-FIDELITY-2026-09-16 (Watson, SA - Master Dashboard). At 3M (63 bars) this tier anchored
     labels on MONTH starts, so the whole quarter carried three words and no date. Anchor on Mondays and
     label them day-month, the same treatment 1M already gets; the anti-overlap pass below thins them to
     whatever the panel width can hold, so a quarter-width panel degrades to fortnights rather than
     colliding. Minor gridlines drop to daily to match. 6M and longer are unchanged. */
  else if(n<=70) xt={major:'week',  label:'D-Mon',  minor:'day',     labelTier:'week'};
  else if(n<=140)xt={major:'month', label:'Mon',    minor:'week',    labelTier:'week'};
  else if(n<=280)xt={major:'quarter',label:'Mon-YY',minor:'month',   labelTier:'month'};
  else if(n<=520)xt={major:'quarter',label:'Mon-YY',minor:'month',   labelTier:'quarter'};
  else if(n<=800)xt={major:'year',  label:'YYYY',   minor:'quarter', labelTier:'quarter'};
  else           xt={major:'year',  label:'YYYY',   minor:'quarter', labelTier:'year'};
  /* MD-VAL-PANEL-QC1-2026-09-16 F7: a week boundary is the first BAR of a new week, not a bar that happens to
     fall on a Monday. ART-ES has no 2026-09-07 bar, so the literal-Monday test dropped that week's
     label from the 1M chart entirely. Compare Monday-anchored week starts instead. */
  function _weekStartMs(d){var t=new Date(d.getFullYear(),d.getMonth(),d.getDate());t.setDate(t.getDate()-((t.getDay()+6)%7));return t.getTime()}
  function _isMon(d,prev){return !prev||_weekStartMs(d)!==_weekStartMs(prev)}
  function _isMonthStart(d,prev){return !prev||d.getMonth()!==prev.getMonth()}
  function _isQuarterStart(d,prev){return !prev||(d.getMonth()!==prev.getMonth()&&[0,3,6,9].indexOf(d.getMonth())>=0)}
  function _isYearStart(d,prev){return !prev||d.getFullYear()!==prev.getFullYear()}
  function _isMajor(d,prev){if(xt.major==='week')return _isMon(d,prev);if(xt.major==='month')return _isMonthStart(d,prev);if(xt.major==='quarter')return _isQuarterStart(d,prev);return _isYearStart(d,prev)}
  function _isMinor(d,prev){if(xt.minor==='day')return true;if(xt.minor==='week')return _isMon(d,prev);if(xt.minor==='month')return _isMonthStart(d,prev);return _isQuarterStart(d,prev)}
  // Cap minor gridlines at ~30 across plot to avoid noise.
  var minorIdx=[];for(j=1;j<dates.length;j++){if(_isMinor(dates[j],dates[j-1]))minorIdx.push(j)}
  var minorSkip=Math.max(1,Math.ceil(minorIdx.length/30));
  for(var mi=0;mi<minorIdx.length;mi+=minorSkip){var jx=minorIdx[mi];var mxx=xPos(jx);ctx.strokeStyle='rgba(0,0,0,0.04)';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(mxx,pad.t);ctx.lineTo(mxx,pad.t+plotH);ctx.stroke()}
  // Major gridlines drawn on top of minors.
  var majorIdx=[];for(j=1;j<dates.length;j++){if(_isMajor(dates[j],dates[j-1]))majorIdx.push(j)}
  for(var mj=0;mj<majorIdx.length;mj++){var jx2=majorIdx[mj];var mxx2=xPos(jx2);ctx.strokeStyle='rgba(0,0,0,0.10)';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(mxx2,pad.t);ctx.lineTo(mxx2,pad.t+plotH+8);ctx.stroke()}
  /* PMS-DASH 16 (29-Oct-2026, Richard: "Make month/quarter delineations a little more clear"): a line at each month's first session,
     firmer at a quarter's and darkest at a year's, over the whole plot and down into the date labels */
  (function(){for(var q=1;q<dates.length;q++){var a=dates[q-1],b=dates[q];if(a.getMonth()===b.getMonth())continue;var yr=b.getMonth()===0,qu=b.getMonth()%3===0,xx=(xPos(q-1)+xPos(q))/2;
    ctx.strokeStyle=yr?'rgba(31,35,40,0.55)':qu?'rgba(31,35,40,0.36)':'rgba(31,35,40,0.20)';ctx.lineWidth=yr?1.8:qu?1.4:1;ctx.setLineDash([]);ctx.beginPath();ctx.moveTo(xx,pad.t);ctx.lineTo(xx,pad.t+plotH+(n<=70?40:10));ctx.stroke()}})();

  // PHASE-4A 2026-05-04: volume axis uses niceTicks too. Volume always anchored at zero.
  var volNT=niceTicks(0,volMax,4);
  var volTickMax=volNT.max;
  // Reassign volMax so the volY/volMALineY closures (declared above) pick up the nice-tick max.
  // This keeps bar heights and tick positions in sync (avoids bars hugging zone top).
  volMax=volTickMax;
  ctx.fillStyle=textCol;ctx.font="12px monospace";ctx.textAlign="right";
  for(var vti=0;vti<volNT.ticks.length;vti++){
    var vVal=volNT.ticks[vti];var vy=volY(vVal);
    if(vy<pad.t+plotH-volZoneH-1||vy>pad.t+plotH+1)continue;
    if(vis.vol||vis.vol20||vis.vol50)ctx.fillText(fmtVol(vVal),pad.l-8,vy+4); /* PMS-DASH 9: no volume scale when the volume layers are off */
  }
  ctx.save();ctx.translate(14,pad.t+plotH-volZoneH/2);ctx.rotate(-Math.PI/2);
  ctx.fillStyle=textCol;ctx.font="12px sans-serif";ctx.textAlign="center";if(vis.vol||vis.vol20||vis.vol50)ctx.fillText("Volume",0,0);ctx.restore(); /* PMS-DASH 9 */

  // Volume bars — 4-colour (up/down x high/low vol)
  if(vis.vol){for(j=0;j<chart.length;j++){
    var vx=xPos(j)-candleW/2;var bh=(chart[j].v/volMax)*volZoneH;
    var upDay=j>0?chart[j].c>=chart[j-1].c:true;var highVol=chart[j].v>=avgVol50;
    if(upDay&&highVol)ctx.fillStyle="rgba(63,185,80,0.50)";
    else if(upDay)ctx.fillStyle="rgba(63,185,80,0.20)";
    else if(highVol)ctx.fillStyle="rgba(248,81,73,0.50)";
    else ctx.fillStyle="rgba(248,81,73,0.20)";
    ctx.fillRect(vx,pad.t+plotH-bh,candleW,bh);
  }}

  // Volume % labels inside bars (when bars wide enough)
  if(barW>16&&vis.vol){ctx.textAlign="center";
    for(j=0;j<chart.length;j++){var x2=xPos(j);var barBottom=pad.t+plotH;
      var pct50v=volMA50[j]>0?Math.round((chart[j].v/volMA50[j]-1)*100):0;
      var pct20v=volMA20[j]>0?Math.round((chart[j].v/volMA20[j]-1)*100):0;
      ctx.fillStyle="#9a6700";ctx.font="9px monospace";ctx.fillText((pct50v>=0?"+":"")+pct50v+"%",x2,barBottom-20);
      ctx.fillStyle="#0969da";ctx.fillText((pct20v>=0?"+":"")+pct20v+"%",x2,barBottom-10);
    }
  }

  // 50D volume MA line
  if(vis.vol50){ctx.strokeStyle="#9a6700";ctx.lineWidth=1.5;ctx.beginPath();
    for(j=0;j<volMA50.length;j++){var vx2=xPos(j),vy2=volMALineY(volMA50[j]);if(j===0)ctx.moveTo(vx2,vy2);else ctx.lineTo(vx2,vy2)}ctx.stroke()}
  // 20D volume MA line
  if(vis.vol20){ctx.strokeStyle="#0969da";ctx.lineWidth=1.5;ctx.beginPath();
    for(j=0;j<volMA20.length;j++){var vx3=xPos(j),vy3=volMALineY(volMA20[j]);if(j===0)ctx.moveTo(vx3,vy3);else ctx.lineTo(vx3,vy3)}ctx.stroke()}

  // OBV line
  if(vis.obv){ctx.strokeStyle="rgba(188,140,255,0.5)";ctx.lineWidth=1.2;ctx.beginPath();
    for(j=0;j<obv.length;j++){var ox=xPos(j),oy=obvY(obv[j]);if(j===0)ctx.moveTo(ox,oy);else ctx.lineTo(ox,oy)}ctx.stroke()}

  // Candlesticks (thicker wicks + bodies)
  for(j=0;j<chart.length;j++){
    var cx2=xPos(j);var upD=chart[j].c>=chart[j].o;
    var bTop=priceY(Math.max(chart[j].o,chart[j].c));var bBot=priceY(Math.min(chart[j].o,chart[j].c));var bH2=Math.max(1,bBot-bTop);
    ctx.strokeStyle=upD?candleUpStroke:candleDnStroke;ctx.lineWidth=1.5;
    ctx.beginPath();ctx.moveTo(cx2,priceY(chart[j].h));ctx.lineTo(cx2,priceY(chart[j].l));ctx.stroke();
    if(upD){ctx.fillStyle=bgCol;ctx.fillRect(cx2-candleW/2,bTop,candleW,bH2);ctx.strokeStyle=candleUpStroke;ctx.lineWidth=1.5;ctx.strokeRect(cx2-candleW/2,bTop,candleW,bH2)}
    else{ctx.fillStyle=candleDnFill;ctx.fillRect(cx2-candleW/2,bTop,candleW,bH2)}
  }

  // MA lines (graduated widths, 100D dashed)
  ctx.textAlign="left";
  for(p=0;p<maPeriods.length;p++){
    var per=maPeriods[p];if(!vis["ma"+per])continue;
    var mk2="ma"+per;ctx.strokeStyle=maColors[per];ctx.lineWidth=maWidths[per];
    ctx.save();ctx.beginPath();ctx.rect(pad.l,pad.t,plotW,plotH);ctx.clip(); /* PMS-DASH 14 */ctx.setLineDash(per===100?[6,4]:[]);ctx.beginPath();var started=false;
    for(j=0;j<chart.length;j++){var mv=chart[j][mk2];if(mv){var mx=xPos(j),my=priceY(mv);if(!started){ctx.moveTo(mx,my);started=true}else ctx.lineTo(mx,my)}}
    ctx.stroke();ctx.setLineDash([]);ctx.restore(); /* PMS-DASH 14 */
    var lastMaVal=null;for(j=chart.length-1;j>=0;j--){if(chart[j][mk2]){lastMaVal=chart[j][mk2];break}}
    if(lastMaVal!==null&&!(_sspo&&_sspo.noMaLabels)){var ly=Math.max(pad.t+10,Math.min(pad.t+plotH-2,priceY(lastMaVal))); /* PMS-DASH 11: the summary's small chart drops the stacked end labels; 14: kept inside the plot */ctx.fillStyle=maColors[per];ctx.font="bold 12px monospace";ctx.textAlign="left";_mal.push({y:ly,c:maColors[per],t:(priceY(lastMaVal)<pad.t?'\u25B2':priceY(lastMaVal)>pad.t+plotH?'\u25BC':'')+_fpx(lastMaVal)}) /* PMS-DASH 14, 15: drawn after the loop, kept apart */}
  }

  /* PMS-DASH 7: exit levels as lines; tranches as dated vertical marks, no price label (D-BB-28) */
  /* PMS-DASH 15 (28-Oct-2026, Richard: "The text on the SP/MA chart should not run over the lines in the chart"): no text inside the
     plot. The exit levels are named in the right margin, beside the price scale, level with each line's last value, wrapped to the
     column and never on top of each other; the tranche dates sit above the plot; the MAs' and the price's values are kept apart. */
  function _drawMal(){var gap=14,fx=_mal.filter(function(q){return q.p}),rs=_mal.filter(function(q){return !q.p}),an=fx.length?fx[0].y:null,ab=[],be=[],la;
    rs.forEach(function(q){(an!=null&&q.y<=an?ab:be).push(q)});
    be.sort(function(a,b){return a.y-b.y});la=an!=null?an:-1e9;be.forEach(function(q){if(q.y<la+gap)q.y=la+gap;la=q.y});
    ab.sort(function(a,b){return b.y-a.y});la=an!=null?an:1e9;ab.forEach(function(q){if(q.y>la-gap)q.y=la-gap;la=q.y});
    ctx.textAlign='left';_mal.forEach(function(q){ctx.font=q.f||'bold 12px monospace';ctx.fillStyle=q.c;ctx.fillText(q.t,W-pad.r+(pad.r>=200?56:6),q.y+4)});_mal.length=0} /* wide: the values in their own column, right of the price scale */
  if(_pov){var _idx={},_labs=[];for(j=0;j<chart.length;j++)_idx[chart[j].d]=j;
    ctx.save();ctx.beginPath();ctx.rect(pad.l,pad.t,plotW,plotH);ctx.clip(); /* PMS-DASH 14 */
    (_pov.lines||[]).forEach(function(L){ctx.strokeStyle=L.color||'#cf222e';ctx.lineWidth=L.width||1.6;ctx.setLineDash(L.dash||[4,3]);ctx.beginPath();var st=false,lastV=null;
      for(j=0;j<chart.length;j++){var v=L.byDate[chart[j].d];if(v==null)continue;var xx=xPos(j),yy=priceY(v);if(!st){ctx.moveTo(xx,yy);st=true}else ctx.lineTo(xx,yy);lastV=v}
      ctx.stroke();ctx.setLineDash([]);
      if(lastV!=null&&L.label){var _y=priceY(lastV),_o=_y<pad.t?-1:_y>pad.t+plotH?1:0;_labs.push({y:Math.max(pad.t+6,Math.min(pad.t+plotH-6,_y)),ly:_y+(L.labelDy||-5),t:(_o<0?'▲ ':_o>0?'▼ ':'')+L.label+(_o<0?' (above the chart)':_o>0?' (below the chart)':''),c:L.color||'#cf222e',dash:L.dash||[4,3]})}});
    ctx.restore();
    var _lx=W-pad.r+104,_lw=W-6-_lx;
    if(_lw>=100){
      ctx.font='bold 11px sans-serif';
      _labs.forEach(function(Q){var ws=String(Q.t).split(' '),ls=[],cu='';ws.forEach(function(w){var t=cu?cu+' '+w:w;if(ctx.measureText(t).width>_lw-18&&cu){ls.push(cu);cu=w}else cu=t});if(cu)ls.push(cu);Q.ls=ls;Q.h=ls.length*13});
      _labs.sort(function(a,b){return a.y-b.y});
      var _tp=4;_labs.forEach(function(Q){Q.y0=Math.max(_tp,Q.y-6);_tp=Q.y0+Q.h+5});
      for(var _q=_labs.length-1;_q>=0;_q--){var Q=_labs[_q],lim=(_q===_labs.length-1?H-4:_labs[_q+1].y0-5)-Q.h;if(Q.y0>lim)Q.y0=lim}
      _labs.forEach(function(Q){ctx.strokeStyle=Q.c;ctx.lineWidth=2;ctx.setLineDash(Q.dash);ctx.beginPath();ctx.moveTo(_lx,Q.y0+6);ctx.lineTo(_lx+13,Q.y0+6);ctx.stroke();ctx.setLineDash([]);
        ctx.fillStyle=Q.c;ctx.textAlign='left';Q.ls.forEach(function(s,i){ctx.fillText(s,_lx+17,Q.y0+10+i*13)})});
    }else{ /* a narrow chart: the labels inside the plot, as before (PMS-DASH 12) */
      _labs.forEach(function(Q){Q.y=Q.ly});_labs.sort(function(a,b){return a.y-b.y});for(var _r=1;_r<_labs.length;_r++){if(_labs[_r].y<_labs[_r-1].y+14)_labs[_r].y=_labs[_r-1].y+14}
      ctx.font='bold 11px sans-serif';ctx.textAlign='right';_labs.forEach(function(Q){var _tw=ctx.measureText(Q.t).width;ctx.fillStyle='rgba(255,255,255,0.88)';ctx.fillRect(W-pad.r-8-_tw,Q.y-11,_tw+6,14);ctx.fillStyle=Q.c;ctx.fillText(Q.t,W-pad.r-4,Q.y)});
    }
    (_pov.marks||[]).forEach(function(M,mi){var k=_idx[M.d];if(k==null){for(j=0;j<chart.length;j++){if(chart[j].d>=M.d){k=j;break}}}if(k==null||chart[0].d>M.d)return;var xx=xPos(k);
      ctx.strokeStyle=M.color||'#8250df';ctx.lineWidth=1.2;ctx.setLineDash([3,3]);ctx.beginPath();ctx.moveTo(xx,pad.t);ctx.lineTo(xx,pad.t+plotH);ctx.stroke();ctx.setLineDash([]);
      if(M.label){ctx.font='11px sans-serif';ctx.textAlign='left';var rw=(M.row!=null?M.row:mi)%3,top_=pad.t>=40,ly=top_?pad.t-5-rw*12:pad.t+12+rw*13;
        if(top_){ctx.strokeStyle=M.color||'#8250df';ctx.lineWidth=1;ctx.setLineDash([2,2]);ctx.beginPath();ctx.moveTo(xx,ly+2);ctx.lineTo(xx,pad.t);ctx.stroke();ctx.setLineDash([])}
        ctx.fillStyle='#ffffff';var tw=ctx.measureText(M.label).width;ctx.fillRect(xx+2,ly-10,tw+4,13);ctx.fillStyle=M.color||'#8250df';ctx.fillText(M.label,xx+4,ly)}});
  }
  window.PMS_CHART_LAYOUT=window.PMS_CHART_LAYOUT||{};window.PMS_CHART_LAYOUT[_cid]={W:W,H:H,pad:pad,n:n,barW:barW,dates:chart.map(function(r){return r.d})}; /* PMS-DASH 8 */
  // Current price label (bold, RHS)
  if(chart.length>0){var lastC=chart[chart.length-1].c;var lcy2=priceY(lastC);ctx.fillStyle=textColBright;ctx.font="bold 13px monospace";ctx.textAlign="left";_mal.push({y:lcy2,c:textColBright,t:_fpx(lastC),f:'bold 13px monospace',p:1})}_drawMal(); /* PMS-DASH 15, 16 */

  // PHASE-4B 2026-05-04: single tiered x-axis label row, anchored on major gridlines.
  // Format determined by xt.label.
  function _fmtLabel(d){
    if(xt.label==='D-Mon')return d.getDate()+'-'+monthShort[d.getMonth()];
    if(xt.label==='Mon')return monthShort[d.getMonth()].toUpperCase();
    if(xt.label==='Mon-YY')return monthShort[d.getMonth()].toUpperCase()+'-'+String(d.getFullYear()).slice(-2);
    return String(d.getFullYear());
  }
  ctx.font='bold 12px sans-serif';ctx.fillStyle=textColBright;ctx.textAlign='center';
  // Anti-overlap: estimate per-label pixel width; drop alternating labels until labels fit.
  var sampleW=ctx.measureText(_fmtLabel(dates[majorIdx[0]||0])||'').width||30;
  var safeMin=sampleW+12;
  var lastLX=-9999;
  for(var li=0;li<majorIdx.length;li++){
    var jx3=majorIdx[li];var lxx=xPos(jx3);
    if(lxx-lastLX<safeMin)continue;
    var lblTxt=_fmtLabel(dates[jx3]);
    ctx.fillText(lblTxt,lxx,pad.t+plotH+22);
    lastLX=lxx;
  }
  /* PMS-DASH 16: at the 1M and 3M zooms (dated Monday labels) a second row names each month, centred on its sessions, bold at a quarter's start */
  if(n<=70&&pad.b>=44){var _ms=0;for(var _q=1;_q<=dates.length;_q++){if(_q<dates.length&&dates[_q].getMonth()===dates[_ms].getMonth())continue;
    var _x0=Math.max(pad.l,_ms?(xPos(_ms-1)+xPos(_ms))/2:pad.l),_x1=_q<dates.length?(xPos(_q-1)+xPos(_q))/2:W-pad.r,_d=dates[_ms],_nm=monthFull[_d.getMonth()].charAt(0)+monthFull[_d.getMonth()].slice(1).toLowerCase()+' '+_d.getFullYear();
    ctx.font=(_d.getMonth()%3===0?'bold ':'')+'12px sans-serif';ctx.fillStyle=textColBright;ctx.textAlign='center';if(_x1-_x0>ctx.measureText(_nm).width+8)ctx.fillText(_nm,(_x0+_x1)/2,pad.t+plotH+40);_ms=_q}}
}

// Clickable legend HTML with toggle
/* MD-SSP-LEGEND-2026-09-16 (Watson, SA - Master Dashboard). sspRenderChart guards on
   `typeof chartLegendHTML==='function'` from ANOTHER script scope, where the bare declaration is not
   visible, so the guard always failed and the Stock View chart shipped with an EMPTY legend row while
   the standard chart panel showed the full clickable one. Export it. */
function chartLegendHTML(){
  var items=[
    {key:"ma5",label:"MA-5D",color:"#8b0000"},{key:"ma10",label:"MA-10D",color:"#e88a9a"},
    {key:"ma20",label:"MA-20D",color:"#e74c3c"},{key:"ma50",label:"MA-50D",color:"#ff8c00"},
    {key:"ma100",label:"MA-100D",color:"#2ca02c"},{key:"ma150",label:"MA-150D",color:"#1a5276"},
    {key:"ma200",label:"MA-200D (absolute)",color:"#4a3d9e"} /* PMS-DASH 18 (30-Oct-2026, Richard: "Make sure any reference to the 200D MAs is called either relative or absolute") */,{key:"obv",label:"OBV",color:"#bc8cff"},
    {key:"vol",label:"Volume",color:"rgba(204,180,0,0.6)"},{key:"vol50",label:"Vol 50D MA",color:"#9a6700"},
    {key:"vol20",label:"Vol 20D MA",color:"#0969da"}
  ];
  var h="";
  for(var j=0;j<items.length;j++){
    var it=items[j];var on=chartVis[it.key];
    h+='<span id="legend-'+it.key+'" onclick="toggleChartLayer(\''+it.key+'\')" style="cursor:pointer;opacity:'+(on?"1":"0.3")+';display:inline-flex;align-items:center;gap:2px;padding:1px 4px;border-radius:3px;border:1px solid '+(on?"var(--border)":"transparent")+';user-select:none">';
    h+='<span style="display:inline-block;width:12px;height:2px;background:'+it.color+';border-radius:1px"></span>';
    h+='<span style="font-size:10px;font-weight:600;color:'+it.color+';text-decoration:'+(on?"none":"line-through")+'">'+it.label+'</span></span>';
  }
  return h;
}
window.chartLegendHTML=chartLegendHTML;  /* MD-SSP-LEGEND-2026-09-16: the Stock View renders its legend row from this. */

function _setChartFreshness(data,elId){
  var el=document.getElementById(elId||"chart-freshness");
  if(!el)return;
  if(!data||!data.length){el.textContent="";return;}
  var lastD=data[data.length-1].d;
  if(!lastD){el.textContent="";return;}
  var refStr=(typeof D!=="undefined"&&D&&D.meta&&D.meta.generated)?String(D.meta.generated):"";
  var ref=refStr?new Date(refStr.slice(0,10)):new Date();
  var last=new Date(String(lastD).slice(0,10));
  var diffDays=Math.round((ref.getTime()-last.getTime())/86400000);
  if(!isFinite(diffDays)||diffDays<0)diffDays=0;
  if(diffDays>5){
    el.textContent="stale: data to "+lastD+" ("+diffDays+"d behind)";
    el.style.color="#e0a030";
    el.title="Latest price bar is "+diffDays+" days before the dashboard data date - this chart may be stale";
  }else{
    el.textContent="data to "+lastD;
    el.style.color="var(--text-dim)";
    el.title="Date of the most recent price bar in this chart";
  }
}
window._setChartFreshness=_setChartFreshness;

