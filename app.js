'use strict';
(()=>{
const {fresh,legal,apply,fen,check,coord,idx,color,names}=ChessRules;
const $=id=>document.getElementById(id);
const shapes={p:'<circle cx="50" cy="28" r="14"/><path d="M39 44 L32 70 H68 L61 44Z"/><rect x="23" y="73" width="54" height="9" rx="3"/>',r:'<path d="M23 20 H35 V30 H44 V20 H56 V30 H65 V20 H77 V43 H23Z"/><path d="M32 45 H68 L72 72 H28Z"/><rect x="22" y="74" width="56" height="9" rx="2"/>',n:'<path d="M27 75 L34 53 L27 46 L36 24 L57 14 L73 25 L69 39 L57 37 L48 48 L67 74Z"/><circle cx="56" cy="28" r="3"/><rect x="22" y="75" width="55" height="8" rx="2"/>',b:'<path d="M50 14 Q28 28 35 45 Q38 54 42 60 L33 72 H67 L58 60 Q78 34 50 14Z"/><path d="M57 25 L43 45" stroke-width="4" fill="none"/><rect x="24" y="74" width="52" height="9" rx="2"/>',q:'<circle cx="19" cy="24" r="6"/><circle cx="40" cy="17" r="6"/><circle cx="60" cy="17" r="6"/><circle cx="81" cy="24" r="6"/><path d="M19 31 L30 65 H70 L81 31 L60 48 L50 28 L40 48Z"/><rect x="24" y="70" width="52" height="11" rx="3"/>',k:'<path d="M50 10 V35 M37 22 H63" fill="none" stroke-width="8"/><path d="M34 43 Q30 55 38 64 L30 73 H70 L62 64 Q70 55 66 43Z"/><rect x="23" y="74" width="54" height="9" rx="2"/>'};
function pieceSvg(p){let w=color(p)===1;return `<svg class="piece-svg" viewBox="0 0 100 100"><g fill="${w?'#fffaf0':'#263b68'}" stroke="${w?'#263b45':'#f5efe2'}" stroke-width="3" stroke-linejoin="round" stroke-linecap="round">${shapes[p.toLowerCase()]}</g></svg>`;}

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
let history=[fresh()],moves=[],selected=-1,flip=false,busy=false,token=0,lastWhite=null,inspection=false;
const engine=new StockfishClient(),current=()=>history.at(-1),uci=m=>coord(m[0])+coord(m[1])+m[2];
function moveText(m){return m.slice(0,2)+' → '+m.slice(2,4)+(m[4]?' 升变为'+names[m[4]]:'');}
function matching(s,label){return legal(s).find(m=>uci(m)===label);}
function options(s){if(selected<0)return [];const side=color(s.b[selected]);return legal(side===s.t?s:{...s,t:side,ep:-1}).filter(m=>m[0]===selected);}
function paintBoard(board,s,interactive=true){
 board.innerHTML='';const opts=interactive?options(s):[],last=interactive?moves.at(-1):null;
 for(let y=0;y<8;y++)for(let x=0;x<8;x++){
 const q=(flip?'hgfedcba':'abcdefgh')[x]+(flip?y+1:8-y),i=idx(q),p=s.b[i],el=document.createElement(interactive?'button':'div');
 if(interactive)el.type='button';el.className='sq '+((x+y)%2?'dark':'light')+(interactive&&i===selected?' selected':'')+(last&&(q===last.slice(0,2)||q===last.slice(2,4))?' last':'')+(opts.some(m=>m[1]===i)?(p==='.'?' target':' capture'):'');
 el.dataset.square=q;el.setAttribute('aria-label',q+(p==='.'?'':(color(p)===1?'白':'黑')+names[p.toLowerCase()]));if(p!=='.')el.innerHTML=pieceSvg(p);
 if(x===0||y===7){const label=document.createElement('span');label.className='coord';label.textContent=y===7?q[0]:q[1];el.appendChild(label);}
 if(interactive)el.onclick=()=>click(i);board.appendChild(el);
 }
}
function draw(){const s=current(),over=!legal(s).length;paintBoard($('board'),s);$('board').setAttribute('aria-busy',String(busy));
 $('turn').textContent=over?(check(s)?(s.t===-1?'你赢了 · 将死':'电脑获胜 · 将死'):'和棋 · 逼和'):(s.t===1?'轮到你 · 白棋':'电脑思考中 · 黑棋');
 $('status').textContent=over?'本局结束，可复盘最后一步':check(s)?'你的王被将军，先解围':selected<0?'点击棋子，查看可走位置':inspection?'黑棋落点预览 · 不能代替电脑走棋':'点击圆点走棋';
 $('review').disabled=!lastWhite||busy;$('retry').hidden=!(s.t===-1&&!busy&&legal(s).length);
 $('history').textContent=moves.length?moves.map((m,i)=>(i%2===0?(Math.floor(i/2)+1)+'. ':'')+m).join('  '):'尚未走棋';
}
function setBusy(value){busy=value;$('board').setAttribute('aria-busy',String(value));$('review').disabled=!lastWhite||busy;}
function click(i){const s=current();if(busy||!legal(s).length)return;const p=s.b[i];
 if(p!=='.'&&(selected<0||inspection||color(p)===1)){selected=selected===i?-1:i;inspection=selected>=0&&color(p)===-1;draw();return;}
 if(s.t!==1||inspection)return;
 const choices=options(s).filter(m=>m[1]===i);if(!choices.length){selected=-1;draw();return;}
 let m=choices[0];if(choices.length>1){const choice=prompt('升变为：q 后 / r 车 / b 象 / n 马','q');if(choice===null)return;m=choices.find(m=>m[2]===choice.toLowerCase())||m;}
 makeWhite(m);
}
function makeWhite(m){const before=current(),label=uci(m);lastWhite={before,label,move:m,ply:moves.length,review:null};
 history.push(apply(before,m));moves.push(label);selected=-1;inspection=false;const id=++token;setBusy(true);$('warning').textContent='';draw();respond(id);
}
async function respond(id){try{const s=current();if(!legal(s).length)return;
 const a=await engine.evaluate(fen(s),null,null,{multiPV:4});if(id!==token||current()!==s)return;
 const m=matching(s,chooseComputerMove(a));if(!m)throw Error('没有取得合法应手');history.push(apply(s,m));moves.push(uci(m));
 }catch(e){if(id===token)$('warning').textContent='电脑暂未完成应手，点击“重试”。';}finally{if(id===token){setBusy(false);draw();}}}
function resetWork(){++token;setBusy(false);selected=-1;inspection=false;lastWhite=null;for(let i=moves.length-1;i>=0;i--)if(i%2===0){lastWhite={before:history[i],label:moves[i],move:matching(history[i],moves[i]),ply:i,review:null};break;}$('warning').textContent='';$('coach').close();draw();}
$('undo').onclick=()=>{if(history.length>1){do{history.pop();moves.pop();}while(history.length>1&&current().t!==1);resetWork();}};
$('restart').onclick=()=>{history=[fresh()];moves=[];resetWork();$('menu').close();};
$('menu-open').onclick=()=>$('menu').showModal();$('menu-close').onclick=()=>$('menu').close();$('coach-close').onclick=()=>$('coach').close();
$('view').onchange=e=>{flip=e.target.value==='b';draw();};
$('retry').onclick=()=>{if(!busy&&current().t===-1){const id=++token;setBusy(true);draw();respond(id);}};
function lesson(record,best,played,grade){const s=record.before,m=record.move,p=s.b[m[0]].toLowerCase(),after=apply(s,m),reasons=moveReason(s,record.label);
 let knowledge='走前先检查：对手有没有将军、吃子或直接威胁；吃子后也要看对方能否回吃。';
 if(check(after)){
 const king=after.b.indexOf(s.t===1?'k':'K'),attackers=[];for(let i=0;i<128;i++)if(!(i&0x88)&&color(after.b[i])===s.t&&attacksFrom(after,i,king))attackers.push(names[after.b[i].toLowerCase()]+' '+coord(i));
 knowledge='将军的攻击者是'+attackers.join('、')+'，目标是王 '+coord(king)+'。'+(attackers.some(a=>a.endsWith(coord(m[1])))?'':'这是闪将：移开棋子后，后方棋子的攻击线被打开。')+'将军必须通过移王、吃攻击子或挡住线路来解除。';
 }else if(['d4','e4','d5','e5'].includes(coord(m[1]))||p==='n'||p==='b')knowledge='控制中心不等于必须站在中心：兵斜着控制格子，马和象也能从旁边控制 d4、e4、d5、e5。出子时兼顾王的安全。';
 if(m[3]==='castle')knowledge='王车易位一次移动王和车；王不能正在被将军，也不能经过或落在被攻击的格子。';
 const loss=grade.loss===null?'将杀局面单独判断':(grade.loss/100).toFixed(2)+' 兵的估计损失';
 $('review-grade').textContent=grade.label+' · '+loss;
 $('review-played').textContent='你走了 '+moveText(record.label)+'。'+reasons+(grade.loss!==null&&grade.loss>=50?'引擎比较显示，这步让局面逊于首选；具体差别要结合下方应手看。':'这步在当前搜索中保住了较好的局面。');
 const reply=(played.variation||[])[1],replyMove=reply&&matching(after,reply);if(replyMove&&after.b[replyMove[1]]!=='.'&&grade.loss!==null&&grade.loss>=50){$('review-played').textContent+=' 参考应手中，黑'+names[after.b[replyMove[0]].toLowerCase()]+'可从 '+coord(replyMove[0])+' 吃到 '+coord(replyMove[1])+'，吃掉你的'+names[after.b[replyMove[1]].toLowerCase()]+'；检查这个棋子的保护。';}
 $('review-best').textContent=best.best===record.label?'你的走法就是引擎首选。'+moveReason(s,best.best):'当时更推荐 '+moveText(best.best)+'。'+moveReason(s,best.best);
 $('review-knowledge').textContent=knowledge;
 let lineState=s;const line=[];for(const label of (played.variation||[]).slice(0,4)){const lm=matching(lineState,label);if(!lm)break;line.push((lineState.t===1?'白':'黑')+names[lineState.b[lm[0]].toLowerCase()]+' '+moveText(label));lineState=apply(lineState,lm);}
 $('review-line').textContent=line.length>1?line.slice(1).join('；')+'。这是引擎参考变化，不代表对手一定这样走。':'当前搜索没有足够的后续变化；先检查对手的将军、吃子和威胁。';
 $('review-depth').textContent='Stockfish 搜索深度 '+best.depth+'/'+played.depth+'；有限搜索评级，走法说明根据局面规则生成。';
}
function reviewArrows(record,best){paintBoard($('review-board'),record.before,false);$('review-arrows').innerHTML='<defs>'+['last','hint'].map(t=>`<marker id="arrow-${t}" markerWidth="4" markerHeight="4" refX="3" refY="2" orient="auto"><path d="M0 0 L4 2 L0 4 Z" fill="${t==='last'?'#d93f20':'#173a9d'}"/></marker>`).join('')+'</defs>'+routeSvg(record.label,'last')+(best.best!==record.label?routeSvg(best.best,'hint'):'');}
$('review').onclick=async()=>{if(busy||!lastWhite)return;const record=lastWhite,id=token;
 $('coach').showModal();$('review-content').hidden=true;$('review-loading').hidden=false;$('review-loading').textContent='正在复盘你刚才的白棋…';$('review-title').textContent='第 '+(Math.floor(record.ply/2)+1)+' 步 · 你的白棋';
 try{let result=record.review;if(!result){setBusy(true);const best=await engine.evaluate(fen(record.before));if(id!==token)return;const played=best.best===record.label?best:await engine.evaluate(fen(record.before),record.label);if(id!==token)return;result={best,played,grade:gradeMove(best.score,played.score,best.best===record.label)};record.review=result;}
 lesson(record,result.best,result.played,result.grade);reviewArrows(record,result.best);$('review-loading').hidden=true;$('review-content').hidden=false;
 }catch(e){if(id===token)$('review-loading').textContent='这一步暂时无法分析，请关闭后重试。';}finally{if(id===token){setBusy(false);draw();}}};
draw();
})();
