import { TenantContext } from './TenantContext';
import { UserContext } from './UserContext';
import { PermissionContext } from './PermissionContext';
import { ConversationContext } from './ConversationContext';
import { WorkspaceContext } from './WorkspaceContext';

export class OperationalContext {
  private constructor(
    public readonly tenant: TenantContext,
    public readonly user: UserContext,
    public readonly permissions: PermissionContext,
    public readonly conversation: ConversationContext,
    public readonly workspace: WorkspaceContext,
    public readonly featureFlags: Record<string, boolean>
  ) {}

  static create(props: {
    tenant: TenantContext;
    user: UserContext;
    permissions: PermissionContext;
    conversation: ConversationContext;
    workspace: WorkspaceContext;
    featureFlags?: Record<string, boolean>;
  }): OperationalContext {
    return new OperationalContext(
      props.tenant,
      props.user,
      props.permissions,
      props.conversation,
      props.workspace,
      props.featureFlags || {}
    );
  }

  // Pure immutability: Return a new OperationalContext when anything changes
  withWorkspace(workspace: WorkspaceContext): OperationalContext {
    return new OperationalContext(
      this.tenant,
      this.user,
      this.permissions,
      this.conversation,
      workspace,
      this.featureFlags
    );
  }

  withConversation(conversation: ConversationContext): OperationalContext {
    return new OperationalContext(
      this.tenant,
      this.user,
      this.permissions,
      conversation,
      this.workspace,
      this.featureFlags
    );
  }
}
