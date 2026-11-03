# Segurança e privacidade do cardápio

Revisão técnica: 3 de novembro de 2026. Escopo: este repositório e o painel `/admin/`. Não é certificação, parecer jurídico nem promessa de ausência de vulnerabilidades.

## Controles verificados

- Senha com scrypt e comparação em tempo constante; mensagens genéricas de login.
- Sessão assinada, validade absoluta de 2 horas, cookie Secure/HttpOnly/SameSite=Strict, vinculada à versão da senha.
- Origem exata, CSRF, recusa de chamadas cross-site, métodos restritos e respostas sem cache.
- Validação de tipos, IDs, preços, tamanho, profundidade e campos permitidos. Sem edição de arquivos arbitrários pelo painel.
- Fotos somente em assets locais, validação de tipo e limite de 2 MB no servidor; envio pelo navegador elimina metadados ao recodificar em WebP. SVG e URLs externas são recusados.
- Conteúdo escapado ao gerar HTML/JavaScript. Não há iframe de prévia nem bibliotecas externas no painel; fonte Manrope distribuída localmente com licença OFL.
- Limite adicional na função: 5 tentativas por chave derivada do IP em 15 minutos, orçamento de 64 por instância no período e até 4 operações de senha simultâneas. As chaves na memória são HMAC, sem guardar o IP bruto no mapa. Limites de função não são distribuídos e reiniciam em cold starts.
- Firewall Vercel: regra específica `/api/cms` AND query `action=login`, 10 requisições por IP/600 segundos, resposta 429; verificar o registro de implantação da regra na conta.
- Conteúdo é versionado no GitHub privado; segredos apenas nas variáveis de produção, sem exposição no navegador ou testes.

## Testes autorizados e seguros

Execute `npm test` e `npm run build`. Os testes de ataque usam credenciais fictícias e chamadas diretas ao handler em memória: não disparam tentativas contra GitHub, Google, Vercel ou usuários. Cobrem bloqueio de senha, cookie, sessão adulterada/vencida/rotacionada, escrita sem login, CSRF, origem, método, payload malformado ou excessivo, poluição de protótipo, XSS, URLs de rastreio e imagens inválidas. Não substituem pentest independente.

## Dados e armazenamento identificados

No painel, o cookie `__Host-business-admin` autentica por até duas horas. O armazenamento local `center-chic-menu-guide-v1` guarda somente que o guia já foi exibido; limpar os dados do navegador faz o guia reaparecer. Não há analytics, publicidade ou cookies de marketing inseridos pelo painel.

O cardápio público usa `cc-lista` localmente para a comanda, com validade lógica de 12 horas (não é garantia de remoção física sem novo acesso). O cardápio público original ainda solicita fontes ao Google Fonts, e o link de mapa leva ao Google ao ser aberto. O painel passou a usar fonte local. Vercel e GitHub podem tratar dados técnicos conforme os próprios contratos/políticas; a retenção efetiva da hospedagem não foi auditada.

## Referências brasileiras consultadas

- LGPD, Lei 13.709/2018: princípios e minimização (art. 6), bases legais conforme finalidade (art. 7), transparência (art. 9), direitos (art. 18), transferências internacionais (arts. 33 e seguintes), registro das operações (art. 37), segurança (arts. 46–49) e comunicação de incidentes (art. 48). Texto atualizado: https://www2.camara.leg.br/legin/fed/lei/2018/lei-13709-14-agosto-2018-787077-normaatualizada-pl.html
- Guia ANPD de cookies: diferenciar armazenamento necessário, preferências e rastreamento; consentimento não é uma caixa genérica que resolve todo tratamento. https://www.gov.br/anpd/pt-br/centrais-de-conteudo/materiais-educativos-e-publicacoes/guia_orientativo_cookies_e_protecao_de_dados_pessoais
- Marco Civil, Lei 12.965/2014, em especial arts. 7, 10, 15 e 16: avaliar com o responsável a aplicação da obrigação de registros de acesso por seis meses, sob sigilo. O painel não implementa nem declara cumprir essa retenção. https://www.planalto.gov.br/ccivil_03/_ato2011-2014/2014/lei/l12965.htm
- Resolução CD/ANPD 15/2024: comunicação quando o incidente puder acarretar risco ou dano relevante, prazos e exceções aplicáveis. https://www.gov.br/anpd/pt-br/canais_atendimento/agente-de-tratamento/comunicado-de-incidente-de-seguranca-cis

Não foi criada política pública com razão social ou contato fictício: o responsável optou por não fornecer esses dados. Bases legais, identidade do controlador, canal de direitos, contratos com operadores, transferência internacional, retenção e enquadramento jurídico continuam decisões do negócio. Não existe atestado de “todas as leis atendidas” gerado por código.

## Limitações e operação

Não há MFA nem contas individuais; a senha é compartilhada entre os responsáveis. A sessão agora exige um registro ativo no servidor, consultado em toda ação autenticada. Sair revoga esse registro antes de apagar o cookie: cópias do cookie deixam de autorizar também em outras instâncias. O registro privado cms/auth-sessions.json contém somente SHA-256 de IDs aleatórios e vencimento, até 10 sessões; não contém cookie, senha, CSRF ou IP. Se o serviço de registro falha, o acesso é recusado. Há nova dependência de disponibilidade e cota da API do GitHub. Registros vencidos são filtrados e removidos na próxima atualização; o histórico privado do Git mantém versões antigas de hashes inutilizáveis, não sessões utilizáveis. Alterações só desse arquivo pulam a compilação e os testes de push; o arquivo nunca é copiado para public/. Em suspeita de invasão, rotacionar CMS_SESSION_SECRET e a senha na Vercel, invalidando as sessões, e revisar o histórico de publicações. Renovar o token GitHub antes de 01/02/2027.

Em incidente: preservar evidências com acesso restrito, impedir novas alterações, revogar credenciais comprometidas, verificar conteúdo e histórico, restaurar versão íntegra e avaliar com o controlador a comunicação à ANPD/titulares conforme risco e regras aplicáveis. Não publicar senhas, cookies, IPs ou dados de clientes em issues.

Verificações adicionais: reutilização do cookie após logout em nova instância, falha fechada do registro, ausência de credenciais no registro e preservação de logins concorrentes. As sessões antigas anteriores a esta versão precisam de novo login.
