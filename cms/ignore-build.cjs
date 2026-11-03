// Session registry is private server state and must not trigger site builds.
const {execFileSync}=require('node:child_process');
try{const files=execFileSync('git',['diff','--name-only','HEAD^','HEAD'],{encoding:'utf8'}).trim().split('\n').filter(Boolean);process.exit(files.length>0&&files.every(p=>p==='cms/auth-sessions.json')?0:1);}catch{process.exit(1);}
