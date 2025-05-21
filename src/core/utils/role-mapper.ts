import { MessageRole } from '../types/message.types.js';

/**
 * Maps between different role systems
 */
export class RoleMapper {
  /**
   * Maps a role to OpenAI format
   */
  public toOpenAI(role: MessageRole): string {
    switch (role) {
      case MessageRole.USER:
        return 'user';
      case MessageRole.ASSISTANT:
      case MessageRole.HUMAN_AGENT:
        return 'assistant';
      case MessageRole.DEVELOPER:
        return 'developer';
      case MessageRole.SYSTEM:
        return 'system';
      case MessageRole.TOOL:
      case MessageRole.FUNCTION:
        return 'function';
      default:
        console.warn(
          `Unrecognized role: ${role as string}, defaulting to USER`,
        );
        return 'user';
    }
  }

  /**
   * Maps an OpenAI role to our role system
   */
  public toRole(role: string): MessageRole {
    switch (role.toLowerCase()) {
      case 'user':
        return MessageRole.USER;
      case 'assistant':
        return MessageRole.ASSISTANT;
      case 'system':
        return MessageRole.SYSTEM;
      case 'function':
        return MessageRole.TOOL;
      case 'developer':
        return MessageRole.DEVELOPER;
      default:
        console.warn(`Unrecognized role: ${role}, defaulting to USER`);
        return MessageRole.USER;
    }
  }
}

/**
 * Singleton instance
 */
export const roleMapper = new RoleMapper();
