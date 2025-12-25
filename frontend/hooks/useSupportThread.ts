import { useState, useEffect, useCallback, useRef } from 'react';
import { TicketResponse, SupportTicket } from '../services/supportService';
import { useSupportSocket } from './useSupportSocket';
import { useAuthenticatedApi } from './useAuthenticatedApi';
import { supportApi } from '../services/supportService';

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
  const { request } = useAuthenticatedApi();
  const [replies, setReplies] = useState<TicketResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // WebSocket for real-time updates
  const { isConnected: isSocketConnectedActual } = useSupportSocket({
    ticketId,
    userId,
    onNewReply: (reply) => {
      appendReply(reply);
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

  // Merge server replies (from polling or initial load)
  const mergeReplies = useCallback((serverReplies: TicketResponse[]) => {
    setReplies(prev => {
      // Filter out any temp replies first
      const filteredPrev = prev.filter(r => !r.id.startsWith('temp-'));
      // Create a map of existing replies by ID
      const existingMap = new Map(filteredPrev.map(r => [r.id, r]));
      // Add new replies, keeping existing ones (deduplication by ID)
      serverReplies.forEach(reply => {
        // Only add if it doesn't already exist
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
      isStaff: false, // Will be determined by backend
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
      const config = supportApi.respondToTicketConfig(ticketId, { message: content });
      const res = await request<SupportTicket>(config.endpoint, {
        method: config.method,
        body: config.body,
      });

      if (res.success && res.data) {
        // Remove temp reply first
        setReplies(prev => prev.filter(r => r.id !== tempReply.id));
        // Merge all responses from server (which includes the new one)
        // This ensures deduplication if WebSocket also receives the reply
        mergeReplies(res.data.responses || []);
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
  }, [ticketId, request, appendReply, messagesEndRef]);

  // Load initial replies when ticket changes
  useEffect(() => {
    if (!ticketId) {
      setReplies([]);
      return;
    }

    setLoading(true);
    request<SupportTicket>(supportApi.getTicketEndpoint(ticketId))
      .then(res => {
        if (res.success && res.data) {
          // Reset replies when loading a new ticket to avoid duplicates
          // Then merge the server responses
          setReplies(res.data.responses || []);
        }
      })
      .catch(err => {
        console.error('Error loading ticket replies:', err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [ticketId, request]);

  // Polling fallback when WebSocket is not connected
  useEffect(() => {
    if (!ticketId || isSocketConnectedActual || isSocketConnected) return;

    const pollInterval = setInterval(async () => {
      try {
        const res = await request<SupportTicket>(supportApi.getTicketEndpoint(ticketId));
        if (res.success && res.data) {
          mergeReplies(res.data.responses || []);
        }
      } catch (error) {
        console.error('Error polling ticket updates:', error);
      }
    }, 5000); // Poll every 5 seconds

    return () => clearInterval(pollInterval);
  }, [ticketId, isSocketConnectedActual, isSocketConnected, request, mergeReplies]);

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
    messagesEndRef,
    scrollContainerRef,
  };
}

