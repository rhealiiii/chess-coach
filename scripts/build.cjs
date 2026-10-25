const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');process.chdir(root);
fs.mkdirSync('engine',{recursive:true});
for(const file of ['stockfish-19-lite-single.js','stockfish-19-lite-single.wasm'])fs.copyFileSync(path.join('node_modules/stockfish/bin',file),path.join('engine',file));
fs.mkdirSync('_site/engine',{recursive:true});
for(const file of ['index.html','rules.js','engine-client.js','app.js','LICENSE'])fs.copyFileSync(file,path.join('_site',file));
for(const file of ['stockfish-19-lite-single.js','stockfish-19-lite-single.wasm','LICENSE'])fs.copyFileSync(path.join('engine',file),path.join('_site/engine',file));
fs.writeFileSync('_site/.nojekyll','');
// Content-based URLs prevent a new HTML page from mixing with cached old scripts.
const crypto=require('node:crypto');
let html=fs.readFileSync('_site/index.html','utf8');
for(const file of ['rules.js','engine-client.js','app.js']){
 const version=crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex').slice(0,12);
 html=html.replace('src="'+file+'"','src="'+file+'?v='+version+'"');
}
fs.writeFileSync('_site/index.html',html);
