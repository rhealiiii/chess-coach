const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),{spawn}=require('node:child_process');
const root=require('node:path').resolve(__dirname,'..');
require(root+'/rules.js');require(root+'/engine-client.js');
const {fresh,legal,apply,fen,idx,coord,check}=ChessRules;
function perft(s,d){return d?legal(s).reduce((n,m)=>n+perft(apply(s,m),d-1),0):1;}
function move(s,u){const m=legal(s).find(m=>coord(m[0])+coord(m[1])+m[2]===u);assert(m,'Legal: '+u);return apply(s,m);}
assert.equal(perft(fresh(),1),20);assert.equal(perft(fresh(),2),400);assert.equal(perft(fresh(),3),8902);
let s=fresh();for(const u of ['f2f3','e7e5','g2g4','d8h4'])s=move(s,u);assert(check(s));assert.equal(legal(s).length,0);
s=fresh();for(const u of ['e2e4','a7a6','e4e5','d7d5'])s=move(s,u);s=move(s,'e5d6');assert.equal(s.b[idx('d5')],'.');
s=fresh();for(const u of ['e2e4','e7e5','g1f3','b8c6','f1c4','g8f6'])s=move(s,u);s=move(s,'e1g1');assert.equal(s.b[idx('f1')],'R');assert.equal(s.b[idx('h1')],'.');
assert.equal(gradeMove({kind:'cp',value:100},{kind:'cp',value:-120},false).label,'严重失误');
assert.equal(gradeMove({kind:'cp',value:0},{kind:'cp',value:20},false).loss,0);
assert.equal(gradeMove({kind:'mate',value:3},{kind:'cp',value:200},false).label,'错失强制将杀');
const options={best:'e7e5',candidates:[{best:'e7e5',score:{kind:'cp',value:10},rank:1},{best:'c7c5',score:{kind:'cp',value:0},rank:2},{best:'a7a5',score:{kind:'cp',value:-200},rank:3}]};assert.equal(chooseComputerMove(options,()=>0),'e7e5');assert.equal(chooseComputerMove(options,()=>.999),'c7c5');
console.log('PASS rules: perft 20/400/8902, mate, en passant, castling, grade thresholds');
// Run the exact bundled engine and browser UCI client over a Node process adapter.
const children=new Set();
class WorkerAdapter{
 constructor(){this.child=spawn(process.execPath,[root+'/engine/stockfish-19-lite-single.js']);children.add(this.child);let rest='';this.child.stdout.on('data',b=>{rest+=b;let i;while((i=rest.indexOf('\n'))>=0){const line=rest.slice(0,i).trim();rest=rest.slice(i+1);this.onmessage?.({data:line});}});this.child.on('error',e=>this.onerror?.(e));this.child.on('exit',()=>children.delete(this.child));}
 postMessage(s){this.child.stdin.write(s+'\n');}terminate(){this.child.kill();}
}
global.Worker=WorkerAdapter;global.document={baseURI:'http://localhost/'};
(async()=>{try{
 const client=new StockfishClient(),a=await client.evaluate(fen(fresh()));assert(legal(fresh()).some(m=>coord(m[0])+coord(m[1])+m[2]===a.best));assert(a.depth>0);
 const b=await client.evaluate(fen(fresh()),'f2f3');assert.equal(b.best,'f2f3');assert(b.score.kind==='cp');
 const multi=await client.evaluate(fen(move(fresh(),'e2e4')),null,null,{multiPV:4});assert.equal(multi.candidates.length,4);assert.equal(new Set(multi.candidates.map(c=>c.depth)).size,1);const chosen=chooseComputerMove(multi);assert(multi.candidates.some(c=>c.best===chosen));
 console.log('PASS bundled Stockfish: best',a.best,'depth',a.depth,'forced move',b.best);client.reset();
 const {JSDOM}=require(process.env.JSDOM_PATH||'jsdom');
 const dom=new JSDOM(fs.readFileSync(root+'/index.html','utf8'),{runScripts:'outside-only',url:'http://localhost/'}),w=dom.window;w.Worker=WorkerAdapter;
 w.HTMLDialogElement.prototype.showModal=function(){this.setAttribute('open','');};w.HTMLDialogElement.prototype.close=function(){this.removeAttribute('open');};
 for(const file of ['rules.js','engine-client.js','app.js'])w.eval(fs.readFileSync(root+'/'+file,'utf8'));
 const doc=w.document;assert.equal(doc.querySelectorAll('#board .sq').length,64);assert.equal(doc.querySelectorAll('#board .piece-svg').length,32);assert(doc.getElementById('review').disabled);assert.equal(doc.querySelectorAll('[data-route]').length,0);assert(!doc.getElementById('engine'));
 const click=q=>doc.querySelector('#board [data-square="'+q+'"]').click();click('b8');assert.equal(doc.querySelectorAll('#board .target').length,2);assert.match(doc.getElementById('status').textContent,/预览/);click('e2');assert.equal(doc.querySelectorAll('#board .target').length,2);click('e4');
 const deadline=Date.now()+60000;while(doc.getElementById('board').getAttribute('aria-busy')!=='false'&&Date.now()<deadline)await new Promise(r=>setTimeout(r,100));
 assert.match(doc.getElementById('turn').textContent,/轮到你/);assert(!doc.getElementById('review').disabled);assert.equal(doc.querySelectorAll('[data-route]').length,0);assert.equal(doc.getElementById('review-content').hidden,true);
 doc.getElementById('review').click();const reviewDeadline=Date.now()+60000;while(doc.getElementById('review-content').hidden&&Date.now()<reviewDeadline)await new Promise(r=>setTimeout(r,100));
 assert.equal(doc.getElementById('review-content').hidden,false);assert.match(doc.getElementById('review-played').textContent,/e2 → e4/);assert(doc.getElementById('review-knowledge').textContent.length>20);assert.equal(doc.querySelectorAll('#review-board .sq').length,64);assert.equal(doc.querySelectorAll('[data-route="last"]').length,1);
 doc.getElementById('coach-close').click();assert(!doc.getElementById('coach').open);doc.getElementById('undo').click();assert.equal(doc.getElementById('history').textContent,'尚未走棋');assert(doc.getElementById('review').disabled);
 // Reset while a real computer search is pending must discard the late reply.
 click('d2');click('d4');doc.getElementById('restart').click();await new Promise(r=>setTimeout(r,1500));assert.equal(doc.getElementById('history').textContent,'尚未走棋');assert.equal(doc.querySelectorAll('#board .piece-svg').length,32);
 doc.getElementById('view').value='b';doc.getElementById('view').dispatchEvent(new w.Event('change'));assert.equal(doc.querySelector('#board .sq').dataset.square,'h1');
 console.log('PASS UI: quiet play, both-color legal previews, automatic Black, opt-in retrospective, paired undo, reset cancellation, flip');
 dom.window.close();
 }finally{for(const c of children)c.kill();}})().catch(e=>{console.error(e);process.exitCode=1;});
