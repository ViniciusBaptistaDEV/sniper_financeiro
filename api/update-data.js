const { getSheet } = require('./sheets-helper');

module.exports = async function handler(req, res) {
    if (req.method !== 'PUT') return res.status(405).json({ error: 'Método não permitido' });

    try {
        if (req.headers.authorization !== 'sniper-auth-success') {
            return res.status(403).json({ error: 'Não autorizado' });
        }

        const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
        const doc = await getSheet();
        
        if (body.type === 'captacao') {
            const sheet = doc.sheetsByTitle['Captacoes'];
            const rows = await sheet.getRows();
            const row = rows.find(r => r.get('id_captacao') === body.id_captacao);
            if (!row) return res.status(404).json({ error: 'Captação não encontrada' });

            row.set('origem', body.origem);
            row.set('valor_pegado', body.valor_pegado);
            row.set('valor_parcela', body.valor_parcela);
            row.set('qtd_parcelas', body.qtd_parcelas);
            row.set('dia_vencimento', body.dia_vencimento);
            row.set('total_com_juros', body.total_com_juros);
            row.set('parcelas_pagas', body.parcelas_pagas);
            row.set('quitamento_parcelas', body.quitamento_parcelas);
            await row.save();
            return res.status(200).json({ success: true });
        }

        const sheet = doc.sheetsByTitle['Operacoes'];
        const rows = await sheet.getRows();
        
        // Localiza a linha correta pelo ID da operação
        const row = rows.find(r => r.get('id_operacao') === body.id_operacao);
        
        if (!row) {
            return res.status(404).json({ error: 'Operação não encontrada' });
        }

        // Atribui os novos valores para as colunas da planilha
        row.set('lucro_bruto_recebido', body.lucro_bruto_recebido);
        row.set('lucro_guardado', body.lucro_guardado);
        row.set('lucro_usado_parcela', body.lucro_usado_parcela);
        row.set('lucro_gastos_pessoais', body.lucro_gastos_pessoais);
        row.set('status', body.status);
        if (body.beneficiario_ou_item) row.set('beneficiario_ou_item', body.beneficiario_ou_item);
        if (body.tipo_aplicacao) row.set('tipo_aplicacao', body.tipo_aplicacao);
        if (body.observacao !== undefined) row.set('observacao', body.observacao);
        row.set('data_fim', body.data_fim);

        await row.save();

        return res.status(200).json({ success: true });
    } catch (error) {
        console.error("Erro ao atualizar dados:", error);
        return res.status(500).json({ error: error.message });
    }
};