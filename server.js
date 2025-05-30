// server.js - Servidor Express e automação do Travian
require('dotenv').config();
const express = require('express');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const CREDENTIALS_FILE = path.join(__dirname, 'credentials.json');
const TRAVIAN_URL = 'https://ts100.x10.america.travian.com';

// Variáveis de controle
let isRunning = false;
let nextRunTimeout = null;
let nextRunTime = null;

// Middleware
app.use(express.json());
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
  
  try {
    // Criar sessão com cookies
    const session = axios.create({
      withCredentials: true,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });
    
    // Obter página de login para cookies iniciais
    console.log('Acessando página de login');
    const loginPage = await session.get(`${TRAVIAN_URL}/login.php`);
    
    // Fazer login
    console.log('Enviando credenciais');
    const loginForm = new URLSearchParams();
    loginForm.append('name', credentials.username);
    loginForm.append('password', credentials.password);
    loginForm.append('s1', 'Entrar');
    loginForm.append('w', '1920:1080');
    loginForm.append('login', '1');
    
    const loginResponse = await session.post(`${TRAVIAN_URL}/dorf1.php`, loginForm, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });
    
    // Verificar se login foi bem-sucedido
    if (loginResponse.data.includes('dorf1') || loginResponse.data.includes('Recursos')) {
      console.log('Login bem-sucedido');
      
      // Acessar página da lista de farms
      console.log('Acessando página da lista de farms');
      const farmListPage = await session.get(`${TRAVIAN_URL}/build.php?gid=16&tt=99`);
      
      // Extrair token e parâmetros necessários
      const html = farmListPage.data;
      const tokenMatch = html.match(/name="([a-f0-9]{32})" value="1"/);
      
      if (tokenMatch && tokenMatch[1]) {
        const token = tokenMatch[1];
        
        // Enviar requisição para iniciar todas as listas
        console.log('Iniciando todas as listas de farms');
        const farmForm = new URLSearchParams();
        farmForm.append(token, '1');
        farmForm.append('startAllRaids', '1');
        
        const farmResponse = await session.post(`${TRAVIAN_URL}/build.php?gid=16&tt=99`, farmForm, {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        });
        
        console.log('Listas de farms iniciadas com sucesso');
      } else {
        console.log('Não foi possível encontrar o token para iniciar as listas de farms');
      }
    } else {
      console.error('Falha no login. Verifique suas credenciais.');
    }
  } catch (error) {
    console.error('Erro durante a automação:', error.message);
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
