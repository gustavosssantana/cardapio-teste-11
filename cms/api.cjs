const crypto = require('node:crypto');
const {promisify} = require('node:util');
const scrypt = promisify(crypto.scrypt);
const attempts = new Map();
let loginWindow={count:0,until:0},activeLogins=0;
const SESSION_MS=2*3600000;
const credentialVersion=()=>crypto.createHash('sha256').update(process.env.CMS_PASSWORD_HASH||'').digest('hex');
const COOKIE = '__Host-business-admin';
const fail = (status, message) => Object.assign(new Error(message), {status});
const safeEqual = (a,b) => {const x=Buffer.from(String(a)),y=Buffer.from(String(b));return x.length===y.length && crypto.timingSafeEqual(x,y);};
const envReady = () => ['CMS_PASSWORD_HASH','CMS_SESSION_SECRET','CMS_GITHUB_TOKEN'].every(k=>process.env[k]) && process.env.CMS_SESSION_SECRET.length>=32;
const sign = value => crypto.createHmac('sha256',process.env.CMS_SESSION_SECRET).update(value).digest('base64url');
function session(req){
  const raw=(req.headers.cookie||'').split(';').map(x=>x.trim()).find(x=>x.startsWith(COOKIE+'='))?.slice(COOKIE.length+1);
  if(!raw||raw.length>1024)return null;const parts=raw.split('.');if(parts.length!==2)return null;const [body,sig]=parts;if(!body||!sig||!safeEqual(sign(body),sig))return null;
  try{const v=JSON.parse(Buffer.from(body,'base64url').toString());return Number.isFinite(v.exp)&&v.exp>Date.now()&&v.exp<=Date.now()+SESSION_MS&&/^[a-f0-9]{48}$/.test(v.csrf||'')&&safeEqual(v.version||'',credentialVersion())?v:null;}catch{return null;}
}
function validImage(value){return typeof value==='string'&&value.length<2048&&/^(?:\/)?assets\/[a-zA-Z0-9_./-]+\.(?:webp|png|jpe?g|avif)$/i.test(value)&&!value.includes('..');}
function objectBody(v){if(!v||typeof v!=='object'||Array.isArray(v))throw fail(400,'Solicita��o inv�lida.');return v;}
function validate(data){
  if(!data||typeof data!=='object'||Array.isArray(data)||data.version!==1||!Array.isArray(data.pages)||!Array.isArray(data.categories)||!Array.isArray(data.items)||!Array.isArray(data.promotions)||!Array.isArray(data.texts)||!Array.isArray(data.images)||!Array.isArray(data.galleries)||!Array.isArray(data.units))throw fail(422,'Conte�do inv�lido.');
  if(JSON.stringify(data).length>650000)throw fail(422,'O conte�do excedeu o limite permitido.');
  let nodes=0;const walk=(value,depth=0)=>{if(depth>12||++nodes>30000)throw fail(422,'Conte�do muito complexo.');if(value&&typeof value==='object'){for(const [k,v] of Object.entries(value)){if(['__proto__','constructor','prototype'].includes(k))throw fail(422,'Campo inv�lido.');walk(v,depth+1);}}else if(typeof value==='string'&&value.length>12000)throw fail(422,'Um dos textos est� muito longo.');};walk(data);
  for(const name of ['pages','categories','items','promotions','texts','images','galleries','units']){
    if(data[name].length>(name==='items'?1500:500))throw fail(422,'H� registros demais.');
    const ids=new Set();for(const row of data[name]){if(!row||typeof row!=='object'||Array.isArray(row))throw fail(422,'Registro inv�lido.');if(!row.id||!/^[a-zA-Z0-9_-]{1,100}$/.test(row.id)||ids.has(row.id))throw fail(422,'Identificadores inv�lidos ou repetidos.');ids.add(row.id);}
  }
  const cats=new Set(data.categories.map(c=>c.id));
  for(const name of ['categories','items','promotions'])for(const row of data[name]){for(const key of ['available','featured','active'])if(row[key]!==undefined&&typeof row[key]!=='boolean')throw fail(422,'Op��o inv�lida.');if(row.order!==undefined&&(!Number.isSafeInteger(row.order)||row.order<0||row.order>100000))throw fail(422,'Posi��o inv�lida.');for(const key of ['name','title'])if(row[key]!==undefined&&(typeof row[key]!=='string'||row[key].length>200))throw fail(422,'Nome muito longo ou inv�lido.');for(const key of ['description','note','group'])if(row[key]!==undefined&&typeof row[key]!=='string')throw fail(422,'Texto inv�lido.');}
  if(!data.seo||!Array.isArray(data.seo.paragraphs)||!Array.isArray(data.seo.faq)||!Array.isArray(data.seo.terms)||typeof data.seo.heading!=='string'||typeof data.baseUrl!=='string'||!/^https:\/\/[a-z0-9.-]+$/.test(data.baseUrl)||typeof data.name!=='string')throw fail(422,'Confira os dados de busca e a identifica��o do site.');
  for(const faq of data.seo.faq)if(typeof faq.question!=='string'||typeof faq.answer!=='string')throw fail(422,'Pergunta ou resposta inv�lida.');
  for(const cat of data.categories)if(typeof cat.name!=='string'||!cat.name.trim()||(cat.unitId&&!data.units.some(u=>u.id===cat.unitId)))throw fail(422,'Categoria ou unidade inv�lida.');
  for(const row of data.texts)if(typeof row.value!=='string'||typeof row.original!=='string')throw fail(422,'Texto inv�lido.');
  for(const page of data.pages)if(typeof page.title!=='string'||typeof page.description!=='string'||!['home','menu','unit'].includes(page.kind))throw fail(422,'Confira os t�tulos e descri��es das p�ginas.');
  for(const item of data.items){if(typeof item.name!=='string'||!item.name.trim()||!cats.has(item.categoryId)||item.price===''||item.price===null||!Number.isFinite(Number(item.price))||Number(item.price)<0||Number(item.price)>100000)throw fail(422,'Confira nome, categoria e pre�o dos produtos.');if(item.image&&!validImage(item.image))throw fail(422,'Imagem de produto inv�lida.');}
  for(const row of data.images){if(row.src&&!validImage(row.src))throw fail(422,'Endere�o de imagem inv�lido.');}
  for(const row of data.promotions){if(!row.title?.trim())throw fail(422,'Informe o nome da promo��o.');if(row.price!==''&&row.price!==null&&row.price!==undefined&&(!Number.isFinite(Number(row.price))||Number(row.price)<0))throw fail(422,'Pre�o de promo��o inv�lido.');if(row.image&&!validImage(row.image))throw fail(422,'Imagem de promo��o inv�lida.');for(const k of ['start','end'])if(row[k]&&!/^\d{4}-\d{2}-\d{2}$/.test(row[k]))throw fail(422,'Data inv�lida.');if(row.start&&row.end&&row.start>row.end)throw fail(422,'A data final deve ser posterior � inicial.');}
  for(const gallery of data.galleries){if(!Array.isArray(gallery.photos)||gallery.photos.length!==3)throw fail(422,'Cada galeria deve ter tr�s fotos.');for(const photo of gallery.photos)if(!validImage(photo.src))throw fail(422,'Imagem da galeria inv�lida.');}
  for(const page of data.pages)if(!/^(?:index\.html|cardapio\/index\.html|unidades\/[a-z-]+\/index\.html)$/.test(page.path))throw fail(422,'P�gina inv�lida.');
  for(const unit of data.units){for(const key of ['mapsUrl','instagram'])if(unit[key]&&!/^https:\/\/[^\s<>"']+$/.test(unit[key]))throw fail(422,'Link da unidade inv�lido.');if(unit.phone&&!/^\+?[0-9 ()-]{6,25}$/.test(unit.phone))throw fail(422,'Telefone inv�lido.');}
  for(const unit of data.units)if(unit.whatsapp&&!/^\d{10,15}$/.test(unit.whatsapp))throw fail(422,'Confira o WhatsApp p�blico.');
  for(const cat of data.categories)if(cat.image&&!validImage(cat.image))throw fail(422,'Imagem de categoria inv�lida.');
  for(const p of data.promotions)if(p.productId&&!data.items.some(i=>i.id===p.productId))throw fail(422,'Produto da promo��o n�o encontrado.');
  return data;
}
function onlyMenu(current,incoming){const pick=(r,keys)=>Object.fromEntries(keys.filter(k=>Object.hasOwn(r,k)).map(k=>[k,r[k]]));return validate({...current,categories:incoming.categories.map(c=>({...pick(c,['id','name','note','image','order','available']),unitId:'bonfiglioli'})),items:incoming.items.map(i=>pick(i,['id','name','categoryId','price','priceUnit','description','group','image','order','available','featured'])),promotions:incoming.promotions.map(p=>pick(p,['id','title','productId','description','price','image','start','end','active']))});}

async function github(config,path,method='GET',body){
  const res=await fetch('https://api.github.com/repos/'+config.repository+'/'+path,{method,headers:{Authorization:'Bearer '+process.env.CMS_GITHUB_TOKEN,Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28','Content-Type':'application/json'},body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(20000)});
  if(res.status===404)return null;
  if(!res.ok)throw fail(res.status===409?409:502,res.status===409?'Outra pessoa alterou o conte�do. Recarregue antes de publicar.':'N�o foi poss�vel salvar no servi�o de publica��o.');
  return res.status===204?{}:res.json();
}
async function read(config,path){const f=await github(config,'contents/'+path+'?ref='+encodeURIComponent(config.branch));return f?{sha:f.sha,data:JSON.parse(Buffer.from(f.content,'base64').toString('utf8'))}:null;}
async function put(config,path,content,message,sha){return github(config,'contents/'+path,'PUT',{message,branch:config.branch,content:Buffer.from(content).toString('base64'),...(sha?{sha}:{})});}
async function bodyOf(req){if(req.body!==undefined){if(JSON.stringify(req.body).length>3000000)throw fail(413,'Arquivo muito grande.');if(typeof req.body==='string'){if(req.body.length>3000000)throw fail(413,'Arquivo muito grande.');try{return objectBody(JSON.parse(req.body));}catch{throw fail(400,'Solicita��o inv�lida.');}}return objectBody(req.body);}let body='';for await(const chunk of req){body+=chunk;if(body.length>3000000)throw fail(413,'Arquivo muito grande.');}try{return objectBody(JSON.parse(body||'{}'));}catch{throw fail(400,'Solicita��o inv�lida.');}}
function makeHandler(config){return async(req,res)=>{
  res.setHeader('Cache-Control','no-store');res.setHeader('Referrer-Policy','no-referrer');res.setHeader('X-Frame-Options','DENY');res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Content-Type','application/json; charset=utf-8');
  const send=(status,value)=>{res.statusCode=status;res.end(JSON.stringify(value));};
  try{
    if(!['GET','POST'].includes(req.method))throw fail(405,'M�todo n�o permitido.');
    if(req.headers['sec-fetch-site']==='cross-site')throw fail(403,'Origem n�o autorizada.');
    const action=new URL(req.url,'https://'+config.host).searchParams.get('action')||'session';
    if(action==='status'&&req.method==='GET')return send(200,{configured:envReady(),brand:config.name});
    if(!envReady())return send(503,{error:'O painel est� protegido e aguarda ativa��o pelo respons�vel.',setupRequired:true});
    const state=session(req);
    if(req.method!=='GET'){
      if(req.headers.origin!=='https://'+config.host)throw fail(403,'Origem n�o autorizada.');
      if(!String(req.headers['content-type']||'').startsWith('application/json'))throw fail(415,'Formato inv�lido.');
    }
    if(action==='login'&&req.method==='POST'){
      const rawIp=String(req.headers['x-vercel-forwarded-for']||req.headers['x-forwarded-for']||req.socket?.remoteAddress||'unknown').split(',')[0].trim();const ip=crypto.createHmac('sha256',process.env.CMS_SESSION_SECRET).update(rawIp).digest('hex');const now=Date.now();
      for(const [k,v]of attempts)if(v.until<=now)attempts.delete(k);
      if(loginWindow.until<=now)loginWindow={count:0,until:now+15*60000};
      let a=attempts.get(ip);if(!a)a={count:0,until:now+15*60000};
      if(a.count>=5||loginWindow.count>=64||activeLogins>=4||(!attempts.has(ip)&&attempts.size>=2000)){res.setHeader('Retry-After','900');throw fail(429,'Muitas tentativas. Aguarde 15 minutos.');}
      a.count++;loginWindow.count++;attempts.set(ip,a);
      const input=await bodyOf(req);if(typeof input.username!=='string'||input.username.length>100||typeof input.password!=='string'||input.password.length>256)throw fail(401,'Usu�rio ou senha incorretos.');
      const [scheme,salt,hash]=process.env.CMS_PASSWORD_HASH.split('$');if(scheme!=='scrypt'||!/^[a-f0-9]{32}$/.test(salt)||!/^[a-f0-9]{128}$/.test(hash))throw fail(503,'A configura��o de acesso precisa ser conclu�da.');
      let derived;activeLogins++;try{derived=(await scrypt(input.password,salt,64)).toString('hex');}finally{activeLogins--;}if(!safeEqual(derived,hash)||!safeEqual(input.username||'',process.env.CMS_USERNAME||'admin'))throw fail(401,'Usu�rio ou senha incorretos.');attempts.delete(ip);
      const value={version:credentialVersion(),exp:Date.now()+SESSION_MS,csrf:crypto.randomBytes(24).toString('hex')};const encoded=Buffer.from(JSON.stringify(value)).toString('base64url');res.setHeader('Set-Cookie',COOKIE+'='+encoded+'.'+sign(encoded)+'; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=7200');return send(200,{authenticated:true,csrf:value.csrf});
    }
    if(!state)throw fail(401,'Entre no painel para continuar.');
    if(req.method!=='GET'&&!safeEqual(req.headers['x-csrf-token']||'',state.csrf))throw fail(403,'Sess�o inv�lida. Entre novamente.');
    if(action==='session'&&req.method==='GET')return send(200,{authenticated:true,csrf:state.csrf,brand:config.name});
    if(action==='logout'&&req.method==='POST'){res.setHeader('Set-Cookie',COOKIE+'=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0');return send(200,{ok:true});}
    if(action==='content'&&req.method==='GET'){const current=await read(config,'content/cms.json'),draft=await read(config,'cms/draft.json');if(!current)throw fail(404,'Conte�do n�o encontrado.');return send(200,{...current,draft:draft?.data?.baseSha===current.sha?draft.data.data:null});}
    if(['publish','draft'].includes(action)&&req.method==='POST'){
      const input=await bodyOf(req);let data=validate(input.data);const current=await read(config,'content/cms.json');if(input.sha!==current?.sha)throw fail(409,'O site foi alterado por outro acesso. Recarregue para n�o sobrescrever as altera��es.');
      data=onlyMenu(current.data,data);data.revision=crypto.randomUUID();data.updatedAt=new Date().toISOString();
      const path=action==='draft'?'cms/draft.json':'content/cms.json';const target=action==='draft'?await read(config,path):current;
      const saved=await put(config,path,JSON.stringify(action==='draft'?{baseSha:current.sha,savedAt:data.updatedAt,data}:data,null,2)+'\n',action==='draft'?'Salvar rascunho pelo painel':'Publicar altera��es pelo painel',target?.sha);
      return send(200,{ok:true,revision:data.revision,sha:action==='draft'?current.sha:saved.content.sha,commit:saved.commit.sha,publishing:action==='publish'});
    }
    if(action==='upload'&&req.method==='POST'){
      const input=await bodyOf(req);if(typeof input.base64!=='string'||input.base64.length>2800000)throw fail(413,'Use uma imagem de at� 2 MB.');const bytes=Buffer.from(input.base64,'base64');if(bytes.length>2000000||bytes.length<20)throw fail(422,'Arquivo inv�lido.');
      const ext=bytes[0]===0xff&&bytes[1]===0xd8?'jpg':bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))?'png':bytes.toString('ascii',0,4)==='RIFF'&&bytes.toString('ascii',8,12)==='WEBP'?'webp':null;if(!ext)throw fail(422,'Envie uma foto JPG, PNG ou WebP.');
      const path='assets/uploads/'+crypto.createHash('sha256').update(bytes).digest('hex').slice(0,32)+'.'+ext;const exists=await github(config,'contents/'+path+'?ref='+config.branch);if(!exists)await put(config,path,bytes,'Enviar foto pelo painel');return send(200,{ok:true,path:'/'+path,publishing:!exists});
    }
    if(action==='history'&&req.method==='GET'){const list=await github(config,'commits?path=content/cms.json&sha='+config.branch+'&per_page=12');return send(200,(list||[]).map(c=>({sha:c.sha,date:c.commit.committer.date,message:c.commit.message})));}
    if(action==='restore'&&req.method==='POST'){
      const input=await bodyOf(req);if(!/^[a-f0-9]{40}$/.test(input.commit||''))throw fail(422,'Vers�o inv�lida.');const f=await github(config,'contents/content/cms.json?ref='+input.commit);if(!f)throw fail(404,'Vers�o n�o encontrada.');let data=validate(JSON.parse(Buffer.from(f.content,'base64').toString()));const current=await read(config,'content/cms.json');if(input.sha!==current.sha)throw fail(409,'Recarregue o conte�do antes de restaurar.');data=onlyMenu(current.data,data);data.revision=crypto.randomUUID();data.updatedAt=new Date().toISOString();const saved=await put(config,'content/cms.json',JSON.stringify(data,null,2)+'\n','Restaurar vers�o pelo painel',current.sha);return send(200,{ok:true,sha:saved.content.sha,revision:data.revision,publishing:true});
    }
    throw fail(405,'A��o n�o dispon�vel.');
  }catch(error){send(error.status||500,{error:error.status?error.message:'N�o foi poss�vel concluir. Tente novamente.'});}
};}
module.exports={makeHandler,validate,validImage,onlyMenu,session};
