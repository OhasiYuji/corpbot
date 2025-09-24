import 'dotenv/config';
import { REST, Routes, SlashCommandBuilder } from 'discord.js';

const commands = [
  new SlashCommandBuilder()
    .setName('registrar')
    .setDescription('Abre o formulário de registro')
    .toJSON()
];

const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);

(async () => {
  try {
    console.log('Atualizando comandos de barra...');
    await rest.put(
      Routes.applicationGuildCommands('1420144971625009263', process.env.GUILD_ID),
      { body: commands }
    );
    console.log('Comandos atualizados com sucesso!');
  } catch (error) {
    console.error(error);
  }
})();
