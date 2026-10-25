'use strict';
(()=>{
const {fresh,legal,apply,fen,check,coord,idx,color,names}=ChessRules;
const $=id=>document.getElementById(id);
const shapes={p:'<circle cx="50" cy="28" r="14"/><path d="M39 44 L32 70 H68 L61 44Z"/><rect x="23" y="73" width="54" height="9" rx="3"/>',r:'<path d="M23 20 H35 V30 H44 V20 H56 V30 H65 V20 H77 V43 H23Z"/><path d="M32 45 H68 L72 72 H28Z"/><rect x="22" y="74" width="56" height="9" rx="2"/>',n:'<path d="M27 75 L34 53 L27 46 L36 24 L57 14 L73 25 L69 39 L57 37 L48 48 L67 74Z"/><circle cx="56" cy="28" r="3"/><rect x="22" y="75" width="55" height="8" rx="2"/>',b:'<path d="M50 14 Q28 28 35 45 Q38 54 42 60 L33 72 H67 L58 60 Q78 34 50 14Z"/><path d="M57 25 L43 45" stroke-width="4" fill="none"/><rect x="24" y="74" width="52" height="9" rx="2"/>',q:'<circle cx="19" cy="24" r="6"/><circle cx="40" cy="17" r="6"/><circle cx="60" cy="17" r="6"/><circle cx="81" cy="24" r="6"/><path d="M19 31 L30 65 H70 L81 31 L60 48 L50 28 L40 48Z"/><rect x="24" y="70" width="52" height="11" rx="3"/>',k:'<path d="M50 10 V35 M37 22 H63" fill="none" stroke-width="8"/><path d="M34 43 Q30 55 38 64 L30 73 H70 L62 64 Q70 55 66 43Z"/><rect x="23" y="74" width="54" height="9" rx="2"/>'};
function pieceSvg(p){let w=color(p)===1;return `<svg class="piece-svg" viewBox="0 0 100 100"><g fill="${w?'#fffdf4':'#24302b'}" stroke="${w?'#28332c':'#f0e5d5'}" stroke-width="3" stroke-linejoin="round" stroke-linecap="round">${shapes[p.toLowerCase()]}</g></svg>`;}
let suggestion=null;let busy=false; let history=[fresh()],moves=[],selected=-1,flip=false,prior=null,token=0,promotion=null;const current=()=>history[history.length-1];
function draw(){let s=current(),opts=legal(s),board=$('board');board.innerHTML='';let ranks=flip?[1,2,3,4,5,6,7,8]:[8,7,6,5,4,3,2,1],files=flip?'hgfedcba':'abcdefgh';for(let y=0;y<8;y++)for(let x=0;x<8;x++){let q=files[x]+ranks[y],i=idx(q),p=s.b[i],el=document.createElement('button');el.type='button';el.className='sq '+((x+y)%2?'dark':'light')+(selected===i?' selected':'')+(selected>=0&&opts.some(m=>m[0]===selected&&m[1]===i)?(p==='.'?' target':' capture'):'');el.dataset.square=q;el.setAttribute('aria-label',q+(p==='.'?'':names[p.toLowerCase()]));if(p!=='.')el.innerHTML=pieceSvg(p);let span=document.createElement('span');span.className='coord';span.textContent=q;el.appendChild(span);el.onclick=()=>click(i);board.appendChild(el);}let over=!opts.length;$('turn').textContent=over?(check(s)?'将死 · '+(s.t===1?'黑':'白')+'方获胜':'逼和 · 平局'):(s.t===1?'轮到你 · 白棋':'电脑思考 · 黑棋');$('status').textContent=check(s)?'⚠️ 王被将军，必须先解围':'点击棋子开始';$('history').textContent=moves.length?moves.map((m,i)=>(i%2===0?(Math.floor(i/2)+1)+'. ':'')+m).join('  '):'尚未走棋';renderRoutes();}
function click(i){let s=current(),opts=legal(s);if(busy||s.t!==1||promotion||!opts.length)return;if(color(s.b[i])===s.t){selected=i;let p=s.b[i].toLowerCase();$('rule').textContent=({p:'兵：向前走，斜前方吃；首次可走两格。',n:'马：走日字，可跳子。',b:'象：走斜线，不能跳子。',r:'车：横竖直走，不能跳子。',q:'后：横竖斜都能走。',k:'王：走一格，不能进入被攻击格；符合条件可易位。'})[p];draw();return;}let choices=opts.filter(m=>m[0]===selected&&m[1]===i);if(!choices.length){$('warning').textContent='这不是合法目的地，请选择绿色提示格。';return;}if(choices.length>1){promotion=choices;let p=prompt('升变：输入 q（后）、r（车）、b（象）、n（马）','q');promotion=null;if(p===null)return;make(choices.find(m=>m[2]===p.toLowerCase())||choices[0]);}else make(choices[0]);}
function make(m){let s=current(),label=coord(m[0])+coord(m[1])+(m[2]||''),p=s.b[m[0]],capt=s.b[m[1]],old=prior;history.push(apply(s,m));moves.push(label);selected=-1;prior=null;suggestion=null;++token;$('engine').textContent='局面改变，请重新分析。';let msg=names[p.toLowerCase()]+' '+coord(m[0])+' → '+coord(m[1])+'。';if(capt!=='.'||m[3]==='ep')msg+=' 吃子。';if(check(current()))msg+=' 将军！';if(!legal(current()).length&&check(current()))msg+=' 将死！';if(['d4','e4','d5','e5'].includes(coord(m[1])))msg+=' 占据中心。';if(old&&old.fen===fen(s))msg+=old.best===label?' ✓ 这步符合引擎推荐。':' 引擎推荐 '+old.best+'；还需要比较评分才能判断失误程度。';$('feedback').textContent=msg;$('warning').textContent='';draw();review(s,m,label,token,old);}
function setBusy(v){busy=v;$('board').setAttribute('aria-busy',String(v));}
const engine=new StockfishClient();
function moveText(m){return m.slice(0,2)+' → '+m.slice(2,4)+(m[4]?' 升变为'+names[m[4]]:'');}
function scoreText(a,s){const v=a.score.value*s.t;return a.score.kind==='mate'?(v>0?'白':'黑')+'方可强制将杀（约 '+Math.abs(a.score.value)+' 步）':'白方视角 '+(v>=0?'+':'')+(v/100).toFixed(2)+' 兵';}
function showAnalysis(a,s,settled=false){
 if(s!==current())return;
 prior={...a,fen:fen(s),settled};
 // Keep the route fixed while Stockfish searches; only the score streams live.
 $('engine').textContent=(settled?(s.t===1?'推荐：':'黑方候选：')+moveText(a.best):'实时评分 · 搜索中…')+'\n'+scoreText(a,s)+' · 深度 '+a.depth;
 if(settled&&s.t===1){suggestion={uci:a.best,fen:fen(s)};renderRoutes();}
}
function moveReason(s,uci){
 const m=legal(s).find(m=>coord(m[0])+coord(m[1])+m[2]===uci);if(!m)return '观察王的安全和对手回吃。';
 const p=s.b[m[0]].toLowerCase(),to=coord(m[1]),after=apply(s,m),parts=[];
 if(check(after))parts.push(legal(after).length?'将军，迫使对手应对':'将死，结束对局');
 if(s.b[m[1]]!=='.'||m[3]==='ep')parts.push('吃掉'+(m[3]==='ep'?'过路兵':names[s.b[m[1]].toLowerCase()]));
 if(m[3]==='castle')parts.push('王车易位，让王靠边、车出动');
 if(m[2])parts.push('升变为'+names[m[2]]+'，增强火力');
 if(['d4','e4','d5','e5'].includes(to))parts.push('占据中心');
 if((p==='n'||p==='b')&&(m[0]>>4===(s.t===1?7:0)))parts.push('出动'+names[p]);
 if(p==='p'&&'de'.includes(to[0])&&s.b[m[1]]==='.')parts.push('为象后打开线路');
 const controlled=['d4','e4','d5','e5'].filter(q=>attacksFrom(after,m[1],idx(q)));
 if(controlled.length)parts.push('控制 '+controlled.slice(0,2).join('/'));
 if(!parts.length)parts.push(p==='k'?'调整王位，注意对手攻击':'调整'+names[p]+'的位置，留意回吃');
 return parts.slice(0,2).join('，')+'。';
}
function attacksFrom(s,from,to){
 const piece=s.b[from].toLowerCase(),dr=(to>>4)-(from>>4),dc=(to&7)-(from&7);
 if(piece==='p')return dr===-color(s.b[from])&&Math.abs(dc)===1;
 if(piece==='n')return Math.abs(dr)*Math.abs(dc)===2;
 if(piece==='k')return Math.max(Math.abs(dr),Math.abs(dc))===1;
 const diagonal=Math.abs(dr)===Math.abs(dc)&&dr!==0,straight=(dr===0)!==(dc===0);
 if(!((piece==='b'&&diagonal)||(piece==='r'&&straight)||(piece==='q'&&(diagonal||straight))))return false;
 const step=Math.sign(dr)*16+Math.sign(dc);for(let q=from+step;q!==to;q+=step)if(s.b[q]!=='.')return false;return true;
}
function routePoint(q){const x=q.charCodeAt(0)-97,y=8-Number(q[1]);return flip?[750-x*100,750-y*100]:[50+x*100,50+y*100];}
function routeSvg(uci,type){
 const a=routePoint(uci.slice(0,2)),b=routePoint(uci.slice(2,4)),dx=b[0]-a[0],dy=b[1]-a[1],length=Math.hypot(dx,dy),ux=dx/length,uy=dy/length;
 const x1=a[0]+ux*23,y1=a[1]+uy*23,x2=b[0]-ux*26,y2=b[1]-uy*26,color=type==='last'?'#d93f20':'#173a9d',dash=type==='hint'?' stroke-dasharray="16 12"':'';
 return `<g data-route="${type}" data-move="${uci}"><circle cx="${a[0]}" cy="${a[1]}" r="11" fill="${color}" stroke="#fff8eb" stroke-width="4"/><path d="M${x1} ${y1} L${x2} ${y2}" fill="none" stroke="#fff8eb" stroke-width="15"${dash}/><path d="M${x1} ${y1} L${x2} ${y2}" fill="none" stroke="${color}" stroke-width="8"${dash} marker-end="url(#arrow-${type})"/></g>`;
}
function renderRoutes(){
 const last=moves.at(-1),s=current(),hint=suggestion&&suggestion.fen===fen(s)&&s.t===1?suggestion.uci:null;
 $('arrows').innerHTML='<defs>'+['last','hint'].map(t=>`<marker id="arrow-${t}" markerWidth="4" markerHeight="4" refX="3" refY="2" orient="auto"><path d="M0 0 L4 2 L0 4 Z" fill="${t==='last'?'#d93f20':'#173a9d'}" stroke="#fff8eb" stroke-width=".4"/></marker>`).join('')+'</defs>'+(last?routeSvg(last,'last'):'')+(hint?routeSvg(hint,'hint'):'');
 const prev=history.at(-2);
 $('tactics').textContent=last?'实线 · '+(prev.t===1?'白':'黑')+moveText(last)+'：'+moveReason(prev,last):'实线：落子后保留最新一步的路线。';
 $('advice').textContent=hint?'虚线 · 建议'+moveText(hint)+'：'+moveReason(s,hint):'虚线：正在分析，完成后显示稳定建议。';
}

async function analyze(){if(busy)return;const s=current(),id=++token;if(!legal(s).length){$('engine').textContent='本局已结束。';return;}setBusy(true);$('engine').textContent='Stockfish 正在分析…';try{if(s.t===-1){await playBlack(s,id);return;}const a=await engine.evaluate(fen(s),null,a=>{if(id===token)showAnalysis(a,s);});if(id===token)showAnalysis(a,s,true);}catch(e){if(id===token)$('engine').textContent=e.message+'。棋盘仍可使用。';}finally{if(id===token)setBusy(false);}}
async function playBlack(s,id,analysis){
 if(id!==token||s!==current()||s.t!==-1)return;
 const a=analysis||await engine.evaluate(fen(s),null,a=>{if(id===token)showAnalysis(a,s);},{multiPV:4});
 if(id!==token||s!==current())return;
 const uci=chooseComputerMove(a),m=legal(s).find(m=>coord(m[0])+coord(m[1])+m[2]===uci);
 if(!m)throw Error('电脑未返回合法走法');
 history.push(apply(s,m));moves.push(uci);selected=-1;prior=null;suggestion=null;draw();
 $('feedback').textContent+=' 电脑黑棋：'+moveText(uci)+'。';
 $('rule').textContent='你执白棋，电脑执黑棋；黑方会变化选择较好走法。';
 if(!legal(current()).length){$('engine').textContent='本局已结束。';return;}
 const next=current();const nextA=await engine.evaluate(fen(next),null,a=>{if(id===token)showAnalysis(a,next);});
 if(id===token)showAnalysis(nextA,next,true);
}
async function review(s,m,label,id,cached){setBusy(true);const next=current();$('engine').textContent='电脑正在思考…';try{
 let reply=null;
 if(legal(next).length){reply=await engine.evaluate(fen(next),null,a=>{if(id===token)showAnalysis(a,next);},{multiPV:4});if(id!==token)return;showAnalysis(reply,next);}else $('engine').textContent='本局已结束。';
 const best=cached&&cached.fen===fen(s)?cached:await engine.evaluate(fen(s));if(id!==token)return;
 const played=best.best===label?best:await engine.evaluate(fen(s),label);if(id!==token)return;
 const grade=gradeMove(best.score,played.score,best.best===label);
 $('feedback').textContent+=' '+grade.label+(grade.loss===null?'':' · 估计损失 '+(grade.loss/100).toFixed(2)+' 兵')+'。走棋前推荐：'+moveText(best.best)+'（深度 '+best.depth+'/'+played.depth+'）。';
 
 if(reply)await playBlack(next,id,reply);
 }catch(e){if(id===token)$('engine').textContent=e.message+'；点击 ↻ 重试。';}finally{if(id===token)setBusy(false);}}
function invalidate(){++token;setBusy(false);selected=-1;prior=null;suggestion=null;promotion=null;$('warning').textContent='';$('engine').textContent='点击分析当前局面。';$('feedback').textContent='局面已更新。';$('advice').textContent='先争夺中心，再发展马和象。';}
$('analyze').onclick=analyze;
$('undo').onclick=()=>{if(history.length>1){do{history.pop();moves.pop();}while(history.length>1&&current().t!==1);invalidate();draw();analyze();}};
$('restart').onclick=()=>{history=[fresh()];moves=[];invalidate();draw();analyze();};
$('view').onchange=e=>{flip=e.target.value==='b';draw();if(prior&&prior.fen===fen(current()))showAnalysis(prior,current(),prior.settled);};
draw();analyze();
})();
