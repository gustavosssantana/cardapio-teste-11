const crypto = require('node:crypto');
const {promisify} = require('node:util');
const scrypt = promisify(crypto.scrypt);
const attempts = new Map();
const COOKIE = '__Host-business-admin';
const fail = (status, message) => Object.assign(new Error(message), {status});
const safeEqual = (a,b) => {const x=Buffer.from(String(a)),y=Buffer.from(String(b));return x.length===y.length && crypto.timingSafeEqual(x,y);};
const envReady = () => ['CMS_PASSWORD_HASH','CMS_SESSION_SECRET','CMS_GITHUB_TOKEN'].every(k=>process.env[k]) && process.env.CMS_SESSION_SECRET.length>=32;
const sign = value => crypto.createHmac('sha256',process.env.CMS_SESSION_SECRET).update(value).digest('base64url');
function session(req){
  const raw=(req.headers.cookie||'').split(';').map(x=>x.trim()).find(x=>x.startsWith(COOKIE+'='))?.slice(COOKIE.length+1);
  if(!raw)return null;const [body,sig]=raw.split('.');if(!body||!sig||!safeEqual(sign(body),sig))return null;
  try{const v=JSON.parse(Buffer.from(body,'base64url').toString());return v.exp>Date.now()&&typeof v.csrf==='string'?v:null;}catch{return null;}
}
function validImage(value){return typeof value==='string'&&value.length<2048&&(/^(?:\/)?assets\/[a-zA-Z0-9_./-]+\.(?:webp|png|jpe?g|avif)$/i.test(value)&&!value.includes('..') || /^https:\/\/[^\s<>"'\\]+$/i.test(value));}
function validate(data){
  if(!data||data.version!==1||!Array.isArray(data.pages)||!Array.isArray(data.categories)||!Array.isArray(data.items)||!Array.isArray(data.promotions)||!Array.isArray(data.texts)||!Array.isArray(data.images)||!Array.isArray(data.galleries)||!Array.isArray(data.units))throw fail(422,'Conteúdo inválido.');
  if(JSON.stringify(data).length>650000)throw fail(422,'O conteúdo excedeu o limite permitido.');
  const walk=(value)=>{if(value&&typeof value==='object'){for(const [k,v] of Object.entries(value)){if(['__proto__','constructor','prototype'].includes(k))throw fail(422,'Campo inválido.');walk(v);}}else if(typeof value==='string'&&value.length>12000)throw fail(422,'Um dos textos está muito longo.');};walk(data);
  for(const name of ['pages','categories','items','promotions','texts','images','galleries','units']){
    if(data[name].length>(name==='items'?1500:500))throw fail(422,'Há registros demais.');
    const ids=new Set();for(const row of data[name]){if(!row.id||!/^[a-zA-Z0-9_-]{1,100}$/.test(row.id)||ids.has(row.id))throw fail(422,'Identificadores inválidos ou repetidos.');ids.add(row.id);}
  }
  const cats=new Set(data.categories.map(c=>c.id));
  if(!data.seo||!Array.isArray(data.seo.paragraphs)||!Array.isArray(data.seo.faq)||!Array.isArray(data.seo.terms)||typeof data.seo.heading!=='string'||typeof data.baseUrl!=='string'||!/^https:\/\/[a-z0-9.-]+$/.test(data.baseUrl)||typeof data.name!=='string')throw fail(422,'Confira os dados de busca e a identificação do site.');
  for(const faq of data.seo.faq)if(typeof faq.question!=='string'||typeof faq.answer!=='string')throw fail(422,'Pergunta ou resposta inválida.');
  for(const cat of data.categories)if(typeof cat.name!=='string'||!cat.name.trim()||(cat.unitId&&!data.units.some(u=>u.id===cat.unitId)))throw fail(422,'Categoria ou unidade inválida.');
  for(const row of data.texts)if(typeof row.value!=='string'||typeof row.original!=='string')throw fail(422,'Texto inválido.');
  for(const page of data.pages)if(typeof page.title!=='string'||typeof page.description!=='string'||!['home','menu','unit'].includes(page.kind))throw fail(422,'Confira os títulos e descrições das páginas.');
  for(const item of data.items){if(typeof item.name!=='string'||!item.name.trim()||!cats.has(item.categoryId)||item.price===''||item.price===null||!Number.isFinite(Number(item.price))||Number(item.price)<0||Number(item.price)>100000)throw fail(422,'Confira nome, categoria e preço dos produtos.');if(item.image&&!validImage(item.image))throw fail(422,'Imagem de produto inválida.');}
  for(const row of data.images){if(row.src&&!validImage(row.src))throw fail(422,'Endereço de imagem inválido.');}
  for(const row of data.promotions){if(!row.title?.trim())throw fail(422,'Informe o nome da promoção.');if(row.price!==''&&row.price!==null&&row.price!==undefined&&(!Number.isFinite(Number(row.price))||Number(row.price)<0))throw fail(422,'Preço de promoção inválido.');if(row.image&&!validImage(row.image))throw fail(422,'Imagem de promoção inválida.');for(const k of ['start','end'])if(row[k]&&!/^\d{4}-\d{2}-\d{2}$/.test(row[k]))throw fail(422,'Data inválida.');if(row.start&&row.end&&row.start>row.end)throw fail(422,'A data final deve ser posterior à inicial.');}
  for(const gallery of data.galleries){if(!Array.isArray(gallery.photos)||gallery.photos.length!==3)throw fail(422,'Cada galeria deve ter três fotos.');for(const photo of gallery.photos)if(!validImage(photo.src))throw fail(422,'Imagem da galeria inválida.');}
  for(const page of data.pages)if(!/^(?:index\.html|cardapio\/index\.html|unidades\/[a-z-]+\/index\.html)$/.test(page.path))throw fail(422,'Página inválida.');
  for(const unit of data.units){for(const key of ['mapsUrl','instagram'])if(unit[key]&&!/^https:\/\/[^\s<>"']+$/.test(unit[key]))throw fail(422,'Link da unidade inválido.');if(unit.phone&&!/^\+?[0-9 ()-]{6,25}$/.test(unit.phone))throw fail(422,'Telefone inválido.');}
  for(const unit of data.units)if(unit.whatsapp&&!/^\d{10,15}$/.test(unit.whatsapp))throw fail(422,'Confira o WhatsApp público.');
  for(const cat of data.categories)if(cat.image&&!validImage(cat.image))throw fail(422,'Imagem de categoria inválida.');
  for(const p of data.promotions)if(p.productId&&!data.items.some(i=>i.id===p.productId))throw fail(422,'Produto da promoção não encontrado.');
  return data;
}
function onlyMenu(current,incoming){return validate({...current,categories:incoming.categories.map(c=>({...c,unitId:'bonfiglioli'})),items:incoming.items,promotions:incoming.promotions});}

async function github(config,path,method='GET',body){
  const res=await fetch('https://api.github.com/repos/'+config.repository+'/'+path,{method,headers:{Authorization:'Bearer '+process.env.CMS_GITHUB_TOKEN,Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28','Content-Type':'application/json'},body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(20000)});
  if(res.status===404)return null;
  if(!res.ok)throw fail(res.status===409?409:502,res.status===409?'Outra pessoa alterou o conteúdo. Recarregue antes de publicar.':'Não foi possível salvar no serviço de publicação.');
  return res.status===204?{}:res.json();
}
async function read(config,path){const f=await github(config,'contents/'+path+'?ref='+encodeURIComponent(config.branch));return f?{sha:f.sha,data:JSON.parse(Buffer.from(f.content,'base64').toString('utf8'))}:null;}
async function put(config,path,content,message,sha){return github(config,'contents/'+path,'PUT',{message,branch:config.branch,content:Buffer.from(content).toString('base64'),...(sha?{sha}:{})});}
async function bodyOf(req){if(req.body!==undefined){if(typeof req.body==='string'){if(req.body.length>3000000)throw fail(413,'Arquivo muito grande.');try{return JSON.parse(req.body);}catch{throw fail(400,'Solicitação inválida.');}}return req.body;}let body='';for await(const chunk of req){body+=chunk;if(body.length>3000000)throw fail(413,'Arquivo muito grande.');}try{return JSON.parse(body||'{}');}catch{throw fail(400,'Solicitação inválida.');}}
function makeHandler(config){return async(req,res)=>{
  res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Content-Type','application/json; charset=utf-8');
  const send=(status,value)=>{res.statusCode=status;res.end(JSON.stringify(value));};
  try{
    const action=new URL(req.url,'https://'+config.host).searchParams.get('action')||'session';
    if(action==='status'&&req.method==='GET')return send(200,{configured:envReady(),brand:config.name});
    if(!envReady())return send(503,{error:'O painel está protegido e aguarda ativação pelo responsável.',setupRequired:true});
    const state=session(req);
    if(req.method!=='GET'){
      if(req.headers.origin!=='https://'+config.host)throw fail(403,'Origem não autorizada.');
      if(!String(req.headers['content-type']||'').startsWith('application/json'))throw fail(415,'Formato inválido.');
    }
    if(action==='login'&&req.method==='POST'){
      const ip=String(req.headers['x-forwarded-for']||req.socket?.remoteAddress||'unknown').split(',')[0];const now=Date.now();let a=attempts.get(ip);if(!a||a.until<now)a={count:0,until:now+15*60000};if(a.count>=5)throw fail(429,'Muitas tentativas. Aguarde 15 minutos.');a.count++;attempts.set(ip,a);if(attempts.size>2000)for(const [k,v]of attempts)if(v.until<now)attempts.delete(k);
      const input=await bodyOf(req);if(typeof input.password!=='string'||input.password.length>256)throw fail(401,'Usuário ou senha incorretos.');
      const [scheme,salt,hash]=process.env.CMS_PASSWORD_HASH.split('$');if(scheme!=='scrypt'||!/^[a-f0-9]{32}$/.test(salt)||!/^[a-f0-9]{128}$/.test(hash))throw fail(503,'A configuração de acesso precisa ser concluída.');
      const derived=(await scrypt(input.password,salt,64)).toString('hex');if(!safeEqual(derived,hash)||!safeEqual(input.username||'',process.env.CMS_USERNAME||'admin'))throw fail(401,'Usuário ou senha incorretos.');attempts.delete(ip);
      const value={exp:Date.now()+8*3600000,csrf:crypto.randomBytes(24).toString('hex')};const encoded=Buffer.from(JSON.stringify(value)).toString('base64url');res.setHeader('Set-Cookie',COOKIE+'='+encoded+'.'+sign(encoded)+'; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=28800');return send(200,{authenticated:true,csrf:value.csrf});
    }
    if(!state)throw fail(401,'Entre no painel para continuar.');
    if(req.method!=='GET'&&!safeEqual(req.headers['x-csrf-token']||'',state.csrf))throw fail(403,'Sessão inválida. Entre novamente.');
    if(action==='session'&&req.method==='GET')return send(200,{authenticated:true,csrf:state.csrf,brand:config.name});
    if(action==='logout'&&req.method==='POST'){res.setHeader('Set-Cookie',COOKIE+'=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0');return send(200,{ok:true});}
    if(action==='content'&&req.method==='GET'){const current=await read(config,'content/cms.json'),draft=await read(config,'cms/draft.json');if(!current)throw fail(404,'Conteúdo não encontrado.');return send(200,{...current,draft:draft?.data?.baseSha===current.sha?draft.data.data:null});}
    if(['publish','draft'].includes(action)&&req.method==='POST'){
      const input=await bodyOf(req);let data=validate(input.data);const current=await read(config,'content/cms.json');if(input.sha!==current?.sha)throw fail(409,'O site foi alterado por outro acesso. Recarregue para não sobrescrever as alterações.');
      data=onlyMenu(current.data,data);data.revision=crypto.randomUUID();data.updatedAt=new Date().toISOString();
      const path=action==='draft'?'cms/draft.json':'content/cms.json';const target=action==='draft'?await read(config,path):current;
      const saved=await put(config,path,JSON.stringify(action==='draft'?{baseSha:current.sha,savedAt:data.updatedAt,data}:data,null,2)+'\n',action==='draft'?'Salvar rascunho pelo painel':'Publicar alterações pelo painel',target?.sha);
      return send(200,{ok:true,revision:data.revision,sha:action==='draft'?current.sha:saved.content.sha,commit:saved.commit.sha,publishing:action==='publish'});
    }
    if(action==='upload'&&req.method==='POST'){
      const input=await bodyOf(req);if(typeof input.base64!=='string'||input.base64.length>2800000)throw fail(413,'Use uma imagem de até 2 MB.');const bytes=Buffer.from(input.base64,'base64');if(bytes.length>2000000||bytes.length<20)throw fail(422,'Arquivo inválido.');
      const ext=bytes[0]===0xff&&bytes[1]===0xd8?'jpg':bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))?'png':bytes.toString('ascii',0,4)==='RIFF'&&bytes.toString('ascii',8,12)==='WEBP'?'webp':null;if(!ext)throw fail(422,'Envie uma foto JPG, PNG ou WebP.');
      const path='assets/uploads/'+crypto.createHash('sha256').update(bytes).digest('hex').slice(0,32)+'.'+ext;const exists=await github(config,'contents/'+path+'?ref='+config.branch);if(!exists)await put(config,path,bytes,'Enviar foto pelo painel');return send(200,{ok:true,path:'/'+path,publishing:!exists});
    }
    if(action==='history'&&req.method==='GET'){const list=await github(config,'commits?path=content/cms.json&sha='+config.branch+'&per_page=12');return send(200,(list||[]).map(c=>({sha:c.sha,date:c.commit.committer.date,message:c.commit.message})));}
    if(action==='restore'&&req.method==='POST'){
      const input=await bodyOf(req);if(!/^[a-f0-9]{40}$/.test(input.commit||''))throw fail(422,'Versão inválida.');const f=await github(config,'contents/content/cms.json?ref='+input.commit);if(!f)throw fail(404,'Versão não encontrada.');let data=validate(JSON.parse(Buffer.from(f.content,'base64').toString()));const current=await read(config,'content/cms.json');if(input.sha!==current.sha)throw fail(409,'Recarregue o conteúdo antes de restaurar.');data=onlyMenu(current.data,data);data.revision=crypto.randomUUID();data.updatedAt=new Date().toISOString();const saved=await put(config,'content/cms.json',JSON.stringify(data,null,2)+'\n','Restaurar versão pelo painel',current.sha);return send(200,{ok:true,sha:saved.content.sha,revision:data.revision,publishing:true});
    }
    throw fail(405,'Ação não disponível.');
  }catch(error){send(error.status||500,{error:error.status?error.message:'Não foi possível concluir. Tente novamente.'});}
};}
module.exports={makeHandler,validate,validImage,onlyMenu};
