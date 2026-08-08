import { CopilotEngine, CopilotResponse } from '../../platforms/copilot/engine/CopilotEngine';
import { WhatsAppContextBuilder } from './WhatsAppContextBuilder';
import { sendWhatsAppMessage } from '@/lib/twilio/clients';

export class WhatsAppCopilotGateway {
    static async handleIncomingMessage(waNumber: string, message: string): Promise<boolean> {
        console.log(`[WhatsAppGateway] Processing incoming message from ${waNumber}`);
        
        // 1. Resolve Context
        const context = await WhatsAppContextBuilder.buildContext(waNumber);
        
        if (!context) {
            // Unregistered number
            await sendWhatsAppMessage(
                waNumber,
                "Halo! Nomor ini belum terdaftar di sistem Sentralogis. Silakan hubungi admin untuk pendaftaran."
            );
            return true;
        }

        try {
            // 2. Process via Copilot Engine
            const response = await CopilotEngine.processCommand(message, context);
            
            // 3. Format and Send Reply
            const replyText = this.formatReply(response);
            await sendWhatsAppMessage(waNumber, replyText);
            
            return true;
        } catch (error: any) {
            console.error('[WhatsAppGateway] Copilot Engine Error:', error);
            await sendWhatsAppMessage(
                waNumber,
                "Maaf, sistem Copilot sedang mengalami gangguan. Silakan coba beberapa saat lagi atau gunakan aplikasi Sentralogis."
            );
            return false;
        }
    }

    private static formatReply(response: CopilotResponse): string {
        switch (response.type) {
            case 'action_proposal':
                return this.formatActionProposal(response.proposal);
            case 'clarification':
                return `🤔 *Perlu Klarifikasi*\n\n${response.content}`;
            case 'text':
                return `ℹ️ *Informasi*\n\n${response.content}`;
            case 'timeline':
                return `📅 *Timeline*\n\n${response.content}`;
            default:
                return "Perintah telah diterima namun format balasan tidak didukung.";
        }
    }

    private static formatActionProposal(proposal: any): string {
        const { plan, explainability } = proposal;
        let msg = `⚙️ *Rencana Tindakan: ${plan.intent}*\n\n`;
        
        msg += `Tindakan ini siap dieksekusi. Ketik *YA* untuk mengkonfirmasi.\n\n`;

        if (explainability.whyProposed) {
            msg += `💡 *Alasan:* ${explainability.whyProposed}\n`;
        }
        
        if (explainability.warnings && explainability.warnings.length > 0) {
            msg += `\n⚠️ *Peringatan:*\n`;
            explainability.warnings.forEach((w: any) => msg += `- ${w}\n`);
        }

        if (explainability.advisory) {
            msg += `\n📊 *Analisis Operasional (Status: ${explainability.advisory.status})*\n`;
            if (explainability.advisory.reason) {
                msg += `${explainability.advisory.reason}\n`;
            }
        }

        return msg;
    }


}
