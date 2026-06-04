import twilio from 'twilio';

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const fromNumber = process.env.TWILIO_WHATSAPP_NUMBER;

if (!accountSid || !authToken) {
    console.warn('Twilio credentials not configured in environment');
}

export const twilioClient = accountSid && authToken ? twilio(accountSid, authToken) : null;

export async function sendWhatsAppMessage(to: string, body: string) {
    try {
        // Format nomor WhatsApp (hapus 0 di depan, tambahkan kode negara)
        let formattedNumber = to.replace(/\D/g, '');
        if (formattedNumber.startsWith('0')) {
            formattedNumber = `62${formattedNumber.substring(1)}`;
        }
        if (!formattedNumber.startsWith('62')) {
            formattedNumber = `62${formattedNumber}`;
        }

        if (!twilioClient) {
            console.warn('WhatsApp message skipped: Twilio client not initialized');
            return { success: false, error: 'Twilio client not initialized' };
        }

        const message = await twilioClient.messages.create({
            body: body,
            from: fromNumber,
            to: `whatsapp:${formattedNumber}`,
        });

        console.log(`WhatsApp message sent: ${message.sid}`);
        return { success: true, sid: message.sid };
    } catch (error: unknown) {
        console.error('Error sending WhatsApp message:', error);
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
}

export async function sendWhatsAppTemplate(
    to: string,
    templateName: string,
    components?: Record<string, unknown>
) {
    try {
        let formattedNumber = to.replace(/\D/g, '');
        if (formattedNumber.startsWith('0')) {
            formattedNumber = `62${formattedNumber.substring(1)}`;
        }

        if (!twilioClient) {
            console.warn('WhatsApp template skipped: Twilio client not initialized');
            return { success: false, error: 'Twilio client not initialized' };
        }

        const message = await twilioClient.messages.create({
            contentSid: templateName,
            contentVariables: JSON.stringify(components || {}),
            from: fromNumber,
            to: `whatsapp:${formattedNumber}`,
        });

        return { success: true, sid: message.sid };
    } catch (error) {
        console.error('Error sending template:', error);
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
}