# Cardápio digital Center Chic

Projeto de https://cardapio.vercel.app/ — preserva os 193 produtos, 17 categorias, fotos e a comanda local do cardápio original.

## Administração

Abra `/admin/`. O usuário é `admin`; a senha é entregue ao responsável e não fica no repositório.

O painel permite editar produtos, preços, descrições, fotos, categorias, ordem, disponibilidade e destaques. Promoções podem ser ligadas a um produto: durante o período definido, o valor promocional é aplicado também à comanda. Sem produto vinculado, a promoção é um aviso geral.

Salve um rascunho para continuar depois ou clique em Publicar alterações e confirme. Aguarde a mensagem de publicação concluída. O histórico permite recuperar versões anteriores do cardápio. As imagens são otimizadas no envio; JPG, PNG e WebP são aceitos.

## Publicação

`npm run build` prepara `public/`. A Vercel usa essa pasta e a função `/api/cms`.
O conteúdo fica em `content/cms.json`. O rascunho fica em `cms/draft.json` e nunca é publicado como arquivo público. As 194 imagens originais foram extraídas do HTML sem alteração dos bytes e são carregadas sob demanda.

Os segredos `CMS_GITHUB_TOKEN`, `CMS_PASSWORD_HASH` e `CMS_SESSION_SECRET` ficam somente nas variáveis sensíveis de produção da Vercel. A chave do GitHub tem acesso somente a este repositório, Contents read/write e Metadata read. Sua validade termina em 01/02/2027; renove antes dessa data para continuar salvando edições.

`npm test` verifica preservação de preços, fotos e identificadores da comanda, limita as alterações ao cardápio e confere as promoções e a confirmação de publicação. O código usa scrypt, cookies HttpOnly/Secure/SameSite Strict, checagem de origem e CSRF, validação de arquivos e conflito de versões. O limite de tentativas de login é por instância; para limite global use o Firewall da Vercel conforme o plano.

A administração é somente deste cardápio digital. Os sites institucionais da Center Chic e da Tomaniks não fazem parte deste painel.
