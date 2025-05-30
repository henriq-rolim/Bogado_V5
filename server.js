// server.js - Servidor Express e automação do Travian
require('dotenv').config();
const express = require('express');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const tough = require('tough-cookie');

const app = express();
const PORT = process.env.PORT || 3000;
const CREDENTIALS_FILE = path.join(__dirname, 'credentials.json');
const TRAVIAN_URL = 'https://ts100.x10.america.travian.com';

// Variáveis de controle
let isRunning = false;
let nextRunTimeout = null;
let nextRunTime = null;

// Middleware
app.use(express.json( ));
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// Funções de utilidade
function loadCredentials() {
  try {
    if (fs.existsSync(CREDENTIALS_FILE)) {
      return JSON.parse(fs.readFileSync(CREDENTIALS_FILE, 'utf8'));
    }
  } catch (error) {
    console.error('Erro ao carregar credenciais:', error);
  }
  return null;
}

function saveCredentials(username, password) {
  try {
    fs.writeFileSync(CREDENTIALS_FILE, JSON.stringify({ username, password }));
    return true;
  } catch (error) {
    console.error('Erro ao salvar credenciais:', error);
    return false;
  }
}

function getRandomDelay(minMinutes, maxMinutes) {
  const minMs = minMinutes * 60 * 1000;
  const maxMs = maxMinutes * 60 * 1000;
  return Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
}

// Função principal de automação
async function runAutomation() {
  const credentials = loadCredentials();
  if (!credentials || !credentials.username || !credentials.password) {
    console.error('Credenciais não configuradas');
    return;
  }
  
  console.log(`[${new Date().toISOString()}] Iniciando automação do Travian`);
  console.log(`Usando credenciais para usuário: ${credentials.username}`);
  
  try {
    // Criar sessão com cookies persistentes
    const cookieJar = new tough.CookieJar();
    const session = axios.create({
      withCredentials: true,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
        'Connection': 'keep-alive'
      }
    });
    
    // Passo 1: Acessar a página inicial para obter cookies iniciais
    console.log('Acessando página inicial');
    const homePage = await session.get(TRAVIAN_URL);
    console.log(`Status da página inicial: ${homePage.status}`);
    
    // Passo 2: Acessar a página de login
    console.log('Acessando página de login');
    const loginPage = await session.get(`${TRAVIAN_URL}/login.php`);
    console.log(`Status da página de login: ${loginPage.status}`);
    
    // Passo 3: Extrair possíveis tokens ou campos ocultos do formulário
    const loginHtml = loginPage.data;
    console.log('Analisando formulário de login...');
    
    // Procurar por campos ocultos no formulário
    const hiddenFields = {};
    const hiddenMatches = loginHtml.match(/<input type="hidden" name="([^"]+)" value="([^"]+)">/g);
    
    if (hiddenMatches) {
      hiddenMatches.forEach(match => {
        const nameMatch = match.match(/name="([^"]+)"/);
        const valueMatch = match.match(/value="([^"]+)"/);
        if (nameMatch && valueMatch) {
          hiddenFields[nameMatch[1]] = valueMatch[1];
          console.log(`Campo oculto encontrado: ${nameMatch[1]} = ${valueMatch[1]}`);
        }
      });
    }
    
    // Passo 4: Preparar dados do formulário de login
    const loginForm = new URLSearchParams();
    
    // Adicionar campos ocultos
    Object.keys(hiddenFields).forEach(key => {
      loginForm.append(key, hiddenFields[key]);
    });
    
    // Adicionar credenciais
    loginForm.append('name', credentials.username);
    loginForm.append('password', credentials.password);
    loginForm.append('s1', 'Entrar');
    loginForm.append('w', '1920:1080');
    loginForm.append('login', '1');
    
    // Passo 5: Enviar formulário de login
    console.log('Enviando credenciais');
    const loginResponse = await session.post(`${TRAVIAN_URL}/dorf1.php`, loginForm, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Origin': TRAVIAN_URL,
        'Referer': `${TRAVIAN_URL}/login.php`
      },
      maxRedirects: 5
    });
    
    console.log(`Status da resposta de login: ${loginResponse.status}`);
    
    // Passo 6: Verificar se login foi bem-sucedido
    const responseHtml = loginResponse.data;
    const loginSuccess = responseHtml.includes('dorf1') || 
                         responseHtml.includes('Recursos') || 
                         responseHtml.includes('stockBarWarehouse') ||
                         responseHtml.includes('villageNameField') ||
                         responseHtml.includes('playerName');
    
    if (loginSuccess) {
      console.log('Login bem-sucedido!');
      
      // Passo 7: Acessar página da lista de farms
      console.log('Acessando página da lista de farms');
      const farmListPage = await session.get(`${TRAVIAN_URL}/build.php?gid=16&tt=99`, {
        headers: {
          'Referer': `${TRAVIAN_URL}/dorf1.php`
        }
      });
      
      console.log(`Status da página de farms: ${farmListPage.status}`);
      const farmHtml = farmListPage.data;
      
      // Passo 8: Procurar token para iniciar listas de farms
      console.log('Procurando token para iniciar listas de farms...');
      
      // Tentar diferentes padrões de token
      let tokenMatch = farmHtml.match(/name="([a-f0-9]{32})" value="1"/);
      if (!tokenMatch) {
        tokenMatch = farmHtml.match(/name="([a-f0-9]{32})"/);
      }
      
      // Procurar por botão de iniciar todas as listas
      const hasStartAllButton = farmHtml.includes('startAllRaids') || 
                               farmHtml.includes('Iniciar todas as listas') ||
                               farmHtml.includes('Start all');
      
      if (tokenMatch && tokenMatch[1]) {
        const token = tokenMatch[1];
        console.log(`Token encontrado: ${token}`);
        
        // Passo 9: Enviar requisição para iniciar todas as listas
        console.log('Iniciando todas as listas de farms');
        const farmForm = new URLSearchParams();
        farmForm.append(token, '1');
        farmForm.append('startAllRaids', '1');
        
        const farmResponse = await session.post(`${TRAVIAN_URL}/build.php?gid=16&tt=99`, farmForm, {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Referer': `${TRAVIAN_URL}/build.php?gid=16&tt=99`
          }
        });
        
        console.log(`Status da resposta de farms: ${farmResponse.status}`);
        console.log('Listas de farms iniciadas com sucesso');
      } else if (hasStartAllButton) {
        console.log('Botão de iniciar todas as listas encontrado, mas não foi possível extrair o token');
        console.log('Tentando método alternativo...');
        
        // Tentar encontrar o formulário completo
        const formMatch = farmHtml.match(/<form[^>]*action="[^"]*"[^>]*>([\s\S]*?)<\/form>/i);
        if (formMatch) {
          console.log('Formulário encontrado, tentando extrair todos os campos');
          
          // Extrair todos os campos do formulário
          const formInputs = {};
          const inputMatches = formMatch[1].match(/<input[^>]*>/g);
          
          if (inputMatches) {
            inputMatches.forEach(input => {
              const nameMatch = input.match(/name="([^"]+)"/);
              const valueMatch = input.match(/value="([^"]*)"/);
              if (nameMatch) {
                formInputs[nameMatch[1]] = valueMatch ? valueMatch[1] : '';
              }
            });
            
            // Adicionar campo startAllRaids
            formInputs['startAllRaids'] = '1';
            
            // Criar formulário com todos os campos
            const alternativeFarmForm = new URLSearchParams();
            Object.keys(formInputs).forEach(key => {
              alternativeFarmForm.append(key, formInputs[key]);
            });
            
            // Enviar formulário
            const altFarmResponse = await session.post(`${TRAVIAN_URL}/build.php?gid=16&tt=99`, alternativeFarmForm, {
              headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Referer': `${TRAVIAN_URL}/build.php?gid=16&tt=99`
              }
            });
            
            console.log(`Status da resposta alternativa: ${altFarmResponse.status}`);
            console.log('Tentativa alternativa de iniciar listas de farms concluída');
          }
        }
      } else {
        console.log('Botão de iniciar todas as listas não encontrado. Verifique se você tem listas de farms configuradas.');
        console.log('Salvando HTML da página para análise...');
        // Aqui você poderia salvar o HTML para análise posterior
      }
    } else {
      console.error('Falha no login. Verifique suas credenciais.');
      
      // Verificar possíveis mensagens de erro
      if (responseHtml.includes('senha incorreta') || 
          responseHtml.includes('incorrect password') ||
          responseHtml.includes('falha na autenticação')) {
        console.error('Senha incorreta detectada na resposta.');
      }
      
      // Verificar se há captcha
      if (responseHtml.includes('captcha') || 
          responseHtml.includes('recaptcha') ||
          responseHtml.includes('g-recaptcha')) {
        console.error('CAPTCHA detectado! A automação não pode continuar sem intervenção humana.');
      }
    }
  } catch (error) {
    console.error('Erro durante a automação:', error.message);
    if (error.response) {
      console.error(`Status do erro: ${error.response.status}`);
    }
  }
  
  console.log(`[${new Date().toISOString()}] Automação finalizada`);
  
  // Agendar próxima execução se ainda estiver rodando
  if (isRunning) {
    scheduleNextRun();
  }
}

// Função para agendar a próxima execução
function scheduleNextRun() {
  if (!isRunning) return;
  
  // Cancelar timeout existente se houver
  if (nextRunTimeout) {
    clearTimeout(nextRunTimeout);
  }
  
  // Gerar tempo aleatório entre 4-6 minutos
  const delay = getRandomDelay(4, 6);
  nextRunTime = new Date(Date.now() + delay);
  
  console.log(`--------------------------------------------------`);
  console.log(`Próxima execução agendada para: ${nextRunTime.toISOString()}`);
  console.log(`Aguardando ${Math.round(delay / 60000)} minutos (${delay} ms)...`);
  console.log(`--------------------------------------------------`);
  
  nextRunTimeout = setTimeout(runAutomation, delay);
}

// Rotas da API
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/api/status', (req, res) => {
  const credentials = loadCredentials();
  const hasCredentials = !!(credentials && credentials.username && credentials.password);
  
  res.json({
    isRunning,
    nextRunTime: nextRunTime ? nextRunTime.toISOString() : null,
    timeRemaining: nextRunTime ? Math.max(0, nextRunTime - Date.now()) : null,
    hasCredentials,
    username: hasCredentials ? credentials.username : null
  });
});

app.post('/api/credentials', (req, res) => {
  const { username, password } = req.body;
  
  if (!username || !password) {
    return res.json({
      success: false,
      message: 'Usuário e senha são obrigatórios.'
    });
  }
  
  const saved = saveCredentials(username, password);
  
  if (saved) {
    return res.json({
      success: true,
      message: 'Credenciais salvas com sucesso!',
      status: {
        isRunning,
        nextRunTime: nextRunTime ? nextRunTime.toISOString() : null,
        hasCredentials: true,
        username
      }
    });
  } else {
    return res.json({
      success: false,
      message: 'Erro ao salvar credenciais. Tente novamente.'
    });
  }
});

app.post('/api/start', (req, res) => {
  const credentials = loadCredentials();
  if (!credentials || !credentials.username || !credentials.password) {
    return res.json({
      success: false,
      message: 'Credenciais não configuradas. Configure o usuário e senha primeiro.',
      status: {
        isRunning: false,
        hasCredentials: false
      }
    });
  }
  
  if (isRunning) {
    return res.json({
      success: false,
      message: 'A automação já está em execução.'
    });
  }
  
  isRunning = true;
  console.log('Automação iniciada pelo usuário.');
  
  // Executar imediatamente
  runAutomation();
  
  return res.json({
    success: true,
    message: 'Automação iniciada com sucesso!',
    status: {
      isRunning: true,
      nextRunTime: nextRunTime ? nextRunTime.toISOString() : null,
      hasCredentials: true,
      username: credentials.username
    }
  });
});

app.post('/api/stop', (req, res) => {
  if (!isRunning) {
    return res.json({
      success: false,
      message: 'A automação já está parada.'
    });
  }
  
  isRunning = false;
  
  // Cancelar próxima execução agendada
  if (nextRunTimeout) {
    clearTimeout(nextRunTimeout);
    nextRunTimeout = null;
  }
  
  nextRunTime = null;
  console.log('Automação parada pelo usuário.');
  
  return res.json({
    success: true,
    message: 'Automação parada com sucesso!',
    status: {
      isRunning: false,
      nextRunTime: null,
      hasCredentials: true
    }
  });
});

// Iniciar servidor
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Servidor rodando na porta ${PORT}`);
  console.log('Para acessar a interface de controle, abra o navegador no endereço acima.');
  console.log('A automação está inicialmente PARADA. Use a interface web para iniciá-la.');
});
