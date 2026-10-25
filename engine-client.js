'use strict';
// One UCI search at a time. No external analysis service or cross-origin headers.
class StockfishClient {
  constructor(){this.tail=Promise.resolve();this.worker=null;this.pending=null;}
  async boot(){
    if(this.worker)return;
    const worker=new Worker(new URL('engine/stockfish-19-lite-single.js',document.baseURI));
    this.worker=worker;
    await new Promise((resolve,reject)=>{
      const timer=setTimeout(()=>{this.reset();reject(Error('引擎加载超时，请重试'));},30000);
      worker.onerror=()=>{clearTimeout(timer);this.reset();reject(Error('引擎无法加载，请检查网络后重试'));};
      worker.onmessage=({data})=>{if(String(data).trim()==='uciok'){
        worker.postMessage('setoption name Hash value 16');worker.postMessage('isready');
      }else if(String(data).trim()==='readyok'){clearTimeout(timer);resolve();}};
      worker.postMessage('uci');
    });
    worker.onmessage=({data})=>this.pending?.line(String(data));
    worker.onerror=()=>{this.pending?.fail(Error('引擎已停止，请重试'));this.reset();};
  }
  reset(){this.worker?.terminate();this.worker=null;this.pending=null;}
  evaluate(fen,move,onProgress,options={}){
    const task=async()=>{
      await this.boot();
      return new Promise((resolve,reject)=>{
        let score=null,depth=0; const lines=new Map();
        const fail=e=>{clearTimeout(timer);this.reset();reject(e);};
        const timer=setTimeout(()=>fail(Error('分析超时，请重试')),30000);
        this.pending={fail,line:line=>{
          const m=line.match(/\bscore (cp|mate) (-?\d+)/);
          if(m&&!/\b(?:upperbound|lowerbound)\b/.test(line)){
            const value={kind:m[1],value:Number(m[2])},d=Number(line.match(/\bdepth (\d+)/)?.[1]||0),rank=Number(line.match(/\bmultipv (\d+)/)?.[1]||1);
            const pv=line.match(/\bpv ([a-h][1-8][a-h][1-8][qrbn]?)/);
            if(rank===1){score=value;depth=d;if(pv)onProgress?.({best:pv[1],score,depth});}
            if(pv){if(!lines.has(d))lines.set(d,new Map());lines.get(d).set(rank,{best:pv[1],score:value,depth:d,rank});}
          }
          const best=line.match(/^bestmove (\S+)/);
          if(best){clearTimeout(timer);this.pending=null;
            if(!score||! /^[a-h][1-8][a-h][1-8][qrbn]?$/.test(best[1]))reject(Error('当前局面没有可分析走法'));
            else {const sets=[...lines.entries()].sort((a,b)=>b[0]-a[0]);const full=sets.find(([,v])=>v.size===(options.multiPV||1))||sets[0];resolve({best:best[1],score,depth,candidates:full?[...full[1].values()].sort((a,b)=>a.rank-b.rank):[]});}
          }
        }};
        this.worker.postMessage('setoption name MultiPV value '+(options.multiPV||1));
        this.worker.postMessage('setoption name Clear Hash');
        this.worker.postMessage('position fen '+fen);
        this.worker.postMessage('go depth 14 nodes 200000'+(move?' searchmoves '+move:''));
      });
    };
    const result=this.tail.then(task);this.tail=result.catch(()=>{});return result;
  }
}
globalThis.StockfishClient=StockfishClient;
globalThis.gradeMove=(best,played,same)=>{
  if(same)return {label:'最佳走法',loss:0};
  if(best.kind==='mate'||played.kind==='mate'){
    if(best.kind==='mate'&&best.value>0&&!(played.kind==='mate'&&played.value>0))return {label:'错失强制将杀',loss:null};
    if(played.kind==='mate'&&played.value<0&&!(best.kind==='mate'&&best.value<0))return {label:'严重失误 · 进入被将杀局面',loss:null};
    return {label:'将杀局面 · 不作分值评级',loss:null};
  }
  const loss=Math.max(0,best.value-played.value);
  return {label:loss<50?'不错':loss<100?'不精确':loss<200?'失误':'严重失误',loss};
};

// Variety among near-equal candidates at a common search depth; never random legal moves.
globalThis.chooseComputerMove=(analysis,random=Math.random)=>{
 const candidates=analysis.candidates||[];
 const best=candidates.find(c=>c.rank===1);
 if(!best||best.score.kind!=='cp')return analysis.best;
 const pool=candidates.filter(c=>c.score.kind==='cp'&&c.score.value>=best.score.value-65);
 if(!pool.length)return analysis.best;
 const weights=pool.map((c,i)=>Math.pow(.8,i));let target=random()*weights.reduce((a,b)=>a+b,0);
 for(let i=0;i<pool.length;i++){target-=weights[i];if(target<0)return pool[i].best;}
 return pool.at(-1).best;
};
