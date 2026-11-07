# Carteira de Identidade Pet — app separado

Projeto estático independente da página de vendas. Sem Supabase, login ou validação automática de pagamento.

## Apresentação e conquistas

Na primeira entrada, o tutor informa seu nome, escolhe a primeira missão e recebe o selo inicial. Nome e preferência ficam no localStorage deste navegador. A tela inicial calcula pontos por cadastro do pet, foto, primeiro download e backup, sem pontos repetidos por recarregar. O nome pode ser alterado em Configurações e é incluído no backup exportado. Limpar os dados do navegador apaga também a apresentação.

## Vercel

Importe este projeto em um repositório próprio. Framework Other, diretório raiz ./, comando de build vazio e saída . (configurado em vercel.json). O app abre na raiz do novo domínio.

## Entrega

Envie o endereço publicado como link de acesso ao comprador. Quem tiver o link consegue abrir. Cadastros e fotos ficam no navegador do tutor, com exportação de backup.

Os PDFs são gerados no navegador. A tag QR precisa ser gerada no endereço definitivo para abrir em outro celular. Cada QR contém uma cópia do contato autorizado; mudanças exigem uma nova tag.

Nenhuma variável de ambiente é necessária. Não colocar chaves ou credenciais no projeto.

O acesso pago por login e a sincronização entre dispositivos ficaram fora desta etapa por decisão do usuário em 07/11/2026.
