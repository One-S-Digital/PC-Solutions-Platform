import { useState, useEffect, useCallback, useRef } from 'react';
import { useSupportSocket } from './useSupportSocket';
import { useApiClient, apiService } from '../services/api';
import { TicketResponse, SupportTicket } from '../types';

interface UseSupportThreadOptions {
  ticketId: string | null;
  userId: string;
  isSocketConnected?: boolean;
  onTicketUpdate?: () => void;
}

export function useSupportThread({
  ticketId,
  userId,
  isSocketConnected = false,
  onTicketUpdate,
}: UseSupportThreadOptions) {
  const apiClient = useApiClient();
  const [replies, setReplies] = useState<TicketResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const repliesRef = useRef<TicketResponse[]>([]);

  useEffect(() => {
    repliesRef.current = replies;
  }, [replies]);

  // WebSocket for real-time updates
  const { isConnected: isSocketConnectedActual } = useSupportSocket({
    ticketId,
    userId,
    onNewReply: (reply) => {
      appendReply(reply);
    },
    onReplyDeleted: (replyId) => {
      removeReply(replyId);
    },
    onTicketUpdate: () => {
      onTicketUpdate?.();
    },
  });

  // Append a new reply (deduplicated)
  const appendReply = useCallback((reply: TicketResponse) => {
    setReplies(prev => {
      // Check if reply already exists
      if (prev.find(r => r.id === reply.id)) {
        return prev;
      }
      // Append and sort by createdAt
      const updated = [...prev, reply].sort(
        (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );
      return updated;
    });
  }, []);

  const removeReply = useCallback((replyId: string) => {
    setReplies(prev => prev.filter(r => r.id !== replyId));
  }, []);

  const mergeServerReplies = useCallback((serverReplies: TicketResponse[], tempId?: string) => {
    setReplies(prev => {
      const filteredPrev = tempId ? prev.filter(r => r.id !== tempId) : prev;
      const existingMap = new Map(filteredPrev.map(r => [r.id, r]));
      serverReplies.forEach(reply => {
        existingMap.set(reply.id, reply);
      });
      return Array.from(existingMap.values()).sort(
        (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );
    });
  }, []);

  // Merge server replies (from polling or initial load)
  const mergeReplies = useCallback((serverReplies: TicketResponse[]) => {
    setReplies(prev => {
      // Create a map of existing replies by ID
      const existingMap = new Map(prev.map(r => [r.id, r]));
      // Add new replies, keeping existing ones
      serverReplies.forEach(reply => {
        if (!existingMap.has(reply.id)) {
          existingMap.set(reply.id, reply);
        }
      });
      // Convert back to array and sort
      return Array.from(existingMap.values()).sort(
        (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );
    });
  }, []);

  // Send a reply with optimistic UI - stable as long as ticketId doesn't change
  const sendReply = useCallback(async (content: string): Promise<void> => {
    if (!ticketId) throw new Error('No ticket selected');

    // Create optimistic reply
    const tempReply: TicketResponse = {
      id: `temp-${Date.now()}`,
      message: content,
      isStaff: true, // Admin is always staff
      createdAt: new Date().toISOString(),
      userName: 'You',
    };

    // Optimistically add to list
    appendReply(tempReply);

    // Scroll to bottom
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);

    try {
      const response = await apiService.respondToTicket(apiClient, ticketId, content);
      
      if (response.data?.data) {
        const updatedTicket = response.data.data;
        mergeServerReplies(updatedTicket.responses || [], tempReply.id);
      } else {
        // Remove temp reply on error
        setReplies(prev => prev.filter(r => r.id !== tempReply.id));
        throw new Error('Failed to send reply');
      }
    } catch (error) {
      // Remove temp reply on error
      setReplies(prev => prev.filter(r => r.id !== tempReply.id));
      throw error;
    }
  }, [ticketId, apiClient, appendReply, mergeServerReplies, messagesEndRef]);

  const deleteReply = useCallback(async (replyId: string): Promise<void> => {
    if (!ticketId) throw new Error('No ticket selected');
    const previousReplies = repliesRef.current;
    removeReply(replyId);

    try {
      const response = await apiService.deleteSupportTicketResponse(apiClient, ticketId, replyId);
      if (response.data?.data) {
        const updatedTicket = response.data.data;
        mergeReplies(updatedTicket.responses || []);
      } else {
        throw new Error('Failed to delete reply');
      }
    } catch (error) {
      setReplies(previousReplies);
      throw error;
    }
  }, [ticketId, apiClient, removeReply, mergeReplies]);

  // Load initial replies when ticket changes
  useEffect(() => {
    if (!ticketId) {
      setReplies([]);
      return;
    }

    setLoading(true);
    apiService.getSupportTicket(apiClient, ticketId)
      .then(response => {
        if (response.data?.data) {
          mergeReplies(response.data.data.responses || []);
        }
      })
      .catch(err => {
        console.error('Error loading ticket replies:', err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [ticketId, apiClient, mergeReplies]);

  // Polling fallback when WebSocket is not connected
  useEffect(() => {
    if (!ticketId || isSocketConnectedActual || isSocketConnected) return;

    const pollInterval = setInterval(async () => {
      try {
        const response = await apiService.getSupportTicket(apiClient, ticketId);
        if (response.data?.data) {
          mergeReplies(response.data.data.responses || []);
        }
      } catch (error) {
        console.error('Error polling ticket updates:', error);
      }
    }, 5000); // Poll every 5 seconds

    return () => clearInterval(pollInterval);
  }, [ticketId, isSocketConnectedActual, isSocketConnected, apiClient, mergeReplies]);

  // Auto-scroll to bottom when new replies arrive
  useEffect(() => {
    if (replies.length > 0 && scrollContainerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
      const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
      if (isNearBottom) {
        setTimeout(() => {
          messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
      }
    }
  }, [replies.length]);

  return {
    replies,
    loading,
    sendReply,
    deleteReply,
    messagesEndRef,
    scrollContainerRef,
  };
}

