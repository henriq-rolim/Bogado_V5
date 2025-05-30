# Automação de Lista de Farms do Travian com Playwright e Railway

Este projeto automatiza o processo de iniciar todas as listas de farms no jogo Travian (ts100.x10.america.travian.com) usando Node.js, Playwright e Browserless.io, projetado para ser facilmente hospedado na plataforma Railway.

## Funcionalidades

*   Faz login na sua conta Travian.
*   Navega até a página do Rally Point (Farm List).
*   Clica no botão "Iniciar todas as listas de farms".
*   Roda automaticamente em intervalos aleatórios entre 4 e 6 minutos.
*   **Interface web para controle** com botões Start/Stop para iniciar e parar a automação.
*   Utiliza Browserless.io para executar o Playwright na nuvem.
*   Configuração fácil via variáveis de ambiente.
*   Pronto para deploy no Railway.

## Pré-requisitos

*   Conta no [Travian](https://ts100.x10.america.travian.com)
*   Conta no [Browserless.io](https://www.browserless.io/) (plano gratuito ou pago para obter um token de API)
*   Conta no [Railway.app](https://railway.app/)
*   Git instalado (para clonar)
*   Node.js e npm (apenas se quiser rodar localmente para testes)

## Configuração e Deploy no Railway

1.  **Clone o Repositório:**
    ```bash
    # Substitua <url-do-seu-repositorio> pela URL do repo onde você hospedará este código
    git clone <url-do-seu-repositorio>
    cd travian-automation 
    ```
    *(Nota: Você precisará primeiro colocar este projeto em um repositório Git como GitHub, GitLab, etc.)*

2.  **Crie o arquivo `.env`:**
    Copie o arquivo de exemplo `.env.example` para um novo arquivo chamado `.env`:
    ```bash
    cp .env.example .env
    ```
    Edite o arquivo `.env` e preencha com suas credenciais:
    ```dotenv
    TRAVIAN_USER="seu_usuario_travian"
    TRAVIAN_PASS="sua_senha_travian"
    BROWSERLESS_TOKEN="seu_token_browserless"
    ```

3.  **Deploy no Railway:**
    *   Vá para o seu dashboard no [Railway.app](https://railway.app/).
    *   Clique em "New Project".
    *   Escolha "Deploy from GitHub repo" (ou a opção correspondente ao seu provedor Git).
    *   Selecione o repositório que você criou/clonou.
    *   O Railway detectará automaticamente o `railway.json` e o `package.json` para configurar o build e o deploy.
    *   **Importante:** Vá até a aba "Variables" do seu serviço no Railway.
    *   Adicione as mesmas variáveis de ambiente que você colocou no seu arquivo `.env` local:
        *   `TRAVIAN_USER`
        *   `TRAVIAN_PASS`
        *   `BROWSERLESS_TOKEN`
    *   O Railway fará o build e iniciará o serviço automaticamente usando `npm start`.

4.  **Acessando a Interface de Controle:**
    *   Após o deploy, o Railway fornecerá uma URL para seu serviço (algo como `https://seu-projeto.up.railway.app`).
    *   Acesse essa URL em seu navegador para abrir a interface de controle.
    *   Use os botões "Iniciar Automação" e "Parar Automação" para controlar o loop de automação.
    *   A interface mostrará o status atual, tempo para próxima execução e um registro de atividades.

## Interface de Controle

A interface web permite:

*   **Iniciar a automação** - Começa o loop de automação, executando imediatamente a primeira vez
*   **Parar a automação** - Interrompe o loop (não executa mais até que seja iniciado novamente)
*   **Visualizar status** - Mostra se está rodando ou parado
*   **Acompanhar próxima execução** - Exibe quando será a próxima execução e contagem regressiva
*   **Ver registro de atividades** - Mostra um log das ações realizadas

## Rodando Localmente (Opcional)

1.  Certifique-se de ter Node.js e npm instalados.
2.  Clone o repositório (se ainda não o fez).
3.  Navegue até a pasta do projeto: `cd travian-automation`
4.  Instale as dependências: `npm install`
5.  Crie e preencha o arquivo `.env` conforme descrito na seção de deploy.
6.  Execute o script: `npm start`
7.  Acesse `http://localhost:3000` em seu navegador para abrir a interface de controle.

## Estrutura do Projeto

*   `server.js`: Ponto de entrada principal, configura o servidor Express e rotas da API.
*   `automation.js`: Contém a lógica de automação do Travian usando Playwright.
*   `views/index.html`: Interface web para controle da automação.
*   `package.json`: Define as dependências do projeto e o script `start`.
*   `.env.example`: Arquivo de exemplo para as variáveis de ambiente.
*   `railway.json`: Arquivo de configuração para o deploy no Railway.
*   `README.md`: Este arquivo.

## Notas

*   **Seletores:** Os seletores CSS/Playwright usados (`input[name="name"]`, `div:has-text(...)`, etc.) podem mudar se o Travian atualizar sua interface. Pode ser necessário ajustá-los no `automation.js` se a automação parar de funcionar.
*   **Detecção:** Travian pode ter mecanismos anti-bot. Embora Playwright e Browserless sejam robustos, use esta automação por sua conta e risco. A variação no tempo de execução ajuda a mitigar a detecção, mas não é uma garantia.
*   **Browserless Token:** Mantenha seu token do Browserless seguro e não o compartilhe publicamente.
*   **Controle de Acesso:** A interface web não possui autenticação. Se você precisar de segurança adicional, considere adicionar uma camada de autenticação básica ou limitar o acesso via Railway.
