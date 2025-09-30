// ==================== STATE MANAGEMENT ====================
const AppState = {
    currentPage: 'dashboard',
    calculations: [],
    companies: [],
    theme: localStorage.getItem('theme') || 'light',
    charts: {},
    currentModal: null,
    userSettings: {
        autoSave: true,
        showTutorial: false,
        darkMode: false
    }
};

// ==================== INITIALIZATION ====================
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

function initializeApp() {
    console.log('🚀 Inicializando FatorR Pro...');
    
    // Aplicar tema primeiro
    applyTheme();
    
    // Carregar dados
    loadSavedData();
    setCurrentDate();
    
    // Inicializar componentes
    initializeCharts();
    setupEventListeners();
    generateMonthlyTable();
    loadHistoryTable();
    loadCompaniesTable();
    
    // Navegar para a página inicial
    setTimeout(() => {
        navigateTo('dashboard');
        hideLoading(); // Garantir que loading seja escondido
    }, 500);
    
    console.log('✅ FatorR Pro inicializado com sucesso!');
}

function setupEventListeners() {
    console.log('🔧 Configurando event listeners...');
    
    // Close modal when clicking outside
    document.addEventListener('click', function(e) {
        if (e.target.classList.contains('modal')) {
            closeModal();
        }
    });

    // Close modal with ESC key
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            closeModal();
        }
    });

    // Search functionality with debounce
    const searchInput = document.querySelector('.search-input');
    if (searchInput) {
        searchInput.addEventListener('input', debounce(function(e) {
            performSearch(e.target.value);
        }, 300));
    }

    // Form auto-save
    const basicForm = document.getElementById('basic-form');
    if (basicForm) {
        basicForm.addEventListener('input', debounce(function() {
            if (AppState.userSettings.autoSave) {
                saveFormDraft();
            }
        }, 1000));
    }
    
    // Load form draft on page show
    document.addEventListener('DOMContentLoaded', loadFormDraft);
}

function setCurrentDate() {
    const periodInput = document.getElementById('period');
    if (periodInput) {
        const today = new Date();
        const month = today.toISOString().slice(0, 7);
        periodInput.value = month;
    }
}

function applyTheme() {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
        AppState.theme = 'dark';
        document.body.setAttribute('data-theme', 'dark');
        const themeIcon = document.getElementById('theme-icon');
        if (themeIcon) {
            themeIcon.className = 'fas fa-sun';
        }
        AppState.userSettings.darkMode = true;
    }
}

// ==================== NAVIGATION ====================
function navigateTo(page, element) {
    console.log(`📄 Navegando para: ${page}`);
    
    // Mostrar loading apenas se for uma página diferente
    if (AppState.currentPage !== page) {
        showLoading();
    }
    
    try {
        // Hide all pages
        document.querySelectorAll('.page-content').forEach(p => {
            p.classList.add('hidden');
        });
        
        // Show target page
        const pageElement = document.getElementById(`${page}-page`);
        if (pageElement) {
            pageElement.classList.remove('hidden');
            
            // Update page title
            document.title = `FatorR Pro - ${getPageTitle(page)}`;
        } else {
            console.error(`❌ Página não encontrada: ${page}-page`);
            showNotification('Página não encontrada', 'danger');
            navigateTo('dashboard');
            return;
        }
        
        // Update nav items
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active');
            item.setAttribute('aria-selected', 'false');
        });
        
        if (element) {
            element.classList.add('active');
            element.setAttribute('aria-selected', 'true');
        } else {
            // Encontrar o botão correspondente na sidebar
            const navItem = document.querySelector(`[onclick*="navigateTo('${page}'"]`);
            if (navItem) {
                navItem.classList.add('active');
                navItem.setAttribute('aria-selected', 'true');
            }
        }
        
        AppState.currentPage = page;
        
        // Close mobile sidebar
        if (window.innerWidth <= 1024) {
            const sidebar = document.getElementById('sidebar');
            if (sidebar) {
                sidebar.classList.remove('active');
            }
            updateMenuToggleAria(false);
        }

        // Update browser history
        if (history.pushState) {
            history.pushState({ page }, '', `#${page}`);
        }
        
        console.log(`✅ Navegação para ${page} concluída`);
        
    } catch (error) {
        console.error('❌ Erro na navegação:', error);
        showNotification('Erro ao carregar página', 'danger');
    } finally {
        // Sempre esconder o loading
        setTimeout(hideLoading, 300);
    }
}

function getPageTitle(page) {
    const titles = {
        dashboard: 'Dashboard',
        calculator: 'Calculadora',
        history: 'Histórico',
        companies: 'Empresas',
        reports: 'Relatórios',
        settings: 'Configurações',
        help: 'Ajuda'
    };
    return titles[page] || 'FatorR Pro';
}

function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    if (sidebar) {
        const isActive = sidebar.classList.toggle('active');
        updateMenuToggleAria(isActive);
    }
}

function updateMenuToggleAria(isExpanded) {
    const menuToggle = document.querySelector('.menu-toggle');
    if (menuToggle) {
        menuToggle.setAttribute('aria-expanded', isExpanded.toString());
    }
}

function toggleTheme() {
    const body = document.body;
    const icon = document.getElementById('theme-icon');
    
    if (!icon) {
        console.error('❌ Ícone do tema não encontrado');
        return;
    }
    
    if (AppState.theme === 'light') {
        AppState.theme = 'dark';
        body.setAttribute('data-theme', 'dark');
        icon.className = 'fas fa-sun';
        AppState.userSettings.darkMode = true;
    } else {
        AppState.theme = 'light';
        body.removeAttribute('data-theme');
        icon.className = 'fas fa-moon';
        AppState.userSettings.darkMode = false;
    }
    
    localStorage.setItem('theme', AppState.theme);
    saveUserSettings();
    showNotification(`Tema ${AppState.theme === 'light' ? 'claro' : 'escuro'} ativado`, 'success');
}

function toggleUserMenu() {
    const modal = document.getElementById('user-menu-modal');
    if (modal) {
        modal.classList.toggle('active');
    }
}

// ==================== TAB SWITCHING ====================
function switchTab(tabName, element) {
    console.log(`🔀 Alternando para aba: ${tabName}`);
    
    if (!element) {
        console.error('❌ Elemento não fornecido para switchTab');
        return;
    }
    
    try {
        // Update tabs
        document.querySelectorAll('.tab-btn').forEach(tab => {
            tab.classList.remove('active');
            tab.setAttribute('aria-selected', 'false');
        });
        element.classList.add('active');
        element.setAttribute('aria-selected', 'true');
        
        // Update content
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
            content.setAttribute('hidden', 'true');
        });
        
        const targetTab = document.getElementById(`tab-${tabName}`);
        if (targetTab) {
            targetTab.classList.add('active');
            targetTab.removeAttribute('hidden');
        } else {
            console.error(`❌ Aba não encontrada: tab-${tabName}`);
        }
        
    } catch (error) {
        console.error('❌ Erro ao alternar abas:', error);
    }
}

// ==================== FORM FUNCTIONS ====================
function formatCurrency(input) {
    if (!input || !input.value) return;
    
    let value = input.value.replace(/\D/g, '');
    if (value === '') {
        input.value = '';
        return;
    }
    
    // Remove leading zeros
    value = value.replace(/^0+/, '');
    if (value === '') value = '0';
    
    const numericValue = parseInt(value);
    if (isNaN(numericValue)) {
        input.value = '';
        return;
    }
    
    value = (numericValue / 100).toFixed(2);
    value = value.replace('.', ',');
    value = value.replace(/(\d)(?=(\d{3})+(?!\d))/g, '$1.');
    input.value = value;
}

function formatCNPJ(input) {
    if (!input || !input.value) return;
    
    let value = input.value.replace(/\D/g, '');
    
    if (value.length <= 14) {
        value = value.replace(/^(\d{2})(\d)/, '$1.$2');
        value = value.replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3');
        value = value.replace(/\.(\d{3})(\d)/, '.$1/$2');
        value = value.replace(/(\d{4})(\d)/, '$1-$2');
    }
    
    input.value = value;
}

function parseCurrency(value) {
    if (!value || value === '') return 0;
    const cleanValue = value.replace(/\./g, '').replace(',', '.');
    return parseFloat(cleanValue) || 0;
}

function validateCNPJ(cnpj) {
    if (!cnpj) return false;
    
    cnpj = cnpj.replace(/[^\d]+/g, '');
    
    if (cnpj === '') return false;
    if (cnpj.length !== 14) return false;
    
    // Elimina CNPJs invalidos conhecidos
    if (/^(\d)\1+$/.test(cnpj)) return false;
    
    // Valida DVs
    let tamanho = cnpj.length - 2;
    let numeros = cnpj.substring(0, tamanho);
    let digitos = cnpj.substring(tamanho);
    let soma = 0;
    let pos = tamanho - 7;
    
    for (let i = tamanho; i >= 1; i--) {
        soma += numeros.charAt(tamanho - i) * pos--;
        if (pos < 2) pos = 9;
    }
    
    let resultado = soma % 11 < 2 ? 0 : 11 - soma % 11;
    if (resultado != digitos.charAt(0)) return false;
    
    tamanho = tamanho + 1;
    numeros = cnpj.substring(0, tamanho);
    soma = 0;
    pos = tamanho - 7;
    
    for (let i = tamanho; i >= 1; i--) {
        soma += numeros.charAt(tamanho - i) * pos--;
        if (pos < 2) pos = 9;
    }
    
    resultado = soma % 11 < 2 ? 0 : 11 - soma % 11;
    return resultado == digitos.charAt(1);
}

// ==================== CALCULATION ====================
function safeCalculateFactorR(event) {
    if (event) event.preventDefault();
    
    console.log('🧮 Iniciando cálculo seguro do Fator R...');
    
    try {
        calculateFactorR(event);
    } catch (error) {
        console.error('❌ Erro no cálculo:', error);
        showNotification('Erro ao calcular Fator R. Tente novamente.', 'danger');
    }
}

function calculateFactorR(event) {
    if (event) event.preventDefault();
    
    console.log('🧮 Calculando Fator R...');
    showLoading();
    
    try {
        const revenue = parseCurrency(document.getElementById('revenue').value);
        const payroll = parseCurrency(document.getElementById('payroll').value);
        const cnpj = document.getElementById('cnpj').value;
        const activity = document.getElementById('activity').value;
        const employees = parseInt(document.getElementById('employees').value) || 0;
        const period = document.getElementById('period').value;
        
        console.log('📊 Dados capturados:', { revenue, payroll, cnpj, activity, employees, period });
        
        // Validate inputs
        const errors = validateFinancialData(revenue, payroll);
        if (errors.length > 0) {
            errors.forEach(error => showNotification(error, 'warning'));
            hideLoading();
            return;
        }

        if (cnpj && !validateCNPJ(cnpj)) {
            showNotification('CNPJ inválido', 'warning');
            hideLoading();
            return;
        }
        
        // Calculate
        const factorR = (payroll / revenue * 100).toFixed(2);
        console.log(`📈 Fator R calculado: ${factorR}%`);
        
        // Show results
        displayResults(factorR, revenue, payroll, activity, employees);
        
        // Save calculation
        const calculation = {
            id: Date.now(),
            date: new Date().toISOString(),
            cnpj: cnpj,
            revenue: revenue,
            payroll: payroll,
            employees: employees,
            activity: activity,
            period: period,
            factorR: parseFloat(factorR)
        };
        
        AppState.calculations.push(calculation);
        saveToLocalStorage();
        
        // Update history table if visible
        if (AppState.currentPage === 'history') {
            loadHistoryTable();
        }
        
        showNotification('Cálculo realizado com sucesso!', 'success');
        console.log('✅ Cálculo concluído com sucesso');
        
    } catch (error) {
        console.error('❌ Erro no cálculo do Fator R:', error);
        showNotification('Erro interno no cálculo', 'danger');
    } finally {
        hideLoading();
    }
}

function validateFinancialData(revenue, payroll) {
    const errors = [];
    
    if (!revenue || revenue <= 0) errors.push('Receita deve ser maior que zero');
    if (!payroll || payroll <= 0) errors.push('Folha deve ser maior que zero');
    if (payroll > revenue) errors.push('Folha não pode ser maior que receita');
    if (revenue > 1000000000) errors.push('Receita acima do limite permitido (R$ 1 bilhão)');
    
    return errors;
}

function calculateDetailedFactorR(event) {
    if (event) event.preventDefault();
    
    showLoading();
    
    try {
        showNotification('Cálculo detalhado em desenvolvimento', 'info');
    } catch (error) {
        console.error('❌ Erro no cálculo detalhado:', error);
        showNotification('Erro no cálculo detalhado', 'danger');
    } finally {
        hideLoading();
    }
}

function displayResults(factorR, revenue, payroll, activity, employees) {
    const resultsSection = document.getElementById('results');
    if (!resultsSection) {
        console.error('❌ Seção de resultados não encontrada');
        return;
    }
    
    resultsSection.classList.add('active');
    
    // Scroll to results
    setTimeout(() => {
        resultsSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 100);
    
    // Update factor value
    const factorValueElement = document.getElementById('factor-value');
    if (factorValueElement) {
        factorValueElement.textContent = `${factorR}%`;
    }
    
    // Update status
    const statusElement = document.getElementById('factor-status');
    if (statusElement) {
        const factor = parseFloat(factorR);
        
        if (factor >= 28) {
            statusElement.textContent = 'Anexo III - Alíquota Reduzida';
            statusElement.className = 'factor-status success';
        } else if (factor >= 20) {
            statusElement.textContent = 'Próximo ao Anexo III';
            statusElement.className = 'factor-status warning';
        } else {
            statusElement.textContent = 'Anexo V - Alíquota Maior';
            statusElement.className = 'factor-status danger';
        }
    }
    
    // Update progress
    const progressFill = document.getElementById('progress-fill');
    const progressText = document.getElementById('progress-text');
    if (progressFill && progressText) {
        const factor = parseFloat(factorR);
        const progress = Math.min((factor / 28) * 100, 100);
        progressFill.style.width = `${progress}%`;
        progressFill.setAttribute('aria-valuenow', progress);
        progressText.textContent = `${factorR}% de 28%`;
    }
    
    // Update analysis
    updateAnalysis(factorR, revenue, payroll, activity, employees);
}

function updateAnalysis(factorR, revenue, payroll, activity, employees) {
    const factor = parseFloat(factorR);
    
    // Tax Analysis
    let taxAnalysis = '';
    if (activity === 'servicos') {
        if (factor >= 28) {
            taxAnalysis = 'Sua empresa está enquadrada no <strong>Anexo III</strong> com alíquotas reduzidas (6% a 33%).';
        } else {
            taxAnalysis = 'Sua empresa está no <strong>Anexo V</strong> com alíquotas maiores (15,5% a 30,5%).';
        }
    } else {
        taxAnalysis = `Empresa enquadrada no anexo específico para ${activity}.`;
    }
    
    const taxAnalysisElement = document.getElementById('tax-analysis');
    if (taxAnalysisElement) {
        taxAnalysisElement.innerHTML = taxAnalysis;
    }
    
    // Savings Analysis
    let savings = 0;
    let savingsText = '';
    if (activity === 'servicos') {
        if (factor < 28) {
            const currentTax = revenue * 0.18;
            const potentialTax = revenue * 0.12;
            savings = currentTax - potentialTax;
            savingsText = `Economia potencial: <strong>R$ ${savings.toLocaleString('pt-BR', {minimumFractionDigits: 2})} por ano</strong>`;
        } else {
            savingsText = 'Você já está no melhor enquadramento tributário!';
        }
    } else {
        savingsText = 'O Fator R é mais relevante para empresas de serviços.';
    }
    
    const savingsAnalysisElement = document.getElementById('savings-analysis');
    if (savingsAnalysisElement) {
        savingsAnalysisElement.innerHTML = savingsText;
    }
    
    // Recommendations
    let recommendations = '';
    if (factor < 28 && activity === 'servicos') {
        const neededPayroll = (0.28 * revenue) - payroll;
        if (neededPayroll > 0) {
            recommendations = `
                <p><strong>Para atingir o Anexo III (28%):</strong></p>
                <ul style="margin-top: 0.5rem; padding-left: 1.5rem;">
                    <li>Aumente a folha em <strong>R$ ${neededPayroll.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</strong></li>
                    <li>Considere aumentar o pró-labore dos sócios</li>
                    <li>Avalie novas contratações estratégicas</li>
                    <li>Registre todos os benefícios e encargos</li>
                </ul>
            `;
        } else {
            recommendations = 'O Fator R já está acima de 28%!';
        }
    } else if (factor >= 28) {
        recommendations = `
            <p><strong>Recomendações para manter o benefício:</strong></p>
            <ul style="margin-top: 0.5rem; padding-left: 1.5rem;">
                <li>Monitore mensalmente o Fator R</li>
                <li>Mantenha o controle rigoroso da folha</li>
                <li>Planeje aumentos de forma estratégica</li>
                <li>Considere a sazonalidade do negócio</li>
            </ul>
        `;
    } else {
        recommendations = 'Mantenha o acompanhamento regular do Fator R.';
    }
    
    const recommendationsElement = document.getElementById('recommendations');
    if (recommendationsElement) {
        recommendationsElement.innerHTML = recommendations;
    }
}

function clearForm() {
    const basicForm = document.getElementById('basic-form');
    const resultsSection = document.getElementById('results');
    
    if (basicForm) basicForm.reset();
    if (resultsSection) resultsSection.classList.remove('active');
    
    showNotification('Formulário limpo', 'info');
}

function clearDetailedForm() {
    const detailedForm = document.getElementById('detailed-form');
    if (detailedForm) detailedForm.reset();
    
    const tbody = document.getElementById('monthly-data');
    if (tbody) {
        tbody.innerHTML = '';
        generateMonthlyTable();
    }
    
    showNotification('Formulário detalhado limpo', 'info');
}

// ==================== MONTHLY TABLE ====================
function generateMonthlyTable() {
    const months = [
        'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
        'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'
    ];
    
    const currentYear = new Date().getFullYear();
    const tbody = document.getElementById('monthly-data');
    
    if (!tbody) {
        console.error('❌ Tabela mensal não encontrada');
        return;
    }
    
    tbody.innerHTML = '';
    
    for (let i = 11; i >= 0; i--) {
        const date = new Date(currentYear, new Date().getMonth() - i, 1);
        const monthName = months[date.getMonth()];
        const year = date.getFullYear();
        
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${monthName}/${year}</td>
            <td>
                <div class="input-group" style="max-width: 150px;">
                    <span class="input-prefix">R$</span>
                    <input type="text" class="form-input" placeholder="0,00" onkeyup="formatCurrency(this)">
                </div>
            </td>
            <td>
                <div class="input-group" style="max-width: 150px;">
                    <span class="input-prefix">R$</span>
                    <input type="text" class="form-input" placeholder="0,00" onkeyup="formatCurrency(this)">
                </div>
            </td>
            <td>
                <input type="number" class="form-input" style="max-width: 100px;" placeholder="0" min="0">
            </td>
            <td>
                <button class="btn btn-sm btn-danger" onclick="removeMonthlyRow(this)" aria-label="Remover mês">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        `;
        tbody.appendChild(row);
    }
}

function addMonthlyRow() {
    const tbody = document.getElementById('monthly-data');
    if (!tbody) return;
    
    const row = document.createElement('tr');
    row.innerHTML = `
        <td>
            <input type="month" class="form-input">
        </td>
        <td>
            <div class="input-group" style="max-width: 150px;">
                <span class="input-prefix">R$</span>
                <input type="text" class="form-input" placeholder="0,00" onkeyup="formatCurrency(this)">
            </div>
        </td>
        <td>
            <div class="input-group" style="max-width: 150px;">
                <span class="input-prefix">R$</span>
                <input type="text" class="form-input" placeholder="0,00" onkeyup="formatCurrency(this)">
            </div>
        </td>
        <td>
            <input type="number" class="form-input" style="max-width: 100px;" placeholder="0" min="0">
        </td>
        <td>
            <button class="btn btn-sm btn-danger" onclick="removeMonthlyRow(this)" aria-label="Remover mês">
                <i class="fas fa-trash"></i>
            </button>
        </td>
    `;
    tbody.appendChild(row);
    
    showNotification('Mês adicionado', 'info');
}

function removeMonthlyRow(button) {
    if (!button) return;
    
    const row = button.closest('tr');
    if (row) {
        row.remove();
        showNotification('Mês removido', 'info');
    }
}

// ==================== CHARTS ====================
function initializeCharts() {
    console.log('📊 Inicializando gráficos...');
    
    // Evolution Chart
    const evolutionCtx = document.getElementById('evolutionChart');
    if (evolutionCtx) {
        try {
            AppState.charts.evolution = new Chart(evolutionCtx, {
                type: 'line',
                data: {
                    labels: ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'],
                    datasets: [{
                        label: 'Fator R (%)',
                        data: [25, 26, 27, 26.5, 28, 29, 30, 31, 30.5, 31, 31.5, 31.2],
                        borderColor: '#6366f1',
                        backgroundColor: 'rgba(99, 102, 241, 0.1)',
                        tension: 0.4,
                        fill: true,
                        borderWidth: 2
                    }, {
                        label: 'Meta (28%)',
                        data: new Array(12).fill(28),
                        borderColor: '#10b981',
                        borderDash: [5, 5],
                        fill: false,
                        pointRadius: 0,
                        borderWidth: 1
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'top',
                        },
                        tooltip: {
                            mode: 'index',
                            intersect: false
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: false,
                            min: 20,
                            max: 35,
                            ticks: {
                                callback: function(value) {
                                    return value + '%';
                                }
                            }
                        }
                    }
                }
            });
            console.log('✅ Gráfico de evolução inicializado');
        } catch (error) {
            console.error('❌ Erro ao inicializar gráfico de evolução:', error);
        }
    }
    
    // Annex Chart
    const annexCtx = document.getElementById('annexChart');
    if (annexCtx) {
        try {
            AppState.charts.annex = new Chart(annexCtx, {
                type: 'bar',
                data: {
                    labels: ['Anexo I', 'Anexo II', 'Anexo III', 'Anexo IV', 'Anexo V'],
                    datasets: [{
                        label: 'Alíquota Média (%)',
                        data: [6, 8, 12, 10, 20],
                        backgroundColor: [
                            '#6366f1', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444'
                        ],
                        borderWidth: 0
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            display: false
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            title: {
                                display: true,
                                text: 'Alíquota (%)'
                            },
                            ticks: {
                                callback: function(value) {
                                    return value + '%';
                                }
                            }
                        }
                    }
                }
            });
            console.log('✅ Gráfico de anexos inicializado');
        } catch (error) {
            console.error('❌ Erro ao inicializar gráfico de anexos:', error);
        }
    }
}

function changeChartPeriod(period) {
    if (!event || !event.target) return;
    
    // Update chart options
    document.querySelectorAll('.chart-option').forEach(opt => {
        if (opt !== event.target) {
            opt.classList.remove('active');
        }
    });
    event.target.classList.add('active');
    
    showNotification(`Período alterado para ${period}`, 'info');
}

function changeChartType(type) {
    if (!event || !event.target) return;
    
    document.querySelectorAll('.chart-option').forEach(opt => {
        if (opt !== event.target) {
            opt.classList.remove('active');
        }
    });
    event.target.classList.add('active');
    
    showNotification(`Tipo de gráfico alterado para ${type === 'values' ? 'Valores' : 'Percentual'}`, 'info');
}

// ==================== EXPORT FUNCTIONS ====================
function generatePDF() {
    showLoading();
    
    try {
        const lastCalc = AppState.calculations[AppState.calculations.length - 1];
        if (!lastCalc) {
            showNotification('Nenhum cálculo para exportar', 'warning');
            hideLoading();
            return;
        }
        
        // Simular geração de PDF
        setTimeout(() => {
            showNotification('PDF gerado com sucesso! (Simulação)', 'success');
            hideLoading();
        }, 1500);
        
    } catch (error) {
        console.error('❌ Erro ao gerar PDF:', error);
        showNotification('Erro ao gerar PDF', 'danger');
        hideLoading();
    }
}

function exportExcel() {
    showLoading();
    
    try {
        if (AppState.calculations.length === 0) {
            showNotification('Nenhum cálculo para exportar', 'warning');
            hideLoading();
            return;
        }
        
        // Simular exportação Excel
        setTimeout(() => {
            showNotification('Excel exportado com sucesso! (Simulação)', 'success');
            hideLoading();
        }, 1500);
        
    } catch (error) {
        console.error('❌ Erro ao exportar Excel:', error);
        showNotification('Erro ao exportar Excel', 'danger');
        hideLoading();
    }
}

function saveCalculation() {
    if (AppState.calculations.length === 0) {
        showNotification('Nenhum cálculo para salvar', 'warning');
        return;
    }
    
    saveToLocalStorage();
    showNotification('Cálculo salvo com sucesso!', 'success');
}

// ==================== SIMULATION FUNCTIONS ====================
function runSimulation(event) {
    if (event) event.preventDefault();
    
    showLoading();
    
    try {
        const currentRevenue = parseCurrency(document.getElementById('sim-revenue').value);
        const currentPayroll = parseCurrency(document.getElementById('sim-payroll').value);
        const revenueGrowth = parseFloat(document.getElementById('sim-revenue-growth').value) || 0;
        const payrollGrowth = parseFloat(document.getElementById('sim-payroll-growth').value) || 0;
        const newHires = parseInt(document.getElementById('sim-new-hires').value) || 0;
        const avgSalary = parseCurrency(document.getElementById('sim-avg-salary').value) || 0;
        
        // Validate
        if (currentRevenue === 0 || currentPayroll === 0) {
            showNotification('Preencha a receita e folha atuais', 'warning');
            hideLoading();
            return;
        }
        
        // Calculate projections
        const projectedRevenue = currentRevenue * (1 + revenueGrowth / 100);
        const additionalPayroll = newHires * avgSalary * 13;
        const projectedPayroll = currentPayroll * (1 + payrollGrowth / 100) + additionalPayroll;
        
        const currentFactorR = (currentPayroll / currentRevenue * 100).toFixed(2);
        const projectedFactorR = (projectedPayroll / projectedRevenue * 100).toFixed(2);
        
        // Display results
        displaySimulationResults(currentFactorR, projectedFactorR, currentRevenue, projectedRevenue, currentPayroll, projectedPayroll);
        
    } catch (error) {
        console.error('❌ Erro na simulação:', error);
        showNotification('Erro na simulação', 'danger');
    } finally {
        hideLoading();
    }
}

function displaySimulationResults(currentFactorR, projectedFactorR, currentRevenue, projectedRevenue, currentPayroll, projectedPayroll) {
    const resultsDiv = document.getElementById('simulation-results');
    if (!resultsDiv) return;
    
    const resultsHTML = `
        <h3 class="mb-lg">Resultado da Simulação</h3>
        
        <div class="analysis-grid">
            <div class="analysis-card">
                <div class="analysis-header">
                    <div class="analysis-icon" style="background: var(--primary-100); color: var(--primary-600);">
                        <i class="fas fa-chart-bar"></i>
                    </div>
                    <div class="analysis-title">Cenário Atual</div>
                </div>
                <div class="analysis-content">
                    <p><strong>Fator R: ${currentFactorR}%</strong></p>
                    <p>Receita: R$ ${currentRevenue.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</p>
                    <p>Folha: R$ ${currentPayroll.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</p>
                    <p>Anexo: ${currentFactorR >= 28 ? 'III' : 'V'}</p>
                </div>
            </div>
            
            <div class="analysis-card">
                <div class="analysis-header">
                    <div class="analysis-icon" style="background: rgba(16, 185, 129, 0.1); color: var(--success);">
                        <i class="fas fa-chart-line"></i>
                    </div>
                    <div class="analysis-title">Cenário Projetado</div>
                </div>
                <div class="analysis-content">
                    <p><strong>Fator R: ${projectedFactorR}%</strong></p>
                    <p>Receita: R$ ${projectedRevenue.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</p>
                    <p>Folha: R$ ${projectedPayroll.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</p>
                    <p>Anexo: ${projectedFactorR >= 28 ? 'III' : 'V'}</p>
                </div>
            </div>
            
            <div class="analysis-card">
                <div class="analysis-header">
                    <div class="analysis-icon" style="background: rgba(245, 158, 11, 0.1); color: var(--warning);">
                        <i class="fas fa-lightbulb"></i>
                    </div>
                    <div class="analysis-title">Análise</div>
                </div>
                <div class="analysis-content">
                    ${projectedFactorR >= 28 ? 
                        '<p style="color: var(--success);"><strong>✓ Cenário favorável!</strong> O Fator R permanece acima de 28%.</p>' :
                        '<p style="color: var(--danger);"><strong>⚠ Atenção!</strong> O Fator R ficará abaixo de 28%.</p>'
                    }
                    <p>Variação do Fator R: ${(projectedFactorR - currentFactorR).toFixed(2)} pontos</p>
                    ${projectedFactorR < 28 ? 
                        `<p>Folha adicional necessária: R$ ${((0.28 * projectedRevenue) - projectedPayroll).toLocaleString('pt-BR', {minimumFractionDigits: 2})}</p>` : ''
                    }
                </div>
            </div>
        </div>
    `;
    
    resultsDiv.innerHTML = resultsHTML;
    resultsDiv.classList.remove('hidden');
    
    setTimeout(() => {
        resultsDiv.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 100);
}

function clearSimulation() {
    const simRevenue = document.getElementById('sim-revenue');
    const simPayroll = document.getElementById('sim-payroll');
    const simRevenueGrowth = document.getElementById('sim-revenue-growth');
    const simPayrollGrowth = document.getElementById('sim-payroll-growth');
    const simNewHires = document.getElementById('sim-new-hires');
    const simAvgSalary = document.getElementById('sim-avg-salary');
    const resultsDiv = document.getElementById('simulation-results');
    
    if (simRevenue) simRevenue.value = '';
    if (simPayroll) simPayroll.value = '';
    if (simRevenueGrowth) simRevenueGrowth.value = '';
    if (simPayrollGrowth) simPayrollGrowth.value = '';
    if (simNewHires) simNewHires.value = '';
    if (simAvgSalary) simAvgSalary.value = '';
    if (resultsDiv) resultsDiv.classList.add('hidden');
    
    showNotification('Simulação limpa', 'info');
}

// ==================== STORAGE ====================
function saveToLocalStorage() {
    try {
        localStorage.setItem('fatorrpro_calculations', JSON.stringify(AppState.calculations));
        localStorage.setItem('fatorrpro_companies', JSON.stringify(AppState.companies));
        localStorage.setItem('fatorrpro_settings', JSON.stringify(AppState.userSettings));
        console.log('💾 Dados salvos no localStorage');
    } catch (error) {
        console.error('❌ Erro ao salvar dados:', error);
        showNotification('Erro ao salvar dados', 'warning');
    }
}

function loadSavedData() {
    try {
        const savedCalculations = localStorage.getItem('fatorrpro_calculations');
        const savedCompanies = localStorage.getItem('fatorrpro_companies');
        const savedSettings = localStorage.getItem('fatorrpro_settings');
        
        if (savedCalculations) {
            AppState.calculations = JSON.parse(savedCalculations);
            console.log(`📁 ${AppState.calculations.length} cálculos carregados`);
        }
        
        if (savedCompanies) {
            AppState.companies = JSON.parse(savedCompanies);
            console.log(`🏢 ${AppState.companies.length} empresas carregadas`);
        }
        
        if (savedSettings) {
            AppState.userSettings = { ...AppState.userSettings, ...JSON.parse(savedSettings) };
            console.log('⚙️ Configurações carregadas');
        }
    } catch (error) {
        console.error('❌ Erro ao carregar dados salvos:', error);
    }
}

function saveUserSettings() {
    try {
        localStorage.setItem('fatorrpro_settings', JSON.stringify(AppState.userSettings));
    } catch (error) {
        console.error('❌ Erro ao salvar configurações:', error);
    }
}

function saveFormDraft() {
    try {
        const formData = {
            revenue: document.getElementById('revenue')?.value || '',
            payroll: document.getElementById('payroll')?.value || '',
            cnpj: document.getElementById('cnpj')?.value || '',
            activity: document.getElementById('activity')?.value || '',
            employees: document.getElementById('employees')?.value || '',
            period: document.getElementById('period')?.value || ''
        };
        localStorage.setItem('fatorrpro_form_draft', JSON.stringify(formData));
    } catch (error) {
        console.error('❌ Erro ao salvar rascunho:', error);
    }
}

function loadFormDraft() {
    try {
        const draft = localStorage.getItem('fatorrpro_form_draft');
        if (draft) {
            const formData = JSON.parse(draft);
            if (document.getElementById('revenue')) document.getElementById('revenue').value = formData.revenue;
            if (document.getElementById('payroll')) document.getElementById('payroll').value = formData.payroll;
            if (document.getElementById('cnpj')) document.getElementById('cnpj').value = formData.cnpj;
            if (document.getElementById('activity')) document.getElementById('activity').value = formData.activity;
            if (document.getElementById('employees')) document.getElementById('employees').value = formData.employees;
            if (document.getElementById('period')) document.getElementById('period').value = formData.period;
        }
    } catch (error) {
        console.error('❌ Erro ao carregar rascunho:', error);
    }
}

// ==================== NOTIFICATIONS ====================
function showNotification(message, type = 'info') {
    const container = document.getElementById('notification-container');
    if (!container) {
        console.error('❌ Container de notificações não encontrado');
        return;
    }
    
    const notification = document.createElement('div');
    notification.className = `alert alert-${type} notification`;
    
    const icons = {
        info: 'info-circle',
        success: 'check-circle',
        warning: 'exclamation-triangle',
        danger: 'exclamation-circle'
    };
    
    notification.innerHTML = `
        <div class="alert-icon">
            <i class="fas fa-${icons[type]}" aria-hidden="true"></i>
        </div>
        <div class="alert-content">${message}</div>
        <button class="alert-close" onclick="this.parentElement.remove()" aria-label="Fechar notificação">
            <i class="fas fa-times" aria-hidden="true"></i>
        </button>
    `;
    
    container.appendChild(notification);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
        if (notification.parentElement) {
            notification.style.animation = 'slideOut 0.3s ease-out';
            setTimeout(() => notification.remove(), 300);
        }
    }, 5000);
}

// ==================== MODAL FUNCTIONS ====================
function showModal(title, content, onConfirm = null) {
    const modalTitle = document.getElementById('modal-title');
    const modalBody = document.getElementById('modal-body');
    const modal = document.getElementById('modal');
    
    if (!modalTitle || !modalBody || !modal) {
        console.error('❌ Elementos do modal não encontrados');
        return;
    }
    
    modalTitle.textContent = title;
    modalBody.innerHTML = content;
    AppState.currentModal = { onConfirm };
    modal.classList.add('active');
}

function closeModal() {
    const modal = document.getElementById('modal');
    const userMenuModal = document.getElementById('user-menu-modal');
    
    if (modal) modal.classList.remove('active');
    if (userMenuModal) userMenuModal.classList.remove('active');
    
    AppState.currentModal = null;
}

function confirmModal() {
    if (AppState.currentModal && AppState.currentModal.onConfirm) {
        AppState.currentModal.onConfirm();
    }
    closeModal();
}

// ==================== LOADING STATES ====================
function showLoading() {
    const overlay = document.getElementById('loading-overlay');
    if (overlay) {
        overlay.classList.remove('hidden');
        console.log('⏳ Loading mostrado');
    }
}

function hideLoading() {
    const overlay = document.getElementById('loading-overlay');
    if (overlay) {
        overlay.classList.add('hidden');
        console.log('✅ Loading escondido');
    }
}

// ==================== UTILITY FUNCTIONS ====================
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// ==================== HISTORY MANAGEMENT ====================
function loadHistoryTable() {
    const tbody = document.getElementById('history-table-body');
    if (!tbody) return;
    
    if (AppState.calculations.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="text-center">
                    <p>Nenhum cálculo realizado</p>
                    <button class="btn btn-primary mt-md" onclick="navigateTo('calculator')">
                        Fazer Primeiro Cálculo
                    </button>
                </td>
            </tr>
        `;
        return;
    }
    
    tbody.innerHTML = AppState.calculations.map(calc => `
        <tr>
            <td>${new Date(calc.date).toLocaleDateString('pt-BR')}</td>
            <td>${calc.cnpj || '-'}</td>
            <td>R$ ${calc.revenue.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</td>
            <td>R$ ${calc.payroll.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</td>
            <td>${calc.factorR}%</td>
            <td>
                <span class="status ${calc.factorR >= 28 ? 'completed' : 'warning'}">
                    ${calc.factorR >= 28 ? 'Anexo III' : 'Anexo V'}
                </span>
            </td>
            <td>
                <button class="btn btn-sm btn-secondary" onclick="viewCalculation(${calc.id})" aria-label="Ver cálculo">
                    <i class="fas fa-eye"></i>
                </button>
                <button class="btn btn-sm btn-danger" onclick="deleteCalculation(${calc.id})" aria-label="Excluir cálculo">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        </tr>
    `).join('');
}

function viewCalculation(id) {
    const calculation = AppState.calculations.find(c => c.id === id);
    if (calculation) {
        showModal(`Cálculo de ${new Date(calculation.date).toLocaleDateString('pt-BR')}`, `
            <div class="analysis-grid">
                <div class="analysis-card">
                    <div class="analysis-header">
                        <div class="analysis-icon" style="background: var(--primary-100); color: var(--primary-600);">
                            <i class="fas fa-calculator"></i>
                        </div>
                        <div class="analysis-title">Detalhes</div>
                    </div>
                    <div class="analysis-content">
                        <p><strong>CNPJ:</strong> ${calculation.cnpj || 'Não informado'}</p>
                        <p><strong>Atividade:</strong> ${calculation.activity}</p>
                        <p><strong>Funcionários:</strong> ${calculation.employees || 0}</p>
                        <p><strong>Período:</strong> ${calculation.period || 'Não informado'}</p>
                    </div>
                </div>
                <div class="analysis-card">
                    <div class="analysis-header">
                        <div class="analysis-icon" style="background: rgba(16, 185, 129, 0.1); color: var(--success);">
                            <i class="fas fa-chart-line"></i>
                        </div>
                        <div class="analysis-title">Resultado</div>
                    </div>
                    <div class="analysis-content">
                        <p><strong>Fator R:</strong> ${calculation.factorR}%</p>
                        <p><strong>Receita:</strong> R$ ${calculation.revenue.toLocaleString('pt-BR')}</p>
                        <p><strong>Folha:</strong> R$ ${calculation.payroll.toLocaleString('pt-BR')}</p>
                        <p><strong>Enquadramento:</strong> ${calculation.factorR >= 28 ? 'Anexo III' : 'Anexo V'}</p>
                    </div>
                </div>
            </div>
        `);
    }
}

function deleteCalculation(id) {
    const calculation = AppState.calculations.find(c => c.id === id);
    if (calculation) {
        showModal('Confirmar Exclusão', `
            <p>Tem certeza que deseja excluir o cálculo de <strong>${new Date(calculation.date).toLocaleDateString('pt-BR')}</strong>?</p>
            <p>CNPJ: ${calculation.cnpj || 'Não informado'}</p>
            <p>Esta ação não pode ser desfeita.</p>
        `, () => {
            AppState.calculations = AppState.calculations.filter(c => c.id !== id);
            saveToLocalStorage();
            loadHistoryTable();
            showNotification('Cálculo excluído com sucesso!', 'success');
        });
    }
}

function exportHistory() {
    if (AppState.calculations.length === 0) {
        showNotification('Nenhum histórico para exportar', 'warning');
        return;
    }
    
    exportExcel();
}

function clearHistory() {
    if (AppState.calculations.length === 0) {
        showNotification('Nenhum histórico para limpar', 'info');
        return;
    }
    
    showModal('Limpar Histórico', `
        <p>Tem certeza que deseja limpar todo o histórico de cálculos?</p>
        <p>Esta ação removerá <strong>${AppState.calculations.length}</strong> cálculos e não pode ser desfeita.</p>
    `, () => {
        AppState.calculations = [];
        saveToLocalStorage();
        loadHistoryTable();
        showNotification('Histórico limpo com sucesso!', 'success');
    });
}

// ==================== COMPANY MANAGEMENT ====================
function loadCompaniesTable() {
    const tbody = document.getElementById('companies-table');
    if (!tbody) return;
    
    if (AppState.companies.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="text-center">
                    <p>Nenhuma empresa cadastrada</p>
                    <button class="btn btn-primary mt-md" onclick="openAddCompanyModal()">
                        Adicionar Primeira Empresa
                    </button>
                </td>
            </tr>
        `;
        return;
    }
    
    tbody.innerHTML = AppState.companies.map(company => `
        <tr>
            <td>${company.cnpj || '-'}</td>
            <td>${company.name || '-'}</td>
            <td>${company.activity || '-'}</td>
            <td>${company.factorR || '0'}%</td>
            <td>
                <span class="factor-status ${company.factorR >= 28 ? 'success' : 'danger'}">
                    ${company.factorR >= 28 ? 'Anexo III' : 'Anexo V'}
                </span>
            </td>
            <td>
                <button class="btn btn-sm btn-secondary" onclick="viewCompany(${company.id})" aria-label="Ver empresa">
                    <i class="fas fa-eye"></i>
                </button>
                <button class="btn btn-sm btn-primary" onclick="editCompany(${company.id})" aria-label="Editar empresa">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn btn-sm btn-danger" onclick="deleteCompany(${company.id})" aria-label="Excluir empresa">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        </tr>
    `).join('');
}

function openAddCompanyModal() {
    showModal('Adicionar Empresa', `
        <form id="add-company-form">
            <div class="form-group mb-md">
                <label class="form-label">CNPJ <span class="required">*</span></label>
                <input type="text" class="form-input" id="modal-cnpj" required onkeyup="formatCNPJ(this)" maxlength="18">
            </div>
            <div class="form-group mb-md">
                <label class="form-label">Razão Social <span class="required">*</span></label>
                <input type="text" class="form-input" id="modal-name" required>
            </div>
            <div class="form-group mb-md">
                <label class="form-label">Atividade <span class="required">*</span></label>
                <select class="form-select" id="modal-activity" required>
                    <option value="">Selecione...</option>
                    <option value="comercio">Comércio</option>
                    <option value="industria">Indústria</option>
                    <option value="servicos">Serviços</option>
                </select>
            </div>
            <div class="form-group mb-md">
                <label class="form-label">Email</label>
                <input type="email" class="form-input" id="modal-email">
            </div>
            <div class="form-group">
                <label class="form-label">Telefone</label>
                <input type="tel" class="form-input" id="modal-phone">
            </div>
        </form>
    `, addCompany);
}

function addCompany() {
    const cnpj = document.getElementById('modal-cnpj')?.value;
    const name = document.getElementById('modal-name')?.value;
    const activity = document.getElementById('modal-activity')?.value;
    const email = document.getElementById('modal-email')?.value;
    const phone = document.getElementById('modal-phone')?.value;
    
    if (!cnpj || !name || !activity) {
        showNotification('Preencha os campos obrigatórios', 'warning');
        return;
    }

    if (!validateCNPJ(cnpj)) {
        showNotification('CNPJ inválido', 'warning');
        return;
    }
    
    const company = {
        id: Date.now(),
        cnpj: cnpj,
        name: name,
        activity: activity,
        email: email,
        phone: phone,
        factorR: 0,
        createdAt: new Date().toISOString()
    };
    
    AppState.companies.push(company);
    saveToLocalStorage();
    loadCompaniesTable();
    showNotification('Empresa adicionada com sucesso!', 'success');
    closeModal();
}

function viewCompany(id) {
    const company = AppState.companies.find(c => c.id === id);
    if (company) {
        showModal(`Empresa: ${company.name}`, `
            <div class="mb-md">
                <strong>CNPJ:</strong> ${company.cnpj}<br>
                <strong>Atividade:</strong> ${company.activity}<br>
                <strong>Email:</strong> ${company.email || 'Não informado'}<br>
                <strong>Telefone:</strong> ${company.phone || 'Não informado'}<br>
                <strong>Cadastrada em:</strong> ${new Date(company.createdAt).toLocaleDateString('pt-BR')}
            </div>
            <div class="btn-group">
                <button class="btn btn-primary" onclick="editCompany(${company.id})">Editar</button>
                <button class="btn btn-secondary" onclick="closeModal()">Fechar</button>
            </div>
        `);
    }
}

function editCompany(id) {
    const company = AppState.companies.find(c => c.id === id);
    if (company) {
        showModal('Editar Empresa', `
            <form id="edit-company-form">
                <div class="form-group mb-md">
                    <label class="form-label">CNPJ</label>
                    <input type="text" class="form-input" value="${company.cnpj}" readonly>
                </div>
                <div class="form-group mb-md">
                    <label class="form-label">Razão Social</label>
                    <input type="text" class="form-input" id="edit-name" value="${company.name}" required>
                </div>
                <div class="form-group mb-md">
                    <label class="form-label">Atividade</label>
                    <select class="form-select" id="edit-activity" required>
                        <option value="comercio" ${company.activity === 'comercio' ? 'selected' : ''}>Comércio</option>
                        <option value="industria" ${company.activity === 'industria' ? 'selected' : ''}>Indústria</option>
                        <option value="servicos" ${company.activity === 'servicos' ? 'selected' : ''}>Serviços</option>
                    </select>
                </div>
                <div class="form-group mb-md">
                    <label class="form-label">Email</label>
                    <input type="email" class="form-input" id="edit-email" value="${company.email || ''}">
                </div>
                <div class="form-group">
                    <label class="form-label">Telefone</label>
                    <input type="tel" class="form-input" id="edit-phone" value="${company.phone || ''}">
                </div>
            </form>
        `, () => updateCompany(id));
    }
}

function updateCompany(id) {
    const company = AppState.companies.find(c => c.id === id);
    if (company) {
        company.name = document.getElementById('edit-name')?.value || company.name;
        company.activity = document.getElementById('edit-activity')?.value || company.activity;
        company.email = document.getElementById('edit-email')?.value || company.email;
        company.phone = document.getElementById('edit-phone')?.value || company.phone;
        
        saveToLocalStorage();
        loadCompaniesTable();
        showNotification('Empresa atualizada com sucesso!', 'success');
        closeModal();
    }
}

function deleteCompany(id) {
    const company = AppState.companies.find(c => c.id === id);
    if (company) {
        showModal('Confirmar Exclusão', `
            <p>Tem certeza que deseja excluir a empresa <strong>${company.name}</strong>?</p>
            <p>CNPJ: ${company.cnpj}</p>
            <p>Esta ação não pode ser desfeita.</p>
        `, () => {
            AppState.companies = AppState.companies.filter(c => c.id !== id);
            saveToLocalStorage();
            loadCompaniesTable();
            showNotification('Empresa excluída com sucesso!', 'success');
        });
    }
}

function importCompanies() {
    showNotification('Funcionalidade de importação em desenvolvimento', 'info');
}

// ==================== REPORT GENERATION ====================
function generateMonthlyReport() {
    generateReport('Mensal');
}

function generateQuarterlyReport() {
    generateReport('Trimestral');
}

function generateAnnualReport() {
    generateReport('Anual');
}

function generateComparativeReport() {
    generateReport('Comparativo');
}

function generateCustomReport() {
    const start = document.getElementById('report-start')?.value;
    const end = document.getElementById('report-end')?.value;
    
    if (!start || !end) {
        showNotification('Selecione o período do relatório', 'warning');
        return;
    }
    
    showNotification(`Relatório personalizado gerado (${start} a ${end})`, 'success');
}

function generateReport(type) {
    showNotification(`Relatório ${type} gerado com sucesso!`, 'success');
}

// ==================== SETTINGS ====================
function saveSettings() {
    const autoSave = document.getElementById('auto-save');
    const showTutorial = document.getElementById('show-tutorial');
    
    if (autoSave) AppState.userSettings.autoSave = autoSave.checked;
    if (showTutorial) AppState.userSettings.showTutorial = showTutorial.checked;
    
    saveUserSettings();
    showNotification('Configurações salvas com sucesso!', 'success');
}

function resetSettings() {
    AppState.userSettings = {
        autoSave: true,
        showTutorial: false,
        darkMode: false
    };
    
    const autoSave = document.getElementById('auto-save');
    const showTutorial = document.getElementById('show-tutorial');
    const darkMode = document.getElementById('dark-mode');
    
    if (autoSave) autoSave.checked = true;
    if (showTutorial) showTutorial.checked = false;
    if (darkMode) darkMode.checked = false;
    
    saveUserSettings();
    showNotification('Configurações restauradas para os padrões', 'success');
}

// ==================== USER FUNCTIONS ====================
function showUserProfile() {
    showModal('Meu Perfil', `
        <div class="form-grid">
            <div class="form-group">
                <label class="form-label">Nome</label>
                <input type="text" class="form-input" value="João Silva" readonly>
            </div>
            <div class="form-group">
                <label class="form-label">Email</label>
                <input type="email" class="form-input" value="joao.silva@email.com" readonly>
            </div>
            <div class="form-group">
                <label class="form-label">Tipo de Conta</label>
                <input type="text" class="form-input" value="Contador Premium" readonly>
            </div>
            <div class="form-group">
                <label class="form-label">Data de Cadastro</label>
                <input type="text" class="form-input" value="15/03/2024" readonly>
            </div>
        </div>
    `);
}

function logout() {
    showModal('Sair do Sistema', `
        <p>Tem certeza que deseja sair do sistema?</p>
    `, () => {
        showNotification('Você saiu do sistema', 'info');
        setTimeout(() => {
            window.location.reload();
        }, 2000);
    });
}

function showNotifications() {
    showNotification('Sistema de notificações em desenvolvimento', 'info');
}

// ==================== SEARCH FUNCTIONALITY ====================
function performSearch(query) {
    if (!query || query.length < 2) return;
    
    const results = searchCalculations(query);
    if (results.length > 0) {
        showNotification(`Encontrados ${results.length} resultados para "${query}"`, 'info');
    } else {
        showNotification(`Nenhum resultado encontrado para "${query}"`, 'info');
    }
}

function searchCalculations(query) {
    const lowerQuery = query.toLowerCase();
    return AppState.calculations.filter(calc => 
        (calc.cnpj && calc.cnpj.toLowerCase().includes(lowerQuery)) ||
        (calc.activity && calc.activity.toLowerCase().includes(lowerQuery)) ||
        calc.factorR.toString().includes(lowerQuery)
    );
}

// ==================== ERROR HANDLING ====================
window.addEventListener('error', function(e) {
    console.error('❌ Erro capturado:', e.error);
    showNotification('Ocorreu um erro inesperado', 'danger');
});

window.addEventListener('unhandledrejection', function(e) {
    console.error('❌ Promise rejeitada:', e.reason);
    showNotification('Erro no carregamento', 'danger');
});

// ==================== INITIALIZATION ====================
// Garantir que o loading seja escondido após um tempo
setTimeout(hideLoading, 3000);

// Inicializar com dashboard após um breve delay
setTimeout(() => {
    if (AppState.currentPage === 'dashboard') {
        hideLoading();
    }
}, 1000);

console.log('🎉 FatorR Pro carregado com sucesso!');