// automation.js - Módulo de automação do Travian
require('dotenv').config();
const { chromium } = require('playwright-core');

// Configurações e constantes
const TRAVIAN_URL = 'https://ts100.x10.america.travian.com';
const FARM_LIST_URL = `${TRAVIAN_URL}/build.php?gid=16&tt=99`;

// Variáveis de controle do estado da automação
let isRunning = false;
let nextRunTimeout = null;
let nextRunTime = null;

// Validar variáveis de ambiente
function validateEnv() {
    const { TRAVIAN_USER, TRAVIAN_PASS, BROWSERLESS_TOKEN } = process.env;
    if (!TRAVIAN_USER || !TRAVIAN_PASS || !BROWSERLESS_TOKEN) {
        console.error('Erro: Variáveis de ambiente necessárias não encontradas (TRAVIAN_USER, TRAVIAN_PASS, BROWSERLESS_TOKEN).');
        console.log('Por favor, crie um arquivo .env baseado no .env.example e preencha seus dados.');
        return false;
    }
    return true;
}

// Função para gerar atraso aleatório entre execuções
function getRandomDelay(minMinutes, maxMinutes) {
    const minMs = minMinutes * 60 * 1000;
    const maxMs = maxMinutes * 60 * 1000;
    return Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
}

// Função principal de automação
async function runAutomation() {
    if (!validateEnv()) return;
    
    const BROWSERLESS_ENDPOINT = `wss://chrome.browserless.io/playwright?token=${process.env.BROWSERLESS_TOKEN}`;
    let browser = null;
    console.log(`[${new Date().toISOString()}] Iniciando automação da lista de farms do Travian...`);

    try {
        console.log('Conectando ao Browserless...');
        browser = await chromium.connect(BROWSERLESS_ENDPOINT, { timeout: 120000 }); 
        console.log('Conectado com sucesso!');

        const context = await browser.newContext({
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36',
            viewport: { width: 1280, height: 800 }
        });
        const page = await context.newPage();
        console.log('Contexto e página do navegador criados.');

        // --- Login --- 
        console.log(`Navegando para página de login: ${TRAVIAN_URL}/login.php`);
        await page.goto(`${TRAVIAN_URL}/login.php`, { waitUntil: 'domcontentloaded', timeout: 90000 });
        console.log('Página de login carregada.');

        console.log('Inserindo nome de usuário...');
        await page.locator('input[name="name"]').fill(process.env.TRAVIAN_USER);
        console.log('Inserindo senha...');
        await page.locator('input[name="password"]').fill(process.env.TRAVIAN_PASS);

        console.log('Enviando formulário de login...');
        await Promise.all([
            page.waitForURL(`${TRAVIAN_URL}/dorf1.php`, { waitUntil: 'networkidle', timeout: 90000 }),
            page.locator('button[type="submit"], input[type="submit"]').first().click()
        ]);
        console.log('Login bem-sucedido, redirecionado para dorf1.');

        // --- Navegar para Lista de Farms --- 
        console.log(`Navegando para página da lista de farms: ${FARM_LIST_URL}`);
        await page.goto(FARM_LIST_URL, { waitUntil: 'networkidle', timeout: 90000 });
        console.log('Página da lista de farms carregada.');

        // --- Clicar no Botão --- 
        const farmButtonSelector = 'div.startAllFarmLists > div.button-content:has-text("Iniciar todas as listas de farms")'; 
        const fallbackFarmButtonSelector = 'div:has-text("Iniciar todas as listas de farms")';
        
        console.log(`Procurando botão com seletor: "${farmButtonSelector}" ou alternativo "${fallbackFarmButtonSelector}"`);
        let farmButton = page.locator(farmButtonSelector);

        if (!await farmButton.isVisible({ timeout: 5000 })) {
             console.log('Seletor primário não visível, tentando alternativo...');
             farmButton = page.locator(fallbackFarmButtonSelector);
        }

        if (await farmButton.isVisible()) {
            console.log('Botão da lista de farms encontrado. Clicando...');
            await farmButton.click({ timeout: 15000 });
            console.log('Botão da lista de farms clicado com sucesso!');
            await page.waitForTimeout(5000);
        } else {
            console.warn('Botão "Iniciar todas as listas de farms" não encontrado ou não visível após verificar ambos os seletores.');
        }

        console.log('Etapa de automação concluída.');

    } catch (error) {
        console.error(`[${new Date().toISOString()}] Erro durante a automação:`, error);
    } finally {
        if (browser) {
            try {
                console.log('Fechando conexão do navegador...');
                await browser.close();
                console.log('Conexão do navegador fechada.');
            } catch (closeError) {
                console.error('Erro ao fechar conexão do navegador:', closeError);
            }
        }
        console.log(`[${new Date().toISOString()}] Execução da automação finalizada.`);
        
        // Agendar próxima execução apenas se a automação ainda estiver ativa
        if (isRunning) {
            scheduleNextRun();
        } else {
            console.log('Automação está pausada. Não agendando próxima execução.');
        }
    }
}

// Função para agendar a próxima execução
function scheduleNextRun() {
    if (!isRunning) {
        console.log('Automação está pausada. Não agendando próxima execução.');
        return;
    }
    
    const delay = getRandomDelay(4, 6); // Atraso aleatório entre 4 e 6 minutos
    nextRunTime = new Date(Date.now() + delay);
    
    console.log(`--------------------------------------------------`);
    console.log(`Próxima execução agendada para: ${nextRunTime.toISOString()}`);
    console.log(`Aguardando ${Math.round(delay / 60000)} minutos (${delay} ms)...`);
    console.log(`--------------------------------------------------`);

    // Limpar qualquer timeout existente antes de criar um novo
    if (nextRunTimeout) {
        clearTimeout(nextRunTimeout);
    }
    
    nextRunTimeout = setTimeout(runAutomation, delay);
}

// Funções para controlar a automação externamente
function startAutomation() {
    if (isRunning) {
        return { success: false, message: 'A automação já está em execução.' };
    }
    
    isRunning = true;
    console.log('Automação iniciada pelo usuário.');
    
    // Iniciar imediatamente
    runAutomation();
    
    return { 
        success: true, 
        message: 'Automação iniciada com sucesso!',
        status: getStatus()
    };
}

function stopAutomation() {
    if (!isRunning) {
        return { success: false, message: 'A automação já está parada.' };
    }
    
    isRunning = false;
    
    // Cancelar próxima execução agendada
    if (nextRunTimeout) {
        clearTimeout(nextRunTimeout);
        nextRunTimeout = null;
    }
    
    console.log('Automação parada pelo usuário.');
    
    return { 
        success: true, 
        message: 'Automação parada com sucesso!',
        status: getStatus()
    };
}

function getStatus() {
    return {
        isRunning,
        nextRunTime: nextRunTime ? nextRunTime.toISOString() : null,
        timeRemaining: nextRunTime ? Math.max(0, nextRunTime - Date.now()) : null
    };
}

// Exportar funções para uso no servidor
module.exports = {
    startAutomation,
    stopAutomation,
    getStatus,
    validateEnv
};
