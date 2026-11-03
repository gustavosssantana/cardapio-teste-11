# Card�pio digital Center Chic

Projeto de https://cardapio.vercel.app/ � preserva os 193 produtos, 17 categorias, fotos e a comanda local do card�pio original.

## Administra��o

Abra `/admin/`. O usu�rio � `admin`; a senha � entregue ao respons�vel e n�o fica no reposit�rio.

O painel permite editar produtos, pre�os, descri��es, fotos, categorias, ordem, disponibilidade e destaques. Promo��es podem ser ligadas a um produto: durante o per�odo definido, o valor promocional � aplicado tamb�m � comanda. Sem produto vinculado, a promo��o � um aviso geral.

Salve um rascunho para continuar depois ou clique em Publicar altera��es e confirme. Aguarde a mensagem de publica��o conclu�da. O hist�rico permite recuperar vers�es anteriores do card�pio. As imagens s�o otimizadas no envio; JPG, PNG e WebP s�o aceitos.

## Publica��o

`npm run build` prepara `public/`. A Vercel usa essa pasta e a fun��o `/api/cms`.
O conte�do fica em `content/cms.json`. O rascunho fica em `cms/draft.json` e nunca � publicado como arquivo p�blico. As 194 imagens originais foram extra�das do HTML sem altera��o dos bytes e s�o carregadas sob demanda.

Os segredos `CMS_GITHUB_TOKEN`, `CMS_PASSWORD_HASH` e `CMS_SESSION_SECRET` ficam somente nas vari�veis sens�veis de produ��o da Vercel. A chave do GitHub tem acesso somente a este reposit�rio, Contents read/write e Metadata read. Sua validade termina em 01/02/2027; renove antes dessa data para continuar salvando edi��es.

`npm test` verifica preserva��o de pre�os, fotos e identificadores da comanda, limita as altera��es ao card�pio e confere as promo��es e a confirma��o de publica��o. O c�digo usa scrypt, cookies HttpOnly/Secure/SameSite Strict, checagem de origem e CSRF, valida��o de arquivos e conflito de vers�es. O limite de tentativas de login � por inst�ncia; para limite global use o Firewall da Vercel conforme o plano.

A administra��o � somente deste card�pio digital. Os sites institucionais da Center Chic e da Tomaniks n�o fazem parte deste painel.

## Revis�o de seguran�a

Consulte [SECURITY.md](SECURITY.md) para testes, controles, limites e refer�ncias brasileiras. A pr�via simplificada foi removida; use o rascunho e publique ap�s conferir os campos. Fonte e �cones do painel s�o locais.
