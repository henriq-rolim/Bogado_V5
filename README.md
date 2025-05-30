# Automação Travian para Render.com

Este projeto implementa uma automação para o jogo Travian que executa 100% na nuvem através do Render.com. A automação acessa o site do Travian, faz login com suas credenciais, navega até a página da lista de farms e clica no botão "Iniciar todas as listas de farms" automaticamente a cada 4-6 minutos.

## Características

- Interface web para controle da automação (iniciar/parar)
- Configuração de credenciais diretamente pela interface web
- Agendamento automático com variação aleatória entre 4-6 minutos
- Execução 100% na nuvem (seu computador não precisa ficar ligado)
- Compatível com o plano gratuito do Render.com

## Como usar

### 1. Deploy no Render.com

1. Crie uma conta no [Render.com](https://render.com/) (pode usar GitHub, Google ou email)
2. Faça upload deste projeto para um repositório GitHub público
3. No Render, clique em "New +" e selecione "Web Service"
4. Escolha "Connect a repository" e selecione seu repositório
5. Configure:
   - Runtime: `Node`
   - Build Command: `npm install`
   - Start Command: `npm start`
   - Plano: `Free`
6. Clique em "Create Web Service"
7. Aguarde o deploy (deve levar menos de 2 minutos)

### 2. Configuração e uso

1. Após o deploy, acesse a URL fornecida pelo Render
2. Na interface web, insira suas credenciais do Travian
3. Clique em "Salvar Credenciais"
4. Clique em "Iniciar Automação" para começar o processo
5. A automação executará imediatamente a primeira vez e depois continuará em intervalos aleatórios entre 4-6 minutos
6. Você pode parar a automação a qualquer momento clicando em "Parar Automação"

## Notas importantes

- No plano gratuito do Render.com, o serviço pode "adormecer" após períodos de inatividade
- Se isso acontecer, basta acessar a URL do seu serviço novamente para "acordá-lo"
- A automação continuará de onde parou
- As credenciais são salvas no servidor e não precisam ser inseridas novamente

## Arquivos do projeto

- `package.json`: Dependências e configurações do projeto
- `server.js`: Servidor Express e lógica de automação
- `index.html`: Interface web para controle da automação

## Tecnologias utilizadas

- Node.js
- Express
- Axios (para requisições HTTP)
- HTML/CSS/JavaScript (interface web)

## Suporte

Se precisar de ajuda ou tiver alguma dúvida, entre em contato.

---

Desenvolvido para automação do Travian - Versão 2.0
