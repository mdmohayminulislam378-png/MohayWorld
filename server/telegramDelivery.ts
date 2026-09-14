import { DeliveryMediaItem } from './types.ts';

/**
 * Telegram Bot API Delivery Service
 * Sends text, photos, and videos securely to Telegram users.
 * The Bot Token is read strictly from backend environment variables and NEVER exposed to the client.
 */

function getBotToken(): string | undefined {
  return process.env.TELEGRAM_BOT_TOKEN;
}

export async function sendTelegramTextMessage(
  chatId: string | number,
  text: string,
  parseMode: 'HTML' | 'Markdown' = 'HTML'
): Promise<{ success: boolean; messageId?: number; error?: string }> {
  const token = getBotToken();
  if (!token) {
    console.log(`[TelegramDelivery (Simulated)] Text to chat ${chatId}: ${text.slice(0, 100)}...`);
    return { success: true, messageId: Math.floor(Math.random() * 1000000) };
  }

  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: parseMode,
      }),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.ok) {
      // Fallback without parse mode in case HTML or Markdown had syntax characters
      const retryRes = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text,
        }),
      });
      const retryData = await retryRes.json().catch(() => ({}));
      if (!retryRes.ok || !retryData.ok) {
        return { success: false, error: data.description || retryData.description || 'Failed to send text' };
      }
      return { success: true, messageId: retryData.result?.message_id };
    }

    return { success: true, messageId: data.result?.message_id };
  } catch (err: any) {
    console.error('[TelegramDelivery Error sending text]:', err);
    return { success: false, error: err.message };
  }
}

export async function sendTelegramPhoto(
  chatId: string | number,
  photoUrlOrFileId: string,
  caption?: string
): Promise<{ success: boolean; messageId?: number; error?: string }> {
  const token = getBotToken();
  if (!token) {
    console.log(`[TelegramDelivery (Simulated)] Photo to chat ${chatId}: ${photoUrlOrFileId} (caption: ${caption})`);
    return { success: true, messageId: Math.floor(Math.random() * 1000000) };
  }

  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendPhoto`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        photo: photoUrlOrFileId,
        caption: caption || '',
        parse_mode: 'HTML',
      }),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.ok) {
      // If photo URL fails (e.g. invalid URL format), send fallback message with photo URL
      await sendTelegramTextMessage(chatId, `📸 Photo Attachment:\n${photoUrlOrFileId}${caption ? `\n\n${caption}` : ''}`);
      return { success: true, error: data.description };
    }

    return { success: true, messageId: data.result?.message_id };
  } catch (err: any) {
    console.error('[TelegramDelivery Error sending photo]:', err);
    await sendTelegramTextMessage(chatId, `📸 Photo Attachment:\n${photoUrlOrFileId}${caption ? `\n\n${caption}` : ''}`);
    return { success: true, error: err.message };
  }
}

export async function sendTelegramVideo(
  chatId: string | number,
  videoUrlOrFileId: string,
  caption?: string
): Promise<{ success: boolean; messageId?: number; error?: string }> {
  const token = getBotToken();
  if (!token) {
    console.log(`[TelegramDelivery (Simulated)] Video to chat ${chatId}: ${videoUrlOrFileId} (caption: ${caption})`);
    return { success: true, messageId: Math.floor(Math.random() * 1000000) };
  }

  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendVideo`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        video: videoUrlOrFileId,
        caption: caption || '',
        parse_mode: 'HTML',
      }),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.ok) {
      // Fallback message with video URL
      await sendTelegramTextMessage(chatId, `🎥 Video Attachment:\n${videoUrlOrFileId}${caption ? `\n\n${caption}` : ''}`);
      return { success: true, error: data.description };
    }

    return { success: true, messageId: data.result?.message_id };
  } catch (err: any) {
    console.error('[TelegramDelivery Error sending video]:', err);
    await sendTelegramTextMessage(chatId, `🎥 Video Attachment:\n${videoUrlOrFileId}${caption ? `\n\n${caption}` : ''}`);
    return { success: true, error: err.message };
  }
}

export async function sendTelegramDeliveryItem(
  chatId: string | number,
  item: DeliveryMediaItem
): Promise<{ success: boolean; messageId?: number; error?: string }> {
  if (item.type === 'photo') {
    return sendTelegramPhoto(chatId, item.content, item.caption);
  }
  if (item.type === 'video') {
    return sendTelegramVideo(chatId, item.content, item.caption);
  }
  return sendTelegramTextMessage(chatId, item.content);
}

/**
 * Dispatches a complete order delivery batch (header + all items) to the Telegram buyer
 */
export async function sendTelegramOrderDelivery(params: {
  telegramId: string;
  orderId: string;
  productName: string;
  items: DeliveryMediaItem[];
  mode: 'auto' | 'manual';
  adminId?: string;
}): Promise<{ success: boolean; messageIds: number[]; errors: string[] }> {
  const { telegramId, orderId, productName, items, mode, adminId } = params;
  const messageIds: number[] = [];
  const errors: string[] = [];

  // 1. Send Header notification
  const headerText = [
    `🎉 <b>Order Delivered!</b>`,
    `📋 <b>Order ID:</b> <code>${orderId}</code>`,
    `🛍️ <b>Product:</b> <b>${escapeHtml(productName)}</b>`,
    `⚡ <b>Delivery:</b> ${mode === 'auto' ? '⚡ Instant Auto Delivery' : '📦 Manual Delivery by Staff'}`,
    adminId ? `👤 <b>Staff:</b> ID ${adminId}` : '',
    `⏱️ <b>Time:</b> ${new Date().toLocaleString()}`,
    `\n<i>Your delivery content is below:</i>`,
  ]
    .filter(Boolean)
    .join('\n');

  const headerRes = await sendTelegramTextMessage(telegramId, headerText);
  if (headerRes.messageId) messageIds.push(headerRes.messageId);
  if (headerRes.error) errors.push(headerRes.error);

  // 2. Send each item in sequence
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const prefix = items.length > 1 ? `[Item ${i + 1}/${items.length}] ` : '';

    if (item.type === 'photo') {
      const res = await sendTelegramPhoto(telegramId, item.content, item.caption ? `${prefix}${item.caption}` : prefix.trim());
      if (res.messageId) messageIds.push(res.messageId);
      if (res.error) errors.push(res.error);
    } else if (item.type === 'video') {
      const res = await sendTelegramVideo(telegramId, item.content, item.caption ? `${prefix}${item.caption}` : prefix.trim());
      if (res.messageId) messageIds.push(res.messageId);
      if (res.error) errors.push(res.error);
    } else {
      const textPayload = items.length > 1 && !item.content.startsWith('[') ? `<b>${prefix}</b>\n${item.content}` : item.content;
      const res = await sendTelegramTextMessage(telegramId, textPayload);
      if (res.messageId) messageIds.push(res.messageId);
      if (res.error) errors.push(res.error);
    }
  }

  // 3. Send footer thank-you message
  const footerText = `✅ <i>Thank you for your purchase! If you need support, reach out to our team.</i>`;
  const footerRes = await sendTelegramTextMessage(telegramId, footerText);
  if (footerRes.messageId) messageIds.push(footerRes.messageId);

  return {
    success: true,
    messageIds,
    errors,
  };
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
