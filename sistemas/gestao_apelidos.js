const { PermissionFlagsBits } = require('discord.js');

module.exports = (client) => {
    client.on('messageCreate', async (message) => {
        if (message.author.bot || !message.guild) return;

        if (message.content === '!resetarapelidos') {
            
            // Verifica permissão (Admin ou cargo Founder)
            if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
                return message.reply('❌ Apenas a alta cúpula pode usar este comando.');
            }

            try {
                // Força a atualização da lista de membros
                const members = await message.guild.members.fetch();
                const totalComApelido = members.filter(m => m.nickname).size;
                
                if (totalComApelido === 0) {
                    return message.reply('✅ Todos os membros já estão com os nomes limpos!');
                }

                let processados = 0;
                let erros = 0;
                
                const msgStatus = await message.channel.send(`⏳ **Iniciando Faxina...**\n[░░░░░░░░░░] 0% (0/${totalComApelido})`);

                for (const [id, member] of members) {
                    if (member.nickname) {
                        if (member.manageable) {
                            try {
                                await member.setNickname(null);
                                processados++;
                            } catch (e) {
                                erros++;
                            }
                        } else {
                            erros++;
                        }

                        // Atualiza a barra a cada 5 membros para não dar lag no bot
                        if (processados % 5 === 0 || processados === totalComApelido) {
                            const progresso = Math.floor((processados / totalComApelido) * 10);
                            const barra = '▓'.repeat(progresso) + '░'.repeat(10 - progresso);
                            const porcentagem = Math.floor((processados / totalComApelido) * 100);
                            
                            await msgStatus.edit(`⏳ **Limpando apelidos...**\n[${barra}] ${porcentagem}% (${processados}/${totalComApelido})`)
                                .catch(() => {}); // Evita erro se a mensagem for apagada
                        }
                    }
                }

                await msgStatus.edit(`✅ **Faxina Geral Concluída!**\n\n👤 Nomes resetados: \`${processados}\`\n⚠️ Imunes/Erros: \`${erros}\`\n\n*Todos os membros agora estão com o nome original do Discord.*`);

            } catch (error) {
                console.error('Erro na automação de apelidos:', error);
                message.reply('🔴 Erro crítico ao tentar buscar membros ou editar apelidos.');
            }
        }
    });
};