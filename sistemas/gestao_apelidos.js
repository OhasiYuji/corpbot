const { PermissionFlagsBits } = require('discord.js');

module.exports = (client) => {
    client.on('messageCreate', async (message) => {
        // Ignora bots e mensagens fora de servidor
        if (message.author.bot || !message.guild) return;

        // Comando: !resetarapelidos
        if (message.content === '!resetarapelidos') {
            
            // Trava de segurança: Só quem tem o cargo de Founder ou Administrator
            // Você pode trocar pelo ID do cargo de Founder se preferir
            if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
                return message.reply('❌ Apenas a alta cúpula (Founder/Admin) pode usar este comando.');
            }

            try {
                const members = await message.guild.members.fetch();
                let count = 0;
                let erroHierarquia = 0;

                const msgStatus = await message.channel.send('⏳ Iniciando varredura e limpeza de apelidos...');

                for (const [id, member] of members) {
                    // Só tenta mudar se o membro TIVER apelido e se o bot TIVER poder sobre ele
                    if (member.nickname) {
                        if (member.manageable) {
                            await member.setNickname(null);
                            count++;
                        } else {
                            erroHierarquia++;
                        }
                    }
                }

                await msgStatus.edit(`✅ **Limpeza concluída!**\n👤 Apelidos removidos: \`${count}\` \n⚠️ Membros imunes (hierarquia alta): \`${erroHierarquia}\``);

            } catch (error) {
                console.error('Erro ao resetar apelidos:', error);
                message.reply('🔴 Ocorreu um erro interno ao tentar buscar os membros.');
            }
        }
    });
};