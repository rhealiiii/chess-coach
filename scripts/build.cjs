const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');process.chdir(root);
fs.mkdirSync('engine',{recursive:true});
for(const file of ['stockfish-19-lite-single.js','stockfish-19-lite-single.wasm'])fs.copyFileSync(path.join('node_modules/stockfish/bin',file),path.join('engine',file));
fs.mkdirSync('_site/engine',{recursive:true});
for(const file of ['index.html','rules.js','engine-client.js','app.js','LICENSE'])fs.copyFileSync(file,path.join('_site',file));
for(const file of ['stockfish-19-lite-single.js','stockfish-19-lite-single.wasm','LICENSE'])fs.copyFileSync(path.join('engine',file),path.join('_site/engine',file));
fs.writeFileSync('_site/.nojekyll','');
