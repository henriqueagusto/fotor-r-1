// Global variables
        let currentMode = 'client';
        let calculations = [];
        let chartInstance = null;

        // Initialize
        document.addEventListener('DOMContentLoaded', function() {
            loadHistory();
            initializeMonthlyInputs();
            initializeChart();
        });

        // Mode toggle
        function setMode(mode) {
            currentMode = mode;
            document.querySelectorAll('.mode-btn').forEach(btn => btn.classList.remove('active'));
            event.target.classList.add('active');
            
            if (mode === 'accountant') {
                document.getElementById('detailed-tab').style.display = 'block';
                document.querySelector('.tabs').style.display = 'flex';
                showAdvancedFeatures();
            } else {
                document.getElementById('simple-tab').click();
                hideAdvancedFeatures();
            }
        }

        // Theme toggle
        function toggleTheme() {
            document.body.classList.toggle('dark-mode');
            const themeBtn = document.querySelector('.theme-toggle');
            themeBtn.textContent = document.body.classList.contains('dark-mode') ? '☀️' : '🌙';
        }

        // Section navigation
        function showSection(section) {
            document.querySelectorAll('.calculator-section').forEach(sec => sec.style.display = 'none');
            document.getElementById(`${section}-section`).style.display = 'block';
            
            document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
            event.currentTarget.classList.add('active');
        }

        // Tab navigation
        function showTab(tabName) {
            document.querySelectorAll('.tab').forEach(tab => tab.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
            
            event.target.classList.add('active');
            document.getElementById(`${tabName}-tab`).classList.add('active');
        }

        // Format currency
        function formatCurrency(input) {
            let value = input.value.replace(/\D/g, '');
            value = (value / 100).toFixed(2);
            value = value.replace('.', ',');
            value = value.replace(/(\d)(?=(\d{3})+(?!\d))/g, '$1.');
            input.value = 'R$ ' + value;
        }

        // Parse currency
        function parseCurrency(value) {
            if (!value) return 0;
            return parseFloat(value.replace(/[R$\s.]/g, '').replace(',', '.'));
        }

        // Calculate Simple
        function calculateSimple() {
            const revenue = parseCurrency(document.getElementById('revenue').value);
            const payroll = parseCurrency(document.getElementById('payroll').value);
            const currentAnnex = document.getElementById('current-annex').value;
            const employees = parseInt(document.getElementById('employees').value) || 0;
            
            if (revenue === 0) {
                showAlert('Por favor, insira a receita bruta', 'warning');
                return;
            }
            
            const factorR = (payroll / revenue * 100).toFixed(2);
            
            displayResults(factorR, revenue, payroll, currentAnnex, employees);
            saveToHistory(factorR, revenue, payroll);
            
            document.getElementById('results').classList.add('show');
        }

        // Display Results
        function displayResults(factorR, revenue, payroll, annex, employees) {
            const factorValue = parseFloat(factorR);
            const resultBadge = document.getElementById('result-badge');
            const resultValue = document.getElementById('factor-r-value');
            const resultDesc = document.getElementById('result-description');
            const progressFill = document.getElementById('progress-fill');
            
            // Update main result
            resultValue.textContent = `${factorR}%`;
            progressFill.style.width = `${Math.min(factorValue / 28 * 100, 100)}%`;
            
            // Determine status
            if (factorValue >= 28) {
                resultBadge.textContent = 'Anexo III';
                resultBadge.className = 'result-badge badge-success';
                resultDesc.textContent = 'Excelente! Sua empresa pode usar o Anexo III com alíquotas reduzidas.';
            } else if (factorValue >= 20) {
                resultBadge.textContent = 'Próximo';
                resultBadge.className = 'result-badge badge-warning';
                resultDesc.textContent = `Falta pouco! Aumente a folha em R$ ${((0.28 * revenue - payroll)).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, '.')} para atingir 28%.`;
            } else {
                resultBadge.textContent = 'Anexo V';
                resultBadge.className = 'result-badge badge-danger';
                resultDesc.textContent = 'Sua empresa está enquadrada no Anexo V. Considere estratégias para aumentar o Fator R.';
            }
            
            // Update dashboard cards
            updateDashboard(factorR, revenue, payroll, employees);
            
            // Generate recommendations
            generateRecommendations(factorR, revenue, payroll, employees);
            
            // Update chart
            updateChart(factorR);
        }

        // Update Dashboard
        function updateDashboard(factorR, revenue, payroll, employees) {
            const factorValue = parseFloat(factorR);
            const requiredPayroll = revenue * 0.28;
            const difference = requiredPayroll - payroll;
            
            // Calculate potential savings
            let savings = 0;
            if (factorValue < 28) {
                // Estimate savings if moving from Anexo V to III
                const currentTax = revenue * 0.155; // Average Anexo V
                const potentialTax = revenue * 0.06; // Average Anexo III
                savings = currentTax - potentialTax;
            }
            
            document.getElementById('savings').textContent = `R$ ${savings.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, '.')}`;
            document.getElementById('effective-rate').textContent = factorValue >= 28 ? '6%' : '15.5%';
            document.getElementById('required-payroll').textContent = difference > 0 ? 
                `R$ ${difference.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, '.')}` : 'Atingido ✓';
        }

        // Generate Recommendations
        function generateRecommendations(factorR, revenue, payroll, employees) {
            const recommendations = [];
            const factorValue = parseFloat(factorR);
            
            if (factorValue < 28) {
                const needed = (0.28 * revenue - payroll);
                const monthlyIncrease = needed / 12;
                
                recommendations.push({
                    icon: '💼',
                    text: `Aumente a folha em R$ ${monthlyIncrease.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, '.')} por mês para atingir 28%`
                });
                
                if (employees > 0) {
                    const avgSalary = payroll / employees / 12;
                    const newEmployees = Math.ceil(needed / (avgSalary * 12));
                    recommendations.push({
                        icon: '👥',
                        text: `Contrate ${newEmployees} funcionário(s) com salário médio de R$ ${avgSalary.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, '.')}`
                    });
                }
                
                recommendations.push({
                    icon: '📊',
                    text: 'Considere aumentar o pró-labore dos sócios'
                });
                
                recommendations.push({
                    icon: '💡',
                    text: 'Avalie a inclusão de benefícios que componham a folha (vale-transporte, vale-alimentação)'
                });
            } else {
                recommendations.push({
                    icon: '✅',
                    text: 'Mantenha o Fator R acima de 28% para continuar no Anexo III'
                });
                
                recommendations.push({
                    icon: '📈',
                    text: 'Monitore mensalmente para evitar quedas abruptas'
                });
                
                recommendations.push({
                    icon: '💰',
                    text: `Você está economizando aproximadamente R$ ${(revenue * 0.095).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, '.')} em impostos`
                });
            }
            
            const recList = document.getElementById('recommendations-list');
            recList.innerHTML = recommendations.map(rec => `
                <div class="recommendation-item">
                    <span class="recommendation-icon">${rec.icon}</span>
                    <span>${rec.text}</span>
                </div>
            `).join('');
        }

        // Initialize Chart
        function initializeChart() {
            const ctx = document.getElementById('factorChart');
            if (!ctx) return;
            
            chartInstance = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'],
                    datasets: [{
                        label: 'Fator R (%)',
                        data: [],
                        borderColor: '#6366f1',
                        backgroundColor: 'rgba(99, 102, 241, 0.1)',
                        tension: 0.4,
                        fill: true
                    }, {
                        label: 'Meta (28%)',
                        data: new Array(12).fill(28),
                        borderColor: '#10b981',
                        borderDash: [5, 5],
                        fill: false
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            labels: {
                                color: 'white'
                            }
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            max: 40,
                            ticks: {
                                color: 'rgba(255, 255, 255, 0.7)'
                            },
                            grid: {
                                color: 'rgba(255, 255, 255, 0.1)'
                            }
                        },
                        x: {
                            ticks: {
                                color: 'rgba(255, 255, 255, 0.7)'
                            },
                            grid: {
                                color: 'rgba(255, 255, 255, 0.1)'
                            }
                        }
                    }
                }
            });
        }

        // Update Chart
        function updateChart(factorR) {
            if (!chartInstance) return;
            
            const data = chartInstance.data.datasets[0].data;
            data.push(parseFloat(factorR));
            if (data.length > 12) data.shift();
            
            chartInstance.update();
        }

        // Initialize Monthly Inputs
        function initializeMonthlyInputs() {
            const container = document.getElementById('monthly-inputs');
            if (!container) return;
            
            const months = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 
                          'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
            
            let html = '<div class="table-container"><table class="table"><thead><tr><th>Mês</th><th>Receita Bruta</th><th>Folha de Salários</th><th>Fator R</th></tr></thead><tbody>';
            
            months.forEach((month, index) => {
                html += `
                    <tr>
                        <td>${month}</td>
                        <td><input type="text" class="form-input" id="revenue-${index}" placeholder="R$ 0,00" onkeyup="formatCurrency(this); calculateMonthly(${index})"></td>
                        <td><input type="text" class="form-input" id="payroll-${index}" placeholder="R$ 0,00" onkeyup="formatCurrency(this); calculateMonthly(${index})"></td>
                        <td id="factor-${index}">-</td>
                    </tr>
                `;
            });
            
            html += '</tbody></table></div>';
            container.innerHTML = html;
        }

        // Calculate Monthly
        function calculateMonthly(index) {
            const revenue = parseCurrency(document.getElementById(`revenue-${index}`).value);
            const payroll = parseCurrency(document.getElementById(`payroll-${index}`).value);
            
            if (revenue > 0) {
                const factor = (payroll / revenue * 100).toFixed(2);
                document.getElementById(`factor-${index}`).textContent = `${factor}%`;
            }
        }

        // Calculate Detailed
        function calculateDetailed() {
            let totalRevenue = 0;
            let totalPayroll = 0;
            
            for (let i = 0; i < 12; i++) {
                totalRevenue += parseCurrency(document.getElementById(`revenue-${i}`)?.value);
                totalPayroll += parseCurrency(document.getElementById(`payroll-${i}`)?.value);
            }
            
            if (totalRevenue === 0) {
                showAlert('Por favor, insira os dados mensais', 'warning');
                return;
            }
            
            const factorR = (totalPayroll / totalRevenue * 100).toFixed(2);
            displayResults(factorR, totalRevenue, totalPayroll, '', 0);
            document.getElementById('results').classList.add('show');
        }

        // Run Simulation
        function runSimulation() {
            const revenue = parseCurrency(document.getElementById('revenue').value);
            const payroll = parseCurrency(document.getElementById('payroll').value);
            const payrollIncrease = parseFloat(document.getElementById('payroll-increase').value) || 0;
            const revenueProjection = parseFloat(document.getElementById('revenue-projection').value) || 0;
            const newEmployees = parseInt(document.getElementById('new-employees').value) || 0;
            const avgSalary = parseCurrency(document.getElementById('avg-salary').value);
            
            if (revenue === 0 || payroll === 0) {
                showAlert('Por favor, calcule o Fator R atual primeiro', 'warning');
                return;
            }
            
            // Calculate new values
            const newRevenue = revenue * (1 + revenueProjection / 100);
            const additionalPayroll = newEmployees * avgSalary * 12;
            const newPayroll = payroll * (1 + payrollIncrease / 100) + additionalPayroll;
            const newFactorR = (newPayroll / newRevenue * 100).toFixed(2);
            
            // Show simulation results
            const modalBody = `
                <h4 style="color: white; margin-bottom: 1rem;">Resultado da Simulação</h4>
                <div class="result-card">
                    <p style="color: rgba(255, 255, 255, 0.9);">
                        <strong>Cenário Atual:</strong><br>
                        Fator R: ${(payroll / revenue * 100).toFixed(2)}%<br>
                        Receita: R$ ${revenue.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, '.')}<br>
                        Folha: R$ ${payroll.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, '.')}
                    </p>
                </div>
                <div class="result-card" style="margin-top: 1rem;">
                    <p style="color: rgba(255, 255, 255, 0.9);">
                        <strong>Cenário Simulado:</strong><br>
                        Fator R: ${newFactorR}%<br>
                        Receita: R$ ${newRevenue.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, '.')}<br>
                        Folha: R$ ${newPayroll.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, '.')}
                    </p>
                </div>
                <div class="alert ${parseFloat(newFactorR) >= 28 ? 'alert-success' : 'alert-warning'}" style="margin-top: 1rem;">
                    <span>${parseFloat(newFactorR) >= 28 ? '✅' : '⚠️'}</span>
                    <span>${parseFloat(newFactorR) >= 28 ? 
                        'Excelente! O cenário simulado mantém o Fator R acima de 28%' : 
                        'Atenção! O cenário simulado resulta em Fator R abaixo de 28%'}</span>
                </div>
            `;
            
            showModal('Simulação de Cenários', modalBody);
        }

        // Generate PDF
        function generatePDF() {
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF();
            
            // Get current data
            const revenue = parseCurrency(document.getElementById('revenue').value);
            const payroll = parseCurrency(document.getElementById('payroll').value);
            const factorR = document.getElementById('factor-r-value').textContent;
            const date = new Date().toLocaleDateString('pt-BR');
            
            // Header
            doc.setFontSize(20);
            doc.setTextColor(99, 102, 241);
            doc.text('Relatório do Fator R', 105, 20, { align: 'center' });
            
            // Company info
            doc.setFontSize(12);
            doc.setTextColor(0, 0, 0);
            doc.text(`Data: ${date}`, 20, 40);
            
            // Main content
            doc.setFontSize(14);
            doc.text('Resumo do Cálculo', 20, 60);
            
            doc.setFontSize(11);
            doc.text(`Receita Bruta (12 meses): R$ ${revenue.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, '.')}`, 20, 75);
            doc.text(`Folha de Salários (12 meses): R$ ${payroll.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, '.')}`, 20, 85);
            
            // Result box
            doc.setFillColor(99, 102, 241);
            doc.rect(20, 95, 170, 20, 'F');
            doc.setTextColor(255, 255, 255);
            doc.setFontSize(16);
            doc.text(`Fator R Calculado: ${factorR}`, 105, 107, { align: 'center' });
            
            // Analysis
            doc.setTextColor(0, 0, 0);
            doc.setFontSize(12);
            doc.text('Análise:', 20, 130);
            
            doc.setFontSize(10);
            const analysis = document.getElementById('result-description').textContent;
            const lines = doc.splitTextToSize(analysis, 170);
            doc.text(lines, 20, 140);
            
            // Recommendations
            doc.setFontSize(12);
            doc.text('Recomendações:', 20, 170);
            
            doc.setFontSize(10);
            const recommendations = document.querySelectorAll('.recommendation-item');
            let yPos = 180;
            recommendations.forEach((rec, index) => {
                if (yPos > 270) {
                    doc.addPage();
                    yPos = 20;
                }
                const text = rec.textContent.trim();
                const lines = doc.splitTextToSize(`${index + 1}. ${text}`, 170);
                doc.text(lines, 20, yPos);
                yPos += lines.length * 5 + 5;
            });
            
            // Footer
            doc.setFontSize(8);
            doc.setTextColor(128, 128, 128);
            doc.text('Relatório gerado por Fator R Pro - www.fatorrpro.com.br', 105, 290, { align: 'center' });
            
            // Save
            doc.save(`relatorio-fator-r-${date.replace(/\//g, '-')}.pdf`);
            
            showAlert('PDF gerado com sucesso!', 'success');
        }

        // Save Calculation
        function saveCalculation() {
            const revenue = parseCurrency(document.getElementById('revenue').value);
            const payroll = parseCurrency(document.getElementById('payroll').value);
            const factorR = document.getElementById('factor-r-value').textContent;
            
            const calculation = {
                id: Date.now(),
                date: new Date().toISOString(),
                revenue: revenue,
                payroll: payroll,
                factorR: factorR,
                status: parseFloat(factorR) >= 28 ? 'Anexo III' : 'Anexo V'
            };
            
            calculations.push(calculation);
            localStorage.setItem('factorRCalculations', JSON.stringify(calculations));
            
            showAlert('Cálculo salvo com sucesso!', 'success');
            loadHistory();
        }

        // Load History
        function loadHistory() {
            const saved = localStorage.getItem('factorRCalculations');
            if (saved) {
                calculations = JSON.parse(saved);
                displayHistory();
            }
        }

        // Display History
        function displayHistory() {
            const tbody = document.getElementById('history-table');
            if (!tbody) return;
            
            tbody.innerHTML = calculations.slice(-10).reverse().map(calc => {
                const date = new Date(calc.date).toLocaleDateString('pt-BR');
                return `
                    <tr>
                        <td>${date}</td>
                        <td>R$ ${calc.revenue.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, '.')}</td>
                        <td>R$ ${calc.payroll.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, '.')}</td>
                        <td>${calc.factorR}</td>
                        <td><span class="result-badge ${calc.status === 'Anexo III' ? 'badge-success' : 'badge-danger'}">${calc.status}</span></td>
                        <td>
                            <button class="btn btn-secondary" style="padding: 0.5rem 1rem;" onclick="loadCalculation(${calc.id})">
                                <span>📂</span> Carregar
                            </button>
                        </td>
                    </tr>
                `;
            }).join('');
        }

        // Load Calculation
        function loadCalculation(id) {
            const calc = calculations.find(c => c.id === id);
            if (calc) {
                document.getElementById('revenue').value = `R$ ${calc.revenue.toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.')}`;
                document.getElementById('payroll').value = `R$ ${calc.payroll.toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.')}`;
                calculateSimple();
                showSection('calculator');
            }
        }

        // Save to History
        function saveToHistory(factorR, revenue, payroll) {
            const historyItem = {
                date: new Date().toISOString(),
                factorR: factorR,
                revenue: revenue,
                payroll: payroll
            };
            
            let history = JSON.parse(localStorage.getItem('factorRHistory') || '[]');
            history.push(historyItem);
            if (history.length > 12) history.shift();
            localStorage.setItem('factorRHistory', JSON.stringify(history));
        }

        // Import Data
        function importData() {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = '.csv,.xlsx';
            input.onchange = function(e) {
                const file = e.target.files[0];
                if (file) {
                    showAlert('Importação em desenvolvimento', 'info');
                }
            };
            input.click();
        }

        // Share Results
        function shareResults() {
            const factorR = document.getElementById('factor-r-value').textContent;
            const text = `Meu Fator R calculado: ${factorR} - Calcule o seu em www.fatorrpro.com.br`;
            
            if (navigator.share) {
                navigator.share({
                    title: 'Resultado do Fator R',
                    text: text,
                    url: window.location.href
                });
            } else {
                navigator.clipboard.writeText(text);
                showAlert('Link copiado para a área de transferência!', 'success');
            }
        }

        // Clear Form
        function clearForm() {
            document.getElementById('simple-form').reset();
            document.getElementById('results').classList.remove('show');
        }

        // Show/Hide Advanced Features
        function showAdvancedFeatures() {
            document.querySelectorAll('.nav-item').forEach(item => item.style.display = 'flex');
        }

        function hideAdvancedFeatures() {
            const basicSections = ['calculator', 'guide'];
            document.querySelectorAll('.nav-item').forEach((item, index) => {
                if (index > 1 && index < 4) {
                    item.style.display = 'none';
                }
            });
        }

        // Show Alert
        function showAlert(message, type) {
            const alertDiv = document.createElement('div');
            alertDiv.className = `alert alert-${type}`;
            alertDiv.innerHTML = `
                <span>${type === 'success' ? '✅' : type === 'warning' ? '⚠️' : 'ℹ️'}</span>
                <span>${message}</span>
            `;
            
            const firstSection = document.querySelector('.calculator-section');
            firstSection.insertBefore(alertDiv, firstSection.firstChild);
            
            setTimeout(() => alertDiv.remove(), 3000);
        }

        // Modal Functions
        function showModal(title, content) {
            document.getElementById('modal-title').textContent = title;
            document.getElementById('modal-body').innerHTML = content;
            document.getElementById('modal').classList.add('show');
        }

        function closeModal() {
            document.getElementById('modal').classList.remove('show');
        }

        // Guide Content
        const guideSection = document.getElementById('guide-section');
        if (guideSection) {
            const guideContent = `
                <div class="alert alert-info">
                    <span>📚</span>
                    <span>Este guia completo ajudará você a entender e otimizar o Fator R da sua empresa</span>
                </div>
                
                <div class="result-card">
                    <h3 style="color: white; margin-bottom: 1rem;">O que é o Fator R?</h3>
                    <p class="result-description">
                        O Fator R é um índice percentual que representa a relação entre a folha de salários e a receita bruta 
                        da empresa nos últimos 12 meses. É fundamental para empresas de serviços no Simples Nacional, pois 
                        determina em qual anexo a empresa será tributada.
                    </p>
                </div>
                
                <div class="result-card">
                    <h3 style="color: white; margin-bottom: 1rem;">Como Calcular?</h3>
                    <p class="result-description" style="margin-bottom: 1rem;">
                        <strong>Fórmula:</strong> Fator R = (Folha de Salários ÷ Receita Bruta) × 100
                    </p>
                    <ul style="color: rgba(255, 255, 255, 0.9); list-style: none; padding: 0;">
                        <li style="margin-bottom: 0.5rem;">✓ Folha de Salários: Soma dos últimos 12 meses</li>
                        <li style="margin-bottom: 0.5rem;">✓ Receita Bruta: Faturamento dos últimos 12 meses</li>
                        <li style="margin-bottom: 0.5rem;">✓ Resultado: Percentual que define o anexo</li>
                    </ul>
                </div>
                
                <div class="result-card">
                    <h3 style="color: white; margin-bottom: 1rem;">O que Compõe a Folha?</h3>
                    <ul style="color: rgba(255, 255, 255, 0.9); list-style: none; padding: 0;">
                        <li style="margin-bottom: 0.5rem;">💰 Salários e remunerações</li>
                        <li style="margin-bottom: 0.5rem;">💼 Pró-labore dos sócios</li>
                        <li style="margin-bottom: 0.5rem;">📊 13º salário</li>
                        <li style="margin-bottom: 0.5rem;">🏖️ Férias</li>
                        <li style="margin-bottom: 0.5rem;">🏦 FGTS</li>
                        <li style="margin-bottom: 0.5rem;">🏢 INSS patronal</li>
                        <li style="margin-bottom: 0.5rem;">🎯 Contribuições previdenciárias</li>
                    </ul>
                </div>
                
                <div class="result-card">
                    <h3 style="color: white; margin-bottom: 1rem;">Anexos do Simples Nacional</h3>
                    <div class="table-container">
                        <table class="table">
                            <thead>
                                <tr>
                                    <th>Anexo</th>
                                    <th>Atividade</th>
                                    <th>Alíquota Inicial</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td>Anexo I</td>
                                    <td>Comércio</td>
                                    <td>4%</td>
                                </tr>
                                <tr>
                                    <td>Anexo II</td>
                                    <td>Indústria</td>
                                    <td>4,5%</td>
                                </tr>
                                <tr>
                                    <td>Anexo III</td>
                                    <td>Serviços (R ≥ 28%)</td>
                                    <td>6%</td>
                                </tr>
                                <tr>
                                    <td>Anexo IV</td>
                                    <td>Serviços específicos</td>
                                    <td>4,5%</td>
                                </tr>
                                <tr>
                                    <td>Anexo V</td>
                                    <td>Serviços (R < 28%)</td>
                                    <td>15,5%</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
                
                <div class="recommendations">
                    <h3 style="color: white; margin-bottom: 1rem;">💡 Estratégias para Aumentar o Fator R</h3>
                    <div class="recommendation-item">
                        <span class="recommendation-icon">1</span>
                        <span>Aumente o pró-labore dos sócios (conta como folha)</span>
                    </div>
                    <div class="recommendation-item">
                        <span class="recommendation-icon">2</span>
                        <span>Contrate funcionários CLT em vez de terceirizar</span>
                    </div>
                    <div class="recommendation-item">
                        <span class="recommendation-icon">3</span>
                        <span>Registre corretamente todos os benefícios na folha</span>
                    </div>
                    <div class="recommendation-item">
                        <span class="recommendation-icon">4</span>
                        <span>Antecipe contratações planejadas</span>
                    </div>
                    <div class="recommendation-item">
                        <span class="recommendation-icon">5</span>
                        <span>Revise a estrutura de remuneração da empresa</span>
                    </div>
                </div>
            `;
            
            guideSection.querySelector('.guide-content').innerHTML = guideContent;
        }

        // Initialize Annexes Content
        const annexesSection = document.getElementById('annexes-section');
        if (annexesSection) {
            annexesSection.innerHTML = `
                <div class="section-header">
                    <h2 class="section-title">Tabelas dos Anexos I-V</h2>
                    <p class="section-subtitle">Alíquotas e deduções do Simples Nacional 2024/2025</p>
                </div>
                
                <div class="tabs">
                    <button class="tab active" onclick="showAnnexTab(1)">Anexo I</button>
                    <button class="tab" onclick="showAnnexTab(2)">Anexo II</button>
                    <button class="tab" onclick="showAnnexTab(3)">Anexo III</button>
                    <button class="tab" onclick="showAnnexTab(4)">Anexo IV</button>
                    <button class="tab" onclick="showAnnexTab(5)">Anexo V</button>
                </div>
                
                <div id="annex-content"></div>
            `;
        }

        // Show Annex Tab
        function showAnnexTab(annex) {
            const tabs = document.querySelectorAll('#annexes-section .tab');
            tabs.forEach(tab => tab.classList.remove('active'));
            event.target.classList.add('active');
            
            const annexData = {
                1: { name: 'Comércio', rates: [[180000, 4, 0], [360000, 7.3, 5940], [720000, 9.5, 13860], [1800000, 10.7, 22500], [3600000, 14.3, 87300], [4800000, 19, 378000]] },
                2: { name: 'Indústria', rates: [[180000, 4.5, 0], [360000, 7.8, 5940], [720000, 10, 13860], [1800000, 11.2, 22500], [3600000, 14.7, 85500], [4800000, 30, 720000]] },
                3: { name: 'Serviços (R ≥ 28%)', rates: [[180000, 6, 0], [360000, 11.2, 9360], [720000, 13.5, 17640], [1800000, 16, 35640], [3600000, 21, 125640], [4800000, 33, 648000]] },
                4: { name: 'Serviços Específicos', rates: [[180000, 4.5, 0], [360000, 9, 8100], [720000, 10.2, 12420], [1800000, 14, 39780], [3600000, 22, 183780], [4800000, 33, 828000]] },
                5: { name: 'Serviços (R < 28%)', rates: [[180000, 15.5, 0], [360000, 18, 4500], [720000, 19.5, 9900], [1800000, 20.5, 17100], [3600000, 23, 62100], [4800000, 30.5, 540000]] }
            };
            
            const data = annexData[annex];
            let html = `
                <div class="result-card">
                    <h3 style="color: white; margin-bottom: 1rem;">Anexo ${annex} - ${data.name}</h3>
                    <div class="table-container">
                        <table class="table">
                            <thead>
                                <tr>
                                    <th>Receita Bruta (12 meses)</th>
                                    <th>Alíquota</th>
                                    <th>Dedução</th>
                                </tr>
                            </thead>
                            <tbody>
            `;
            
            data.rates.forEach((rate, index) => {
                const prev = index > 0 ? data.rates[index-1][0] : 0;
                html += `
                    <tr>
                        <td>De R$ ${prev.toLocaleString('pt-BR')} a R$ ${rate[0].toLocaleString('pt-BR')}</td>
                        <td>${rate[1]}%</td>
                        <td>R$ ${rate[2].toLocaleString('pt-BR')}</td>
                    </tr>
                `;
            });
            
            html += `
                            </tbody>
                        </table>
                    </div>
                </div>
            `;
            
            document.getElementById('annex-content').innerHTML = html;
        }

        // Initialize Reports Section
        const reportsSection = document.getElementById('reports-section');
        if (reportsSection) {
            reportsSection.innerHTML = `
                <div class="section-header">
                    <h2 class="section-title">Central de Relatórios</h2>
                    <p class="section-subtitle">Gere relatórios personalizados e análises detalhadas</p>
                </div>
                
                <div class="dashboard-grid">
                    <div class="stat-card" style="cursor: pointer;" onclick="generateReport('mensal')">
                        <div class="stat-icon">📅</div>
                        <div class="stat-label">Relatório Mensal</div>
                        <div class="stat-value" style="font-size: 1rem;">Gerar</div>
                    </div>
                    <div class="stat-card" style="cursor: pointer;" onclick="generateReport('trimestral')">
                        <div class="stat-icon">📊</div>
                        <div class="stat-label">Relatório Trimestral</div>
                        <div class="stat-value" style="font-size: 1rem;">Gerar</div>
                    </div>
                    <div class="stat-card" style="cursor: pointer;" onclick="generateReport('anual')">
                        <div class="stat-icon">📈</div>
                        <div class="stat-label">Relatório Anual</div>
                        <div class="stat-value" style="font-size: 1rem;">Gerar</div>
                    </div>
                    <div class="stat-card" style="cursor: pointer;" onclick="generateReport('comparativo')">
                        <div class="stat-icon">🔄</div>
                        <div class="stat-label">Análise Comparativa</div>
                        <div class="stat-value" style="font-size: 1rem;">Gerar</div>
                    </div>
                </div>
            `;
        }

        // Generate Report
        function generateReport(type) {
            showAlert(`Gerando relatório ${type}...`, 'info');
            setTimeout(() => {
                generatePDF();
            }, 1000);
        }

        // Initialize everything on page load
        window.addEventListener('load', function() {
            // Set initial theme
            toggleTheme();
            
            // Initialize first annex tab
            if (document.getElementById('annexes-section')) {
                showAnnexTab(1);
            }
        });