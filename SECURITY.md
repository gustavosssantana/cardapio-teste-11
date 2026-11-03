# Seguran�a e privacidade do card�pio

Revis�o t�cnica: 3 de novembro de 2026. Escopo: este reposit�rio e o painel `/admin/`. N�o � certifica��o, parecer jur�dico nem promessa de aus�ncia de vulnerabilidades.

## Controles verificados

- Senha com scrypt e compara��o em tempo constante; mensagens gen�ricas de login.
- Sess�o assinada, validade absoluta de 2 horas, cookie Secure/HttpOnly/SameSite=Strict, vinculada � vers�o da senha.
- Origem exata, CSRF, recusa de chamadas cross-site, m�todos restritos e respostas sem cache.
- Valida��o de tipos, IDs, pre�os, tamanho, profundidade e campos permitidos. Sem edi��o de arquivos arbitr�rios pelo painel.
- Fotos somente em assets locais, valida��o de tipo e limite de 2 MB no servidor; envio pelo navegador elimina metadados ao recodificar em WebP. SVG e URLs externas s�o recusados.
- Conte�do escapado ao gerar HTML/JavaScript. N�o h� iframe de pr�via nem bibliotecas externas no painel; fonte Manrope distribu�da localmente com licen�a OFL.
- Limite adicional na fun��o: 5 tentativas por chave derivada do IP em 15 minutos, or�amento de 64 por inst�ncia no per�odo e at� 4 opera��es de senha simult�neas. As chaves na mem�ria s�o HMAC, sem guardar o IP bruto no mapa. Limites de fun��o n�o s�o distribu�dos e reiniciam em cold starts.
- Firewall Vercel: regra espec�fica `/api/cms` AND query `action=login`, 10 requisi��es por IP/600 segundos, resposta 429; verificar o registro de implanta��o da regra na conta.
- Conte�do � versionado no GitHub privado; segredos apenas nas vari�veis de produ��o, sem exposi��o no navegador ou testes.

## Testes autorizados e seguros

Execute `npm test` e `npm run build`. Os testes de ataque usam credenciais fict�cias e chamadas diretas ao handler em mem�ria: n�o disparam tentativas contra GitHub, Google, Vercel ou usu�rios. Cobrem bloqueio de senha, cookie, sess�o adulterada/vencida/rotacionada, escrita sem login, CSRF, origem, m�todo, payload malformado ou excessivo, polui��o de prot�tipo, XSS, URLs de rastreio e imagens inv�lidas. N�o substituem pentest independente.

## Dados e armazenamento identificados

No painel, o cookie `__Host-business-admin` autentica por at� duas horas. O armazenamento local `center-chic-menu-guide-v1` guarda somente que o guia j� foi exibido; limpar os dados do navegador faz o guia reaparecer. N�o h� analytics, publicidade ou cookies de marketing inseridos pelo painel.

O card�pio p�blico usa `cc-lista` localmente para a comanda, com validade l�gica de 12 horas (n�o � garantia de remo��o f�sica sem novo acesso). O card�pio p�blico original ainda solicita fontes ao Google Fonts, e o link de mapa leva ao Google ao ser aberto. O painel passou a usar fonte local. Vercel e GitHub podem tratar dados t�cnicos conforme os pr�prios contratos/pol�ticas; a reten��o efetiva da hospedagem n�o foi auditada.

## Refer�ncias brasileiras consultadas

- LGPD, Lei 13.709/2018: princ�pios e minimiza��o (art. 6), bases legais conforme finalidade (art. 7), transpar�ncia (art. 9), direitos (art. 18), transfer�ncias internacionais (arts. 33 e seguintes), registro das opera��es (art. 37), seguran�a (arts. 46�49) e comunica��o de incidentes (art. 48). Texto atualizado: https://www2.camara.leg.br/legin/fed/lei/2018/lei-13709-14-agosto-2018-787077-normaatualizada-pl.html
- Guia ANPD de cookies: diferenciar armazenamento necess�rio, prefer�ncias e rastreamento; consentimento n�o � uma caixa gen�rica que resolve todo tratamento. https://www.gov.br/anpd/pt-br/centrais-de-conteudo/materiais-educativos-e-publicacoes/guia_orientativo_cookies_e_protecao_de_dados_pessoais
- Marco Civil, Lei 12.965/2014, em especial arts. 7, 10, 15 e 16: avaliar com o respons�vel a aplica��o da obriga��o de registros de acesso por seis meses, sob sigilo. O painel n�o implementa nem declara cumprir essa reten��o. https://www.planalto.gov.br/ccivil_03/_ato2011-2014/2014/lei/l12965.htm
- Resolu��o CD/ANPD 15/2024: comunica��o quando o incidente puder acarretar risco ou dano relevante, prazos e exce��es aplic�veis. https://www.gov.br/anpd/pt-br/canais_atendimento/agente-de-tratamento/comunicado-de-incidente-de-seguranca-cis

N�o foi criada pol�tica p�blica com raz�o social ou contato fict�cio: o respons�vel optou por n�o fornecer esses dados. Bases legais, identidade do controlador, canal de direitos, contratos com operadores, transfer�ncia internacional, reten��o e enquadramento jur�dico continuam decis�es do neg�cio. N�o existe atestado de �todas as leis atendidas� gerado por c�digo.

## Limita��es e opera��o

N�o h� MFA nem contas individuais; a senha � compartilhada entre os respons�veis. Sair apaga o cookie no navegador; uma c�pia j� roubada do cookie assinado pode durar at� o vencimento, pois n�o existe lista distribu�da de revoga��o. N�o afirmar que logout revoga c�pias em todos os servidores. Em suspeita de invas�o, rotacionar CMS_SESSION_SECRET e a senha na Vercel, invalidando as sess�es, e revisar o hist�rico de publica��es. Renovar o token GitHub antes de 01/02/2027.

Em incidente: preservar evid�ncias com acesso restrito, impedir novas altera��es, revogar credenciais comprometidas, verificar conte�do e hist�rico, restaurar vers�o �ntegra e avaliar com o controlador a comunica��o � ANPD/titulares conforme risco e regras aplic�veis. N�o publicar senhas, cookies, IPs ou dados de clientes em issues.
