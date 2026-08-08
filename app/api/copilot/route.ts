import { NextResponse } from 'next/server';
import { CopilotEngine } from '@/src/platforms/copilot/engine/CopilotEngine';
import { OperationalContext } from '@/src/platforms/copilot/context/OperationalContext';
import { TenantContext } from '@/src/platforms/copilot/context/TenantContext';
import { UserContext } from '@/src/platforms/copilot/context/UserContext';
import { PermissionContext } from '@/src/platforms/copilot/context/PermissionContext';
import { ConversationContext } from '@/src/platforms/copilot/context/ConversationContext';
import { WorkspaceContext } from '@/src/platforms/copilot/context/WorkspaceContext';
import { MockVisionAdapter } from '@/src/platforms/copilot/intelligence/adapters/MockVisionAdapter';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { 
      message, 
      activeContext = {},
      image = null 
    } = body;

    let inputText = message || '';

    // Simulate OCR processing if an image is provided
    if (image && image.filename && image.data) {
      const extractedText = await MockVisionAdapter.extractTextFromImage(
        image.filename, 
        image.mimeType || 'image/png', 
        image.data
      );
      
      // Append OCR text to the user's message as context for the LLM
      inputText += `\n[SYSTEM ENRICHED OCR TEXT FROM ${image.filename}]:\n${extractedText}`;
    }

    if (!inputText.trim()) {
      return NextResponse.json({ error: 'Message or image required' }, { status: 400 });
    }

    // Build the OperationalContext dynamically from the client's payload
    const context = OperationalContext.create({
      tenant: TenantContext.create({ id: 'tenant-1' }),
      user: UserContext.create({ id: 'user-1', roles: ['DISPATCHER'] }),
      permissions: PermissionContext.create(['JobOrder.Update', 'Driver.Update']),
      conversation: ConversationContext.create({ conversationId: activeContext.conversationId || 'default-session' }),
      workspace: WorkspaceContext.create(activeContext.workspace || {})
    });

    // Run the pipeline
    const response = await CopilotEngine.processCommand(inputText, context);

    return NextResponse.json({
      success: true,
      response: response
    });

  } catch (error: any) {
    console.error('Copilot API Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
