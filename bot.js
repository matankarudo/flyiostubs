import { Client, GatewayIntentBits } from 'discord.js';

const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
const BASE44_FUNCTION_URL = process.env.BASE44_FUNCTION_URL;
const WATCH_CHANNEL_NAME = 'receipts';

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.DirectMessages
    ]
});

client.once('ready', () => {
    console.log(`✅ Bot is online as ${client.user.tag}`);
    console.log(`Watching for messages in #${WATCH_CHANNEL_NAME} channels`);
});

client.on('messageCreate', async (message) => {
    if (message.author.bot) return;

    const isReceiptsChannel = message.channel.name === WATCH_CHANNEL_NAME;
    const isDM = !message.guild;
    const hasAttachment = message.attachments.size > 0;

    if (!hasAttachment || (!isReceiptsChannel && !isDM)) return;

    console.log(`📎 Receipt from ${message.author.tag}`);
    await message.react('⏳');

    try {
        const attachment = message.attachments.first();

        const response = await fetch(BASE44_FUNCTION_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                discord_user_id: message.author.id,
                discord_username: message.author.tag,
                guild_id: message.guild?.id || null,
                message_id: message.id,
                channel_id: message.channel.id,
                attachment_url: attachment.url,
                attachment_name: attachment.name,
                message_content: message.content
            })
        });

        const result = await response.json();
        await message.reactions.removeAll();

        if (result.success) {
            await message.react('✅');
            if (result.reply) await message.reply(result.reply);
        } else {
            await message.react('❌');
            await message.reply(result.reply || '❌ Failed to process receipt');
        }
    } catch (error) {
        console.error('Error:', error);
        await message.reactions.removeAll();
        await message.react('❌');
        await message.reply('❌ Error processing receipt');
    }
});

client.login(DISCORD_BOT_TOKEN);
