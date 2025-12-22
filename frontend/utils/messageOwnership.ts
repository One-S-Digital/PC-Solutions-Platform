/**
 * Single source of truth for message ownership checking
 * Used consistently across Admin and App messaging UIs
 * 
 * @param senderId - The sender ID from the message (can be from msg.sender?.id or msg.senderId)
 * @param currentUserId - The current user's ID
 * @returns true if the message belongs to the current user, false otherwise
 */
export function isOwnMessage(senderId: string | undefined | null, currentUserId: string | undefined | null): boolean {
  // Strict check: both must exist and match exactly (as strings)
  if (!senderId || !currentUserId) {
    return false;
  }
  
  // Convert both to strings for reliable comparison
  return String(senderId) === String(currentUserId);
}

/**
 * Extract senderId from a message object, handling various API response shapes
 * 
 * @param message - Message object (can be from backend API or transformed)
 * @returns The sender ID, or empty string if not found
 */
export function extractSenderId(message: any): string {
  // Try multiple possible locations
  return message.senderId || 
         message.sender?.id || 
         (message as any).senderId || 
         '';
}

