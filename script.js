const app = {
    state: {
        isLogged: false,
        data: { captacoes: [], operacoes: [] },
        metaFixa: 50000 // Exemplo de meta de lucro guardado
    },

    async handleLogin() {
        const user = document.getElementById('login-user').value;
        const pass = document.getElementById('login-pass').value;

        const res = await fetch('/api/login', {
            method: 'POST',
            body: JSON.stringify({ user, pass })
        });

        if (res.ok) {
            const { token } = await res.json();
            localStorage.setItem('sniper_token', token);
            this.init();
        } else {
            alert('Acesso Negado');
        }
    },

    async init() {
        const token = localStorage.getItem('sniper_token');
        if (!token) return;

        document.getElementById('login-overlay').classList.add('hidden');
        document.getElementById('app-content').classList.remove('hidden');
        this.toggleFormFields();
        await this.loadData();
    },

    async loadData() {
        const res = await fetch('/api/get-data', {
            headers: { 'Authorization': localStorage.getItem('sniper_token') }
        });
        this.state.data = await res.json();
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
        document.getElementById('kpi-lucro-guardado').innerText = `R$ ${lucroGuardado.toLocaleString('pt-BR')}`;
        document.getElementById('kpi-capital-ativo').innerText = `R$ ${capitalAtivo.toLocaleString('pt-BR')}`;
        document.getElementById('kpi-roi').innerText = `${roiMedio.toFixed(2)}%`;
        
        // Barra de Progresso
        const perc = Math.min((lucroGuardado / this.state.metaFixa) * 100, 100);
        document.getElementById('progress-bar').style.width = `${perc}%`;
        document.getElementById('progress-text').innerText = `${perc.toFixed(1)}% da meta de R$ ${this.state.metaFixa}`;
    },

    renderTable() {
        const tbody = document.querySelector('#ops-table tbody');
        tbody.innerHTML = this.state.data.operacoes.map(op => `
            <tr>
                <td>${op.data_inicio}</td>
                <td>R$ ${op.valor_emprestado}</td>
                <td>R$ ${op.lucro_bruto_recebido || 0}</td>
                <td><span class="badge ${op.status === 'Finalizada' ? 'green' : 'blue'}">${op.status}</span></td>
                <td><button onclick="app.openEditModal('${op.id_operacao}')">Editar</button></td>
            </tr>
        `).join('');
    },

    switchTab(tabId) {
        document.querySelectorAll('.tab-content').forEach(t => t.classList.add('hidden'));
        document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
        document.getElementById(`tab-${tabId}`).classList.remove('hidden');
        event.target.classList.add('active');
    },

    toggleFormFields() {
        const type = document.getElementById('entry-type').value;
        const container = document.getElementById('form-fields');
        
        if (type === 'captacao') {
            container.innerHTML = `
                <input type="date" name="data_emprestimo" required>
                <input type="number" name="valor_pegado" placeholder="Valor Captado" required>
                <input type="number" name="valor_parcela" placeholder="Valor da Parcela">
                <input type="number" name="qtd_parcelas" placeholder="Qtd Parcelas">
            `;
        } else {
            const options = this.state.data.captacoes.map(c => `<option value="${c.id_captacao}">Captação #${c.id_captacao} (R$ ${c.valor_pegado})</option>`);
            container.innerHTML = `
                <select name="id_captacao_ref">${options}</select>
                <input type="date" name="data_inicio" required>
                <input type="number" name="valor_emprestado" placeholder="Valor Emprestado" required>
                <input type="hidden" name="status" value="Em Andamento">
            `;
        }
    },

    async handleSubmit(e) {
        e.preventDefault();
        const formData = new FormData(e.target);
        const data = Object.fromEntries(formData.entries());
        data.type = document.getElementById('entry-type').value;

        const res = await fetch('/api/add-data', {
            method: 'POST',
            headers: { 
                'Authorization': localStorage.getItem('sniper_token'),
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });

        if (res.ok) {
            alert('Salvo com sucesso!');
            this.loadData();
            e.target.reset();
        }
    },

    openEditModal(id) {
        const op = this.state.data.operacoes.find(o => o.id_operacao == id);
        document.getElementById('edit-id').value = id;
        document.getElementById('edit-lucro-bruto').value = op.lucro_bruto_recebido;
        document.getElementById('edit-status').value = op.status;
        document.getElementById('edit-modal').classList.remove('hidden');
    },

    async handleUpdate(e) {
        e.preventDefault();
        const id = document.getElementById('edit-id').value;
        const lucroBruto = parseFloat(document.getElementById('edit-lucro-bruto').value);
        
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
                'Authorization': localStorage.getItem('sniper_token'),
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        if (res.ok) {
            this.closeModal();
            this.loadData();
        }
    },

    closeModal() { document.getElementById('edit-modal').classList.add('hidden'); },

    logout() { localStorage.removeItem('sniper_token'); location.reload(); }
};

// Iniciar se já houver token
if (localStorage.getItem('sniper_token')) app.init();