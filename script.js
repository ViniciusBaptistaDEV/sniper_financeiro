const app = {
    state: {
        isLogged: false,
        isLoggingOut: false,
        data: { captacoes: [], operacoes: [] },
        metaFixa: 50000 // Exemplo de meta de lucro guardado
    },

    // Helper para formatar valores monetários com 2 casas decimais
    formatCurrency(val) {
        return parseFloat(val || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    },

    // Impede a digitação de letras e caracteres especiais (apenas números, ponto e vírgula)
    handleInputCurrency(el) {
        el.value = el.value.replace(/[^0-9.,]/g, '');
    },

    // Converte string formatada (7.500,00) de volta para número (7500.00)
    parseCurrency(val) {
        if (typeof val === 'number') return val;
        return parseFloat(val.replace(/\./g, '').replace(',', '.')) || 0;
    },

    handleBlurCurrency(el) {
        if (!el.value) return;
        const numericValue = this.parseCurrency(el.value);
        el.value = this.formatCurrency(numericValue);
    },

    handleFocusCurrency(el) {
        if (!el.value) return;
        el.value = this.parseCurrency(el.value).toString().replace('.', ',');
    },

    showAlert(message, title = 'NOTIFICAÇÃO', type = 'info') {
        const modal = document.getElementById('alert-modal');
        const titleEl = document.getElementById('alert-title');
        const messageEl = document.getElementById('alert-message');
        const iconBox = document.getElementById('alert-icon');

        titleEl.innerText = title;
        messageEl.innerText = message;
        
        const icon = type === 'success' ? 'fa-circle-check' : (type === 'error' ? 'fa-triangle-exclamation' : 'fa-circle-info');
        iconBox.innerHTML = `<i class="fa-solid ${icon}"></i>`;
        iconBox.style.color = type === 'success' ? 'var(--neon-green)' : (type === 'error' ? '#ff4444' : 'var(--neon-blue)');
        
        modal.classList.remove('hidden');
    },

    closeAlert() {
        document.getElementById('alert-modal').classList.add('hidden');
        if (this.state.isLoggingOut) {
            location.reload();
        }
    },

    async handleLogin() {
        const user = document.getElementById('login-user').value;
        const pass = document.getElementById('login-pass').value;
        const btn = document.getElementById('btn-login');

        // Estado de carregamento
        const originalContent = btn.innerHTML;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Entrando...';
        btn.style.pointerEvents = 'none';
        btn.style.opacity = '0.8';

        const res = await fetch('/api/login', {
            method: 'POST',
            body: JSON.stringify({ user, pass })
        });

        if (res.ok) {
            const { token } = await res.json();
            sessionStorage.setItem('sniper_token', token);
            this.init();
        } else {
            this.showAlert('As credenciais informadas estão incorretas.', 'ACESSO NEGADO', 'error');
            
            // Limpar campos e resetar o foco para o usuário
            document.getElementById('login-user').value = '';
            document.getElementById('login-pass').value = '';
            document.getElementById('login-user').focus();

            // Reverter botão em caso de erro
            btn.innerHTML = originalContent;
            btn.style.pointerEvents = 'auto';
            btn.style.opacity = '1';
        }
    },

    async init() {
        const token = sessionStorage.getItem('sniper_token');
        if (!token) return;

        document.getElementById('login-overlay').classList.add('hidden');
        document.getElementById('app-content').classList.remove('hidden');
        this.toggleFormFields();
        await this.loadData();
    },

    async loadData() {
        const res = await fetch('/api/get-data', {
            headers: { 'Authorization': sessionStorage.getItem('sniper_token') }
        });
        const responseData = await res.json();
        this.state.data = responseData;
        
        if (responseData.config && responseData.config.meta_objetivo) {
            this.state.metaFixa = parseFloat(responseData.config.meta_objetivo);
        }
        
        this.renderDashboard();
        this.renderTable();
    },

    renderDashboard() {
        const ops = this.state.data.operacoes;
        const caps = this.state.data.captacoes;

        // Cálculos
        const lucroGuardado = ops.reduce((acc, curr) => acc + (parseFloat(curr.lucro_guardado) || 0), 0);
        const capitalAtivo = ops.filter(o => o.status === 'Em Andamento')
                                .reduce((acc, curr) => acc + (parseFloat(curr.valor_emprestado) || 0), 0);
        
        // ROI Médio (Lucro Bruto / Valor Emprestado)
        const opsFinalizadas = ops.filter(o => o.status === 'Finalizada');
        const roiMedio = opsFinalizadas.length > 0 
            ? (opsFinalizadas.reduce((acc, curr) => acc + (curr.lucro_bruto_recebido / curr.valor_emprestado), 0) / opsFinalizadas.length) * 100 
            : 0;

        // Atualizar UI
        document.getElementById('kpi-lucro-guardado').innerText = `R$ ${this.formatCurrency(lucroGuardado)}`;
        document.getElementById('kpi-capital-ativo').innerText = `R$ ${this.formatCurrency(capitalAtivo)}`;
        document.getElementById('kpi-roi').innerText = `${roiMedio.toFixed(2)}%`;
        
        // Barra de Progresso
        const perc = Math.min((lucroGuardado / this.state.metaFixa) * 100, 100);
        document.getElementById('progress-bar').style.width = `${perc}%`;
        document.getElementById('progress-text').innerText = `${perc.toFixed(2)}% da meta de R$ ${this.formatCurrency(this.state.metaFixa)}`;
        document.getElementById('input-meta-objetivo').value = this.formatCurrency(this.state.metaFixa);
    },

    renderTable() {
        const tbody = document.querySelector('#ops-table tbody');
        tbody.innerHTML = this.state.data.operacoes.map(op => `
            <tr>
                <td>${op.data_inicio}</td>
                <td>R$ ${this.formatCurrency(op.valor_emprestado)}</td>
                <td>R$ ${this.formatCurrency(op.lucro_bruto_recebido)}</td>
                <td><span class="badge ${op.status === 'Finalizada' ? 'green' : 'blue'}">${op.status}</span></td>
                <td><button onclick="app.openEditModal('${op.id_operacao}')">Editar</button></td>
            </tr>
        `).join('');
    },

    switchTab(tabId) {
        document.querySelectorAll('.tab-content').forEach(t => t.classList.add('hidden'));
        document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
        document.getElementById(`tab-${tabId}`).classList.remove('hidden');
        event.currentTarget.classList.add('active');
    },

    toggleFormFields() {
        const type = document.getElementById('entry-type').value;
        const container = document.getElementById('form-fields');

        // Pequena animação de transição
        container.style.opacity = '0';
        container.style.transform = 'translateY(10px)';
        container.style.transition = 'all 0.3s ease';

        setTimeout(() => {
            if (type === 'captacao') {
                container.innerHTML = `
                    <div class="input-group date-input-group">
                        <label>Data</label>
                        <i class="fas fa-calendar-alt"></i>
                        <input type="date" name="data_emprestimo" required>
                    </div>
                    <div class="input-group">
                        <label>Valor Principal (R$)</label>
                        <i class="fas fa-hand-holding-usd"></i>
                        <input type="text" name="valor_pegado" placeholder="0,00" required oninput="app.handleInputCurrency(this)" onfocus="app.handleFocusCurrency(this)" onblur="app.handleBlurCurrency(this)">
                    </div>
                    <div class="grid-2-col">
                        <div class="input-group">
                            <label>Valor Parcela (R$)</label>
                            <i class="fas fa-receipt"></i>
                            <input type="text" name="valor_parcela" placeholder="0,00" oninput="app.handleInputCurrency(this)" onfocus="app.handleFocusCurrency(this)" onblur="app.handleBlurCurrency(this)">
                        </div>
                        <div class="input-group">
                            <label>Qtd. Parcelas</label>
                            <i class="fas fa-list-ol"></i>
                            <input type="number" name="qtd_parcelas" placeholder="12">
                        </div>
                    </div>
                `;
            } else {
                const options = this.state.data.captacoes.map(c => `<option value="${c.id_captacao}">Captação #${c.id_captacao} (R$ ${this.formatCurrency(c.valor_pegado)})</option>`);
                container.innerHTML = `
                    <div class="input-group">
                        <label>Vincular à Captação</label>
                        <i class="fas fa-link"></i>
                        <select name="id_captacao_ref" required>${options}</select>
                    </div>
                    <div class="input-group date-input-group">
                        <label>Data do Empréstimo</label>
                        <i class="fas fa-calendar-check"></i>
                        <input type="date" name="data_inicio" required>
                    </div>
                    <div class="input-group">
                        <label>Valor Emprestado (R$)</label>
                        <i class="fas fa-money-bill-wave"></i>
                        <input type="text" name="valor_emprestado" placeholder="0,00" required oninput="app.handleInputCurrency(this)" onfocus="app.handleFocusCurrency(this)" onblur="app.handleBlurCurrency(this)">
                    </div>
                    <input type="hidden" name="status" value="Em Andamento">
                `;
            }
            container.style.opacity = '1';
            container.style.transform = 'translateY(0)';
        }, 50);
    },

    async handleSubmit(e) {
        e.preventDefault();
        const formData = new FormData(e.target);
        let data = Object.fromEntries(formData.entries());
        
        // Limpar campos monetários antes de enviar
        if (data.valor_pegado) data.valor_pegado = this.parseCurrency(data.valor_pegado);
        if (data.valor_parcela) data.valor_parcela = this.parseCurrency(data.valor_parcela);
        if (data.valor_emprestado) data.valor_emprestado = this.parseCurrency(data.valor_emprestado);
        
        data.type = document.getElementById('entry-type').value;

        const btn = e.target.querySelector('button[type="submit"]');
        const originalContent = btn.innerHTML;

        // Estado de carregamento
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Salvando...';
        btn.style.pointerEvents = 'none';
        btn.style.opacity = '0.7';

        const res = await fetch('/api/add-data', {
            method: 'POST',
            headers: { 
                'Authorization': sessionStorage.getItem('sniper_token'),
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });

        if (res.ok) {
            this.showAlert('Os dados foram registrados na planilha com sucesso.', 'REGISTRO SALVO', 'success');
            this.loadData();
            e.target.reset();
            this.toggleFormFields(); // Reseta os campos dinâmicos para o estado inicial
        } else {
            this.showAlert('Erro ao salvar os dados na planilha.', 'ERRO', 'error');
        }

        // Reverter estado do botão
        btn.innerHTML = originalContent;
        btn.style.pointerEvents = 'auto';
        btn.style.opacity = '1';
    },

    openEditModal(id) {
        const op = this.state.data.operacoes.find(o => o.id_operacao == id);
        document.getElementById('edit-id').value = id;
        document.getElementById('edit-lucro-bruto').value = this.formatCurrency(op.lucro_bruto_recebido);
        document.getElementById('edit-status').value = op.status;
        document.getElementById('edit-modal').classList.remove('hidden');
    },

    async handleUpdate(e) {
        e.preventDefault();
        const id = document.getElementById('edit-id').value;
        const lucroBruto = this.parseCurrency(document.getElementById('edit-lucro-bruto').value);
        
        // Lógica de Rateio (1/3 para cada)
        const rateio = lucroBruto / 3;

        const payload = {
            id_operacao: id,
            lucro_bruto_recebido: lucroBruto,
            lucro_guardado: rateio.toFixed(2),
            lucro_usado_parcela: rateio.toFixed(2),
            lucro_gastos_pessoais: rateio.toFixed(2),
            status: document.getElementById('edit-status').value
        };

        const res = await fetch('/api/update-data', {
            method: 'PUT',
            headers: { 
                'Authorization': sessionStorage.getItem('sniper_token'),
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        if (res.ok) {
            this.closeModal();
            this.showAlert('A operação foi atualizada com os novos valores de rateio.', 'SUCESSO', 'success');
            this.loadData();
        }
    },

    closeModal() { document.getElementById('edit-modal').classList.add('hidden'); },

    openInfoModal() { 
        // Sincroniza o valor do input com a meta salva no estado antes de abrir
        const input = document.getElementById('input-meta-objetivo');
        input.value = this.formatCurrency(this.state.metaFixa);
        document.getElementById('info-modal').classList.remove('hidden'); 
    },

    closeInfoModal() { 
        document.getElementById('info-modal').classList.add('hidden');
        // Reseta o valor caso o usuário tenha alterado mas não salvado
        document.getElementById('input-meta-objetivo').value = this.formatCurrency(this.state.metaFixa);
        this.toggleEditMeta(false); // Garante que o campo volte a ser apenas leitura ao fechar
    },

    toggleEditMeta(active) {
        const input = document.getElementById('input-meta-objetivo');
        const btnEdit = document.getElementById('btn-edit-meta');
        const btnSave = document.getElementById('btn-save-meta');
        
        input.readOnly = !active;
        
        if (active) {
            btnEdit.classList.add('hidden');
            btnSave.classList.remove('hidden');
            input.focus();
        } else {
            btnEdit.classList.remove('hidden');
            btnSave.classList.add('hidden');
        }
    },

    async updateMeta() {
        const novaMeta = this.parseCurrency(document.getElementById('input-meta-objetivo').value);
        if (!novaMeta || novaMeta <= 0) return this.showAlert('Insira um valor válido para a meta.', 'ERRO', 'error');

        const btn = document.getElementById('btn-save-meta');
        const originalContent = btn.innerHTML;

        // Estado de carregamento
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Salvando...';
        btn.style.pointerEvents = 'none';
        btn.style.opacity = '0.7';

        const res = await fetch('/api/update-config', {
            method: 'POST',
            headers: { 
                'Authorization': sessionStorage.getItem('sniper_token'),
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ meta: novaMeta })
        });

        if (res.ok) {
            this.state.metaFixa = parseFloat(novaMeta);
            this.renderDashboard();
            this.showAlert('A meta do objetivo foi atualizada com sucesso.', 'CONFIGURAÇÃO SALVA', 'success');
            this.toggleEditMeta(false);
        } else {
            this.showAlert('Erro ao salvar a nova meta na planilha.', 'ERRO', 'error');
        }

        // Reverter estado do botão
        btn.innerHTML = originalContent;
        btn.style.pointerEvents = 'auto';
        btn.style.opacity = '1';
    },

    logout() {
        sessionStorage.removeItem('sniper_token');
        this.state.isLoggingOut = true;
        this.showAlert('Sua sessão foi encerrada com segurança.', 'SAÍDA COM SUCESSO', 'success');
    }
};

// Iniciar se já houver token
if (sessionStorage.getItem('sniper_token')) app.init();