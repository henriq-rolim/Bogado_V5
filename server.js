// server.js - Servidor Express e automação do Travian
require('dotenv').config();
const express = require('express');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright-core');

const app = express();
const PORT = process.env.PORT || 3000;
const CREDENTIALS_FILE = path.join(__dirname, 'credentials.json');
const COOKIES_FILE = path.join(__dirname, 'cookies.json');
const TRAVIAN_URL = 'https://ts100.x10.america.travian.com';

// Variáveis de controle
let isRunning = false;
let nextRunTimeout = null;
let nextRunTime = null;
let browserSession = null;

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

function loadCookies() {
  try {
    if (fs.existsSync(COOKIES_FILE)) {
      return JSON.parse(fs.readFileSync(COOKIES_FILE, 'utf8'));
    }
  } catch (error) {
    console.error('Erro ao carregar cookies:', error);
  }
  return null;
}

function saveCookies(cookies) {
  try {
    fs.writeFileSync(COOKIES_FILE, JSON.stringify(cookies));
    return true;
  } catch (error) {
    console.error('Erro ao salvar cookies:', error);
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
  console.log(`[${new Date().toISOString()}] Iniciando automação do Travian`);
  
  try {
    // Verificar se temos cookies salvos
    const cookies = loadCookies();
    if (!cookies || !Array.isArray(cookies) || cookies.length === 0) {
      console.error('Cookies não encontrados. Faça login manual primeiro.');
      return;
    }
    
    console.log(`Usando ${cookies.length} cookies salvos para autenticação`);
    
    // Criar sessão com cookies
    const session = axios.create({
      withCredentials: true,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Cookie': cookies.map(cookie => `${cookie.name}=${cookie.value}`).join('; ')
      }
    });
    
    // Verificar se os cookies são válidos acessando a página principal
    console.log('Verificando validade dos cookies...');
    const mainPage = await session.get(`${TRAVIAN_URL}/dorf1.php`);
    
    // Verificar se estamos logados
    if (!mainPage.data.includes('dorf1') && 
        !mainPage.data.includes('Recursos') && 
        !mainPage.data.includes('stockBarWarehouse') &&
        !mainPage.data.includes('villageNameField')) {
      console.error('Cookies inválidos ou expirados. Faça login manual novamente.');
      return;
    }
    
    console.log('Cookies válidos! Usuário autenticado com sucesso.');
    
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
          'Content-Type': 'application/x-www-form-urlencoded',
          'Referer': `${TRAVIAN_URL}/build.php?gid=16&tt=99`
        }
      });
      
      console.log('Listas de farms iniciadas com sucesso');
    } else {
      console.log('Não foi possível encontrar o token para iniciar as listas de farms');
      
      // Tentar método alternativo
      if (html.includes('startAllRaids') || html.includes('Iniciar todas as listas')) {
        console.log('Botão de iniciar todas as listas encontrado, tentando método alternativo...');
        
        // Tentar encontrar o formulário completo
        const formMatch = html.match(/<form[^>]*action="[^"]*"[^>]*>([\s\S]*?)<\/form>/i);
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
            
            console.log('Tentativa alternativa de iniciar listas de farms concluída');
          }
        }
      } else {
        console.log('Botão de iniciar todas as listas não encontrado. Verifique se você tem listas de farms configuradas.');
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

// Função para iniciar sessão de navegador para login manual
async function startBrowserSession() {
  if (browserSession) {
    console.log('Sessão de navegador já está ativa');
    return browserSession;
  }
  
  console.log('Iniciando nova sessão de navegador...');
  
  try {
    // Verificar se estamos em ambiente de produção (Render.com)
    const isProduction = process.env.RENDER === 'true';
    
    // Configurações do navegador
    const launchOptions = {
      headless: isProduction,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu'
      ]
    };
    
    // Usar Browserless em produção se configurado
    if (isProduction && process.env.BROWSERLESS_TOKEN) {
      console.log('Usando Browserless para navegador em produção');
      browserSession = await chromium.connect(`wss://chrome.browserless.io/playwright?token=${process.env.BROWSERLESS_TOKEN}`);
    } else {
      console.log('Iniciando navegador local');
      browserSession = await chromium.launch(launchOptions);
    }
    
    console.log('Sessão de navegador iniciada com sucesso');
    return browserSession;
  } catch (error) {
    console.error('Erro ao iniciar sessão de navegador:', error);
    throw error;
  }
}

// Função para encerrar sessão de navegador
async function closeBrowserSession() {
  if (browserSession) {
    try {
      await browserSession.close();
      console.log('Sessão de navegador encerrada');
    } catch (error) {
      console.error('Erro ao encerrar sessão de navegador:', error);
    } finally {
      browserSession = null;
    }
  }
}

// Rotas da API
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Página de login manual
app.get('/login-manual', (req, res) => {
  res.sendFile(path.join(__dirname, 'login-manual.html'));
});

// Iniciar sessão de login manual
app.post('/api/login-manual/start', async (req, res) => {
  try {
    await startBrowserSession();
    
    // Criar contexto e página
    const context = await browserSession.newContext({
      viewport: { width: 1280, height: 800 },
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    });
    
    const page = await context.newPage();
    
    // Navegar para a página de login do Travian
    await page.goto(`${TRAVIAN_URL}/login.php`);
    
    // Gerar ID de sessão único
    const sessionId = Date.now().toString();
    
    // Armazenar contexto e página para uso posterior
    app.locals[`context_${sessionId}`] = context;
    app.locals[`page_${sessionId}`] = page;
    
    res.json({
      success: true,
      sessionId,
      message: 'Sessão de login iniciada com sucesso'
    });
  } catch (error) {
    console.error('Erro ao iniciar sessão de login manual:', error);
    res.status(500).json({
      success: false,
      message: `Erro ao iniciar sessão de login: ${error.message}`
    });
  }
});

// Verificar status do login
app.get('/api/login-manual/status/:sessionId', async (req, res) => {
  const { sessionId } = req.params;
  const page = app.locals[`page_${sessionId}`];
  
  if (!page) {
    return res.status(404).json({
      success: false,
      message: 'Sessão não encontrada'
    });
  }
  
  try {
    // Verificar se estamos na página principal (dorf1.php)
    const url = page.url();
    const isLoggedIn = url.includes('dorf1.php') || url.includes('dorf2.php');
    
    if (isLoggedIn) {
      // Capturar cookies
      const cookies = await page.context().cookies();
      
      // Salvar cookies
      saveCookies(cookies);
      
      // Fechar contexto
      await page.context().close();
      
      // Limpar referências
      delete app.locals[`context_${sessionId}`];
      delete app.locals[`page_${sessionId}`];
      
      return res.json({
        success: true,
        loggedIn: true,
        message: 'Login detectado! Cookies salvos com sucesso.',
        cookiesCount: cookies.length
      });
    }
    
    res.json({
      success: true,
      loggedIn: false,
      message: 'Aguardando login...'
    });
  } catch (error) {
    console.error('Erro ao verificar status do login:', error);
    res.status(500).json({
      success: false,
      message: `Erro ao verificar status: ${error.message}`
    });
  }
});

// Encerrar sessão de login manual
app.post('/api/login-manual/close/:sessionId', async (req, res) => {
  const { sessionId } = req.params;
  const context = app.locals[`context_${sessionId}`];
  
  if (!context) {
    return res.status(404).json({
      success: false,
      message: 'Sessão não encontrada'
    });
  }
  
  try {
    // Fechar contexto
    await context.close();
    
    // Limpar referências
    delete app.locals[`context_${sessionId}`];
    delete app.locals[`page_${sessionId}`];
    
    res.json({
      success: true,
      message: 'Sessão encerrada com sucesso'
    });
  } catch (error) {
    console.error('Erro ao encerrar sessão:', error);
    res.status(500).json({
      success: false,
      message: `Erro ao encerrar sessão: ${error.message}`
    });
  }
});

app.get('/api/status', (req, res) => {
  const credentials = loadCredentials();
  const cookies = loadCookies();
  const hasCredentials = !!(credentials && credentials.username && credentials.password);
  const hasCookies = !!(cookies && Array.isArray(cookies) && cookies.length > 0);
  
  res.json({
    isRunning,
    nextRunTime: nextRunTime ? nextRunTime.toISOString() : null,
    timeRemaining: nextRunTime ? Math.max(0, nextRunTime - Date.now()) : null,
    hasCredentials,
    hasCookies,
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
  const cookies = loadCookies();
  if (!cookies || !Array.isArray(cookies) || cookies.length === 0) {
    return res.json({
      success: false,
      message: 'Cookies não encontrados. Faça login manual primeiro.',
      status: {
        isRunning: false,
        hasCookies: false
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
      hasCookies: true
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
      nextRunTime: null
    }
  });
});

// Iniciar servidor
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Servidor rodando na porta ${PORT}`);
  console.log('Para acessar a interface de controle, abra o navegador no endereço acima.');
  console.log('A automação está inicialmente PARADA. Use a interface web para iniciá-la.');
});

// Encerrar navegador ao fechar o servidor
process.on('SIGINT', async () => {
  console.log('Encerrando servidor...');
  await closeBrowserSession();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('Encerrando servidor...');
  await closeBrowserSession();
  process.exit(0);
});
