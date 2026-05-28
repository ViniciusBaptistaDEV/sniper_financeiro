const { getSheet } = require('./sheets-helper');

module.exports = async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido' });

    try {
        if (req.headers.authorization !== 'sniper-auth-success') {
            return res.status(403).json({ error: 'Não autorizado' });
        }

        const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
        const doc = await getSheet();

        if (body.type === 'captacao') {
            const sheet = doc.sheetsByTitle['Captacoes'];
            await sheet.addRow({
                id_captacao: Date.now().toString(),
                origem: body.origem || 'banco',
                data_emprestimo: body.data_emprestimo,
                valor_pegado: body.valor_pegado,
                valor_parcela: body.valor_parcela || 0,
                qtd_parcelas: body.qtd_parcelas || 1,
                dia_vencimento: body.dia_vencimento || '',
                total_com_juros: body.total_com_juros || 0,
                parcelas_pagas: body.parcelas_pagas || 0,
                quitamento_parcelas: body.quitamento_parcelas || 'false'
            });
        } else if (body.type === 'operacao') {
            const sheet = doc.sheetsByTitle['Operacoes'];
            await sheet.addRow({
                id_operacao: Date.now().toString(),
                id_captacao_ref: body.id_captacao_ref,
                data_inicio: body.data_inicio,
                valor_emprestado: body.valor_emprestado,
                status: body.status || 'Em Andamento',
                lucro_bruto_recebido: 0,
                lucro_guardado: 0,
                lucro_usado_parcela: 0,
                lucro_gastos_pessoais: 0
            });
        } else {
            return res.status(400).json({ error: 'Tipo de registro inválido' });
        }

        return res.status(200).json({ success: true });
    } catch (error) {
        console.error("Erro ao adicionar dados:", error);
        return res.status(500).json({ error: error.message });
    }
};