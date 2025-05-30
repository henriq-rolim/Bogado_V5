# Automação Travian com Importação Manual de Cookies

Este projeto implementa uma automação para o jogo Travian que executa a função "Iniciar todas as listas de farms" automaticamente em intervalos aleatórios entre 4 e 6 minutos.

## Novidades desta versão

- **Importação Manual de Cookies**: Agora você pode importar os cookies do Travian diretamente do seu navegador
- **Sem Problemas de CAPTCHA**: Como você faz o login manualmente, não há problemas com CAPTCHA
- **Interface Melhorada**: Interface mais intuitiva e com feedback claro sobre o status da automação
- **Instruções Detalhadas**: Guia passo a passo para obter e importar os cookies

## Como Usar

1. **Faça o Deploy no Render.com**:
   - Crie uma conta no [Render.com](https://render.com/) (gratuito)
   - Clique em "New Web Service"
   - Conecte seu repositório GitHub ou use a opção "Deploy from public Git repository"
   - Insira a URL deste repositório
   - Configure o nome do serviço e escolha o plano gratuito
   - Clique em "Create Web Service"

2. **Importe os Cookies do Travian**:
   - Acesse a URL fornecida pelo Render
   - Siga as instruções detalhadas na interface para obter os cookies do Travian
   - Cole os cookies no campo de texto
   - Clique em "Importar Cookies"

3. **Inicie a Automação**:
   - Verifique se o status dos cookies está "Válido"
   - Clique no botão "Iniciar Automação"
   - A automação começará imediatamente e continuará em intervalos aleatórios entre 4 e 6 minutos

4. **Monitore e Controle**:
   - A interface mostra o status atual da automação
   - Você pode ver quando será a próxima execução
   - O registro de atividades mostra o que está acontecendo
   - Use o botão "Parar Automação" quando quiser interromper o processo

## Obtenção dos Cookies (Resumo)

### Método 1: Usando as Ferramentas de Desenvolvedor
1. Acesse o Travian e faça login normalmente
2. Pressione F12 para abrir as Ferramentas de Desenvolvedor
3. Vá para a aba "Application" (Chrome) ou "Storage" (Firefox)
4. Expanda "Cookies" e selecione o domínio do Travian
5. Copie todos os cookies (formato JSON)
6. Cole no campo de importação

### Método 2: Usando a Extensão Cookie-Editor (Mais Fácil)
1. Instale a extensão [Cookie-Editor](https://chrome.google.com/webstore/detail/cookie-editor/hlkenndednhfkekhgcdicdfddnkalmdm)
2. Acesse o Travian e faça login normalmente
3. Clique no ícone da extensão
4. Clique em "Export" e selecione "Export as JSON"
5. Cole no campo de importação

## Configurações Avançadas

Se você estiver executando em ambiente local ou quiser personalizar a aplicação, você pode configurar as seguintes variáveis de ambiente:

- `TRAVIAN_URL`: URL do servidor Travian (padrão: https://ts100.x10.america.travian.com)
- `PORT`: Porta do servidor (padrão: 3000)

## Executando Localmente

Para executar localmente:

1. Clone este repositório
2. Instale as dependências: `npm install`
3. Crie um arquivo `.env` baseado no `.env.example`
4. Inicie o servidor: `npm start`
5. Acesse `http://localhost:3000` no navegador

## Observações Importantes

- A automação funciona 100% na nuvem, não é necessário manter seu computador ligado
- Os cookies têm validade limitada. Se a automação parar de funcionar, importe os cookies novamente
- Esta aplicação é apenas para fins educacionais e de automação pessoal
- Use com responsabilidade e de acordo com os termos de serviço do Travian
