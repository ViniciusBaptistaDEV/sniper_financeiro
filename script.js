const app = {
    state: {
        isLogged: false,
        isLoggingOut: false,
        data: { captacoes: [], operacoes: [] },
        metaFixa: 50000, // Exemplo de meta de lucro guardado
        deletingId: null
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

    showLoading() { document.getElementById('loading-modal').classList.remove('hidden'); },
    hideLoading() { document.getElementById('loading-modal').classList.add('hidden'); },

    async loadData() {
        this.showLoading();
        try {
            const res = await fetch('/api/get-data', {
                headers: { 'Authorization': sessionStorage.getItem('sniper_token') }
            });
            
            if (!res.ok) throw new Error("Erro na resposta do servidor");

            const responseData = await res.json();
            this.state.data = responseData;
            
            if (responseData.config && responseData.config.meta_objetivo) {
                this.state.metaFixa = parseFloat(responseData.config.meta_objetivo);
            }
            
            this.renderDashboard();
            this.renderTable();
            this.renderEarnings();
        } catch (error) {
            console.error("Falha ao carregar dados:", error);
            this.showAlert('Não foi possível sincronizar os dados com a planilha.', 'ERRO DE CONEXÃO', 'error');
        } finally {
            // Pequeno delay apenas para a animação não "piscar" em conexões muito rápidas
            setTimeout(() => this.hideLoading(), 500);
        }
    },

    renderDashboard() {
        const ops = this.state.data.operacoes;
        const caps = this.state.data.captacoes;

        // Cálculos
        const lucroGuardado = ops.reduce((acc, curr) => acc + (parseFloat(curr.lucro_guardado) || 0), 0);
        const totalLucroBruto = ops.reduce((acc, curr) => acc + (parseFloat(curr.lucro_bruto_recebido) || 0), 0);
        const totalUsoPessoal = ops.reduce((acc, curr) => acc + (parseFloat(curr.lucro_gastos_pessoais) || 0), 0);

        const capitalAtivo = ops.filter(o => o.status === 'Em Andamento')
                                .reduce((acc, curr) => acc + (parseFloat(curr.valor_emprestado) || 0), 0);
        
        // ROI Médio (Lucro Bruto / Valor Emprestado)
        const opsFinalizadas = ops.filter(o => o.status === 'Finalizada');
        const roiMedio = opsFinalizadas.length > 0 
            ? (opsFinalizadas.reduce((acc, curr) => acc + (curr.lucro_bruto_recebido / curr.valor_emprestado), 0) / opsFinalizadas.length) * 100 
            : 0;

        const avgLucroBruto = opsFinalizadas.length > 0 ? (totalLucroBruto / opsFinalizadas.length) : 0;

        // Lucro Projetado: Capital na rua * ROI Médio (em decimal)
        const lucroProjetado = capitalAtivo * (roiMedio / 100);

        // Cálculo de Duração Média (Ciclo de Retorno)
        const durations = opsFinalizadas
            .filter(o => o.data_inicio && o.data_fim)
            .map(o => {
                const start = new Date(o.data_inicio + 'T00:00:00');
                const end = new Date(o.data_fim + 'T00:00:00');
                return Math.floor((end - start) / (1000 * 60 * 60 * 24));
            });
        
        const avgDays = durations.length > 0 ? (durations.reduce((a, b) => a + b, 0) / durations.length) : 0;

        // Atualizar UI
        document.getElementById('kpi-avg-lucro-bruto').innerText = `R$ ${this.formatCurrency(avgLucroBruto)}`;
        document.getElementById('kpi-lucro-guardado').innerText = `R$ ${this.formatCurrency(lucroGuardado)}`;
        document.getElementById('kpi-capital-ativo').innerText = `R$ ${this.formatCurrency(capitalAtivo)}`;
        document.getElementById('kpi-roi').innerText = `${roiMedio.toFixed(2)}%`;
        document.getElementById('kpi-avg-days').innerText = `${Math.round(avgDays)} dias`;
        document.getElementById('kpi-total-lucro-bruto').innerText = `R$ ${this.formatCurrency(totalLucroBruto)}`;
        document.getElementById('kpi-total-pessoal').innerText = `R$ ${this.formatCurrency(totalUsoPessoal)}`;
        document.getElementById('kpi-lucro-projetado').innerText = `R$ ${this.formatCurrency(lucroProjetado)}`;

        // Barra de Progresso
        const perc = Math.min((lucroGuardado / this.state.metaFixa) * 100, 100);
        document.getElementById('progress-bar').style.width = `${perc}%`;
        document.getElementById('progress-text').innerText = `${perc.toFixed(2)}% da meta de R$ ${this.formatCurrency(this.state.metaFixa)}`;
        document.getElementById('input-meta-objetivo').value = this.formatCurrency(this.state.metaFixa);
    },

    renderTable() {
        const tbody = document.querySelector('#ops-table tbody');
        tbody.innerHTML = this.state.data.operacoes.map(op => {
            let durationText = '-';
            if (op.status === 'Finalizada' && op.data_inicio && op.data_fim) {
                const start = new Date(op.data_inicio + 'T00:00:00');
                const end = new Date(op.data_fim + 'T00:00:00');
                durationText = `${Math.floor((end - start) / 86400000)} dias`;
            }
            return `
            <tr>
                <td data-label="Início">${op.data_inicio ? new Date(op.data_inicio + 'T00:00:00').toLocaleDateString('pt-BR') : '-'}</td>
                <td data-label="Fim">${op.status === 'Finalizada' ? (op.data_fim ? new Date(op.data_fim + 'T00:00:00').toLocaleDateString('pt-BR') : '-') : '<span style="font-size: 0.75rem; opacity: 0.7; font-style: italic;">Aguardando finalização...</span>'}</td>
                <td data-label="Valor">R$ ${this.formatCurrency(op.valor_emprestado)}</td>
                <td data-label="Lucro Bruto">R$ ${this.formatCurrency(op.lucro_bruto_recebido)}</td>
                <td data-label="Status"><span class="badge ${op.status === 'Finalizada' ? 'green' : 'blue'}">${op.status}</span></td>
                <td data-label="Duração">${durationText}</td>
                <td data-label="Ações" class="table-actions">
                    <button class="action-btn edit-btn" onclick="app.openEditModal('${op.id_operacao}')" title="Editar"><i class="fa-solid fa-pen-to-square"></i></button>
                    <button class="action-btn delete-btn" onclick="app.openDeleteModal('${op.id_operacao}')" title="Excluir"><i class="fa-solid fa-trash-can"></i></button>
                </td>
            </tr>
        `;
        }).join('');
    },

    renderEarnings() {
        const tbody = document.querySelector('#earnings-table tbody');
        const opsFinalizadas = this.state.data.operacoes
            .filter(o => o.status === 'Finalizada')
            .sort((a, b) => new Date(b.data_fim) - new Date(a.data_fim));

        tbody.innerHTML = opsFinalizadas.map(op => {
            const start = new Date(op.data_inicio + 'T00:00:00');
            const end = new Date(op.data_fim + 'T00:00:00');
            const duration = Math.floor((end - start) / 86400000);
            return `
            <tr>
                <td data-label="Início">${op.data_inicio ? new Date(op.data_inicio + 'T00:00:00').toLocaleDateString('pt-BR') : '-'}</td>
                <td data-label="Fim">${op.data_fim ? new Date(op.data_fim + 'T00:00:00').toLocaleDateString('pt-BR') : '-'}</td>
                <td data-label="Lucro Bruto" style="color: var(--neon-green)">R$ ${this.formatCurrency(op.lucro_bruto_recebido)}</td>
                <td data-label="Reserva">R$ ${this.formatCurrency(op.lucro_guardado)}</td>
                <td data-label="Banco">R$ ${this.formatCurrency(op.lucro_usado_parcela)}</td>
                <td data-label="Pessoal">R$ ${this.formatCurrency(op.lucro_gastos_pessoais)}</td>
                <td data-label="Duração">${duration} dias</td>
            </tr>
        `;
        }).join('');
    },

    switchTab(tabId) {
        document.querySelectorAll('.tab-content').forEach(t => t.classList.add('hidden'));
        document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
        document.getElementById(`tab-${tabId}`).classList.remove('hidden');
        if (event) event.currentTarget.classList.add('active');
        if (tabId === 'earnings') this.renderEarnings();
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
        document.getElementById('edit-data-fim').value = op.data_fim || '';
        // Preenche os campos manuais com o que já estiver salvo na planilha
        document.getElementById('edit-lucro-guardado').value = this.formatCurrency(op.lucro_guardado);
        document.getElementById('edit-lucro-parcela').value = this.formatCurrency(op.lucro_usado_parcela);
        document.getElementById('edit-lucro-pessoal').value = this.formatCurrency(op.lucro_gastos_pessoais);
        
        // Define "Finalizada" como padrão ao abrir, agilizando o fechamento da operação
        document.getElementById('edit-status').value = 'Finalizada';
        
        this.toggleEditProfitFields();
        document.getElementById('edit-modal').classList.remove('hidden');
    },

    toggleEditProfitFields() {
        const status = document.getElementById('edit-status').value;
        const isFinalizada = status === 'Finalizada';
        
        const fields = [
            'edit-lucro-bruto', 
            'edit-data-fim', 
            'edit-lucro-guardado', 
            'edit-lucro-parcela', 
            'edit-lucro-pessoal'
        ];

        fields.forEach(id => {
            const el = document.getElementById(id);
            el.disabled = !isFinalizada;
            if (!isFinalizada) {
                el.value = ''; // Limpa se voltar para Em Andamento
                el.style.opacity = '0.5';
            } else {
                el.style.opacity = '1';
            }
        });
    },

    async handleUpdate(e) {
        e.preventDefault();
        const id = document.getElementById('edit-id').value;
        const status = document.getElementById('edit-status').value;
        const dataFim = document.getElementById('edit-data-fim').value;

        const lucroBruto = this.parseCurrency(document.getElementById('edit-lucro-bruto').value);
        const lucroReserva = this.parseCurrency(document.getElementById('edit-lucro-guardado').value);
        const lucroBanco = this.parseCurrency(document.getElementById('edit-lucro-parcela').value);
        const lucroPessoal = this.parseCurrency(document.getElementById('edit-lucro-pessoal').value);

        // Validação obrigatória para status Finalizada
        if (status === 'Finalizada') {
            if (!lucroBruto || !dataFim || (lucroReserva + lucroBanco + lucroPessoal === 0)) {
                return this.showAlert('Para finalizar, preencha o lucro bruto, a data e a distribuição do lucro.', 'DADOS INCOMPLETOS', 'error');
            }
            if (Math.abs(lucroBruto - (lucroReserva + lucroBanco + lucroPessoal)) > 0.01) {
                return this.showAlert('A soma das distribuições deve ser igual ao lucro bruto.', 'ERRO DE RATEIO', 'error');
            }
        }

        const payload = {
            id_operacao: id,
            lucro_bruto_recebido: lucroBruto,
            lucro_guardado: lucroReserva.toFixed(2),
            lucro_usado_parcela: lucroBanco.toFixed(2),
            lucro_gastos_pessoais: lucroPessoal.toFixed(2),
            status: status,
            data_fim: dataFim
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

    openDeleteModal(id) {
        this.state.deletingId = id;
        document.getElementById('delete-modal').classList.remove('hidden');
    },

    closeDeleteModal() {
        this.state.deletingId = null;
        document.getElementById('delete-modal').classList.add('hidden');
    },

    async handleDelete() {
        if (!this.state.deletingId) return;
        
        const btn = document.getElementById('btn-confirm-delete');
        const originalContent = btn.innerHTML;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Excluindo...';
        btn.style.pointerEvents = 'none';

        const res = await fetch('/api/delete-data', {
            method: 'DELETE',
            headers: { 
                'Authorization': sessionStorage.getItem('sniper_token'),
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ id_operacao: this.state.deletingId })
        });

        btn.innerHTML = originalContent;
        btn.style.pointerEvents = 'auto';
        this.closeDeleteModal();

        if (res.ok) {
            this.showAlert('A operação foi removida permanentemente.', 'EXCLUÍDO', 'success');
            this.loadData();
        } else {
            this.showAlert('Erro ao tentar excluir os dados na planilha.', 'ERRO', 'error');
        }
    },

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

    openKpiInfo(key) {
        const definitions = {
            'total-lucro-bruto': {
                title: 'TOTAL LUCRO BRUTO',
                text: 'Soma absoluta de todo o lucro bruto recebido através das operações finalizadas. É o montante total gerado antes de qualquer distribuição.'
            },
            'avg-lucro-bruto': {
                title: 'MÉDIA LUCRO BRUTO',
                text: 'Valor médio de lucro gerado por cada operação concluída. Ajuda a identificar o potencial de ganho esperado para cada novo investimento.'
            },
            'lucro-guardado': {
                title: 'LUCRO LÍQUIDO GUARDADO',
                text: 'Valor acumulado que você destinou especificamente para sua reserva ou meta principal. É este valor que preenche a barra de progresso.'
            },
            'uso-pessoal': {
                title: 'LUCRO LÍQUIDO USO PESSOAL',
                text: 'Montante acumulado que foi retirado do lucro das operações para uso livre, recompensas pessoais ou gastos fora do capital de giro.'
            },
            'capital-ativo': {
                title: 'CAPITAL ATIVO NA RUA',
                text: 'Total do capital principal (valor emprestado) que está atualmente em operações abertas. Representa o seu dinheiro que está trabalhando no momento.'
            },
            'roi-medio': {
                title: 'ROI MÉDIO',
                text: 'Retorno Sobre Investimento médio das operações finalizadas. Indica a rentabilidade percentual histórica do seu capital.'
            },
            'ciclo-retorno': {
                title: 'CICLO MÉDIO DE RETORNO',
                text: 'Tempo médio (em dias) decorrido entre o início de uma operação e o seu recebimento total. Mede a velocidade de giro do seu capital.'
            },
            'lucro-projetado': {
                title: 'LUCRO BRUTO PROJETADO',
                text: 'Uma estimativa baseada no seu ROI Médio histórico aplicada ao Capital Ativo. Indica quanto lucro deve retornar para você em breve.'
            }
        };

        const info = definitions[key];
        document.getElementById('kpi-info-title').innerText = info.title;
        document.getElementById('kpi-info-body').innerText = info.text;
        document.getElementById('kpi-info-modal').classList.remove('hidden');
    },

    closeKpiInfo() { document.getElementById('kpi-info-modal').classList.add('hidden'); },

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