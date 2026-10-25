'use strict';
// Only aggregate learning signals. No click-by-click narrative or remote storage.
class ChessLearning {
 constructor(storage){this.storage=storage;this.key='chess-coach-learning-v1';this.available=true;this.data={games:[],active:null};try{const saved=JSON.parse(storage.getItem(this.key)||'null');if(saved&&Array.isArray(saved.games)){this.data.games=saved.games.slice(-20);if(saved.active&&Array.isArray(saved.active.moves)&&saved.active.moves.length<=600)this.data.active=saved.active;}}catch{}if(this.data.active){this.data.active.hints=Array.isArray(this.data.active.hints)?this.data.active.hints:[];this.data.active.reviews=this.data.active.reviews&&typeof this.data.active.reviews==='object'?this.data.active.reviews:{};}if(!this.data.active)this.newGame();}
 save(){try{this.storage.setItem(this.key,JSON.stringify(this.data));this.available=true;}catch{this.available=false;}}
 newGame(){this.data.active={id:Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,8),started:new Date().toISOString(),moves:[],hints:[],reviews:{}};this.save();return this.data.active;}
 setMoves(moves){const a=this.data.active;a.moves=moves.slice();a.hints=(a.hints||[]).filter(h=>h.ply<=moves.length);for(const ply of Object.keys(a.reviews||{}))if(Number(ply)>=moves.length)delete a.reviews[ply];this.save();}
 hint({key,ply,phase,tags}){const a=this.data.active;if((a.hints||[]).some(h=>h.key===key))return; a.hints.push({key,ply,phase,tags:[...new Set(tags)]});this.save();}
 review(ply,result,tags){this.data.active.reviews[ply]={result,tags:[...new Set(tags)]};this.save();}
 report(result='进行中',complete=false){const a=this.data.active,total=Math.ceil(a.moves.length/2),reviews=Object.values(a.reviews||{}),hints=a.hints||[];
 const mistakes=reviews.filter(r=>r.result.grade.loss===null?!['最佳走法','将杀局面 · 不作分值评级'].includes(r.result.grade.label):r.result.grade.loss>=100);
 const counts=items=>{const out={};for(const item of items)for(const t of item.tags||[])out[t]=(out[t]||0)+1;return out;};
 const hintCounts=counts(hints),errorCounts=counts(mistakes),prior=this.data.games.filter(g=>g.id!==a.id),errorAcross={},hintAcross={};for(const g of prior)for(const [tag,n]of Object.entries(g.hintCounts||{}))hintAcross[tag]=(hintAcross[tag]||0)+n;for(const game of prior)for(const [tag,n]of Object.entries(game.errorCounts||{}))errorAcross[tag]=(errorAcross[tag]||0)+n;
 const phaseCounts={};for(const h of hints)phaseCounts[h.phase]=(phaseCounts[h.phase]||0)+1;
 const coverage=reviews.length,findings=[];
 const advice={
 '中心与计划':['可能还没有形成中心争夺后的下一步计划。','每步选两个候选：一个改善最不活跃棋子，一个处理对手威胁，再比较。'],
 '出子与节奏':['可能更关注眼前走法，还未稳定安排轻子发展与易位。','前十步先检查马象是否出动，避免无目的地反复移动同一棋子或只推兵。'],
 '落子安全与回吃':['参考变化多次出现对方直接吃子，可能漏看了落点安全或交换后的结果。','落子前问：谁能吃我？我能否回吃？把双方至少各一步的交换算完。'],
 '交换判断':['失分走法多次涉及吃子，可能只比较了第一步收益。','先数整段交换后的子力，再看是否暴露王或失去关键防守。'],
 '王的安全与解围':['相关局面需要处理王的安全，可能还未把解围与易位作为优先检查。','被将军先只找合法解围；平时检查能否安全易位，以及王前兵是否被削弱。'],
 '将军与战术':['可能容易漏掉强制性走法，或不清楚将军来自哪颗棋子。','每步先找双方的将军和吃子，再沿后、车、象的线路检查遮挡与闪将。'],
 '残局计划':['求助集中在子力较少的局面，可能需要更明确的王兵或将杀计划。','先保证不逼和，限制对方王的活动，再让王或兵逐步接近目标。'],
 '候选比较与计算':['可能需要更稳定的候选走法比较习惯，当前证据不足以定位单一战略原因。','选两个合法候选，各算对方最强的一手应对，不急着照搬引擎首选。']};
 for(const [tag,n]of Object.entries(errorCounts).sort((a,b)=>b[1]-a[1]))if(n>=2||(n>=1&&(errorAcross[tag]||0)>=1)){const text=advice[tag]||advice['候选比较与计算'];findings.push({kind:'反复失分',tag,evidence:'本局 '+n+' 手明显失分涉及该类问题'+(errorAcross[tag]?'；此前完成的对局累计 '+errorAcross[tag]+' 手':'')+'。这是按局面特征分类，不能证明唯一原因。',reason:text[0],practice:text[1]});}
 for(const [tag,n]of Object.entries(hintCounts).sort((a,b)=>b[1]-a[1]))if((n>=2||(n>=1&&(hintAcross[tag]||0)>=2))&&!findings.some(f=>f.tag===tag)){const text=advice[tag]||advice['候选比较与计算'];findings.push({kind:'经常求助的决策',tag,evidence:'本局 '+n+' 个不同求助局面涉及该主题'+(hintAcross[tag]?'；此前完成的对局累计 '+hintAcross[tag]+' 个':'')+'。重复打开同一局面只计一次；求助不等于走错。',reason:text[0],practice:text[1]});}
 if(!findings.length)findings.push({kind:'证据仍少',tag:'暂不下弱点结论',evidence:'目前尚未形成重复模式。',reason:'偶尔求助或单次失误不足以说明稳定的策略缺口。',practice:'继续独立选择走法，再用复盘核对；积累多局后再看重复主题。'});
 const good=reviews.filter(r=>r.result.grade.loss!==null&&r.result.grade.loss<50).length;
 return {id:a.id,date:new Date().toISOString(),result,complete,total,coverage,hints:hints.length,phaseCounts,hintCounts,errorCounts,mistakes:mistakes.length,good,findings:findings.slice(0,3),pastGames:prior.length};
 }
 finish(result){const report=this.report(result,true);this.data.games=this.data.games.filter(g=>g.id!==report.id).concat(report).slice(-20);this.save();return report;}
 clear(){this.data={games:[],active:null};this.newGame();}
}
globalThis.ChessLearning=ChessLearning;
