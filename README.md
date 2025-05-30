# Automação Travian com Login Manual

Este projeto implementa uma automação para o jogo Travian que executa a função "Iniciar todas as listas de farms" automaticamente em intervalos aleatórios entre 4 e 6 minutos.

## Novidades desta versão

- **Login Manual via Pop-up**: Agora você pode fazer login diretamente pelo site do Travian através da nossa aplicação
- **Captura Automática de Cookies**: Após o login bem-sucedido, os cookies são capturados e salvos automaticamente
- **Sem Problemas de CAPTCHA**: Como você faz o login manualmente, não há problemas com CAPTCHA
- **Interface Melhorada**: Interface mais intuitiva e com feedback claro sobre o status da automação

## Como Usar

1. **Faça o Deploy no Render.com**:
   - Crie uma conta no [Render.com](https://render.com/) (gratuito)
   - Clique em "New Web Service"
   - Conecte seu repositório GitHub ou use a opção "Deploy from public Git repository"
   - Insira a URL deste repositório
   - Configure o nome do serviço e escolha o plano gratuito
   - Clique em "Create Web Service"

2. **Faça Login no Travian**:
   - Após o deploy, acesse a URL fornecida pelo Render
   - Clique no botão "Fazer Login no Travian"
   - Uma nova janela será aberta com o site do Travian
   - Faça login normalmente com suas credenciais
   - Após o login bem-sucedido, os cookies serão capturados automaticamente
   - A janela mostrará uma mensagem de sucesso e você poderá fechá-la

3. **Inicie a Automação**:
   - Volte para a página principal
   - Verifique se o status dos cookies está "Válido"
   - Clique no botão "Iniciar Automação"
   - A automação começará imediatamente e continuará em intervalos aleatórios entre 4 e 6 minutos

4. **Monitore e Controle**:
   - A interface mostra o status atual da automação
   - Você pode ver quando será a próxima execução
   - O registro de atividades mostra o que está acontecendo
   - Use o botão "Parar Automação" quando quiser interromper o processo

## Configurações Avançadas

Se você estiver executando em ambiente local ou quiser personalizar a aplicação, você pode configurar as seguintes variáveis de ambiente:

- `TRAVIAN_URL`: URL do servidor Travian (padrão: https://ts100.x10.america.travian.com)
- `BROWSERLESS_TOKEN`: Token do Browserless.io (opcional, para ambiente de produção)
- `PORT`: Porta do servidor (padrão: 3000)
- `RENDER`: Define se está em ambiente de produção (true/false)

## Executando Localmente

Para executar localmente:

1. Clone este repositório
2. Instale as dependências: `npm install`
3. Crie um arquivo `.env` baseado no `.env.example`
4. Inicie o servidor: `npm start`
5. Acesse `http://localhost:3000` no navegador

## Observações Importantes

- A automação funciona 100% na nuvem, não é necessário manter seu computador ligado
- Os cookies têm validade limitada. Se a automação parar de funcionar, faça login novamente
- Esta aplicação é apenas para fins educacionais e de automação pessoal
- Use com responsabilidade e de acordo com os termos de serviço do Travian
