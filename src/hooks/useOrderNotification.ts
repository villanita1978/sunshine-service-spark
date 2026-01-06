import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export const useOrderNotification = (
  onNewOrder: () => void,
  isActive: boolean = true
) => {
  const { toast } = useToast();
  const hasSubscribedRef = useRef(false);

  const playNotificationSound = useCallback(() => {
    // Create a notification sound using Web Audio API
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      // Create oscillator for notification beep
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      // Configure sound (pleasant notification tone)
      oscillator.frequency.setValueAtTime(880, audioContext.currentTime); // A5 note
      oscillator.type = 'sine';
      
      // Volume envelope
      gainNode.gain.setValueAtTime(0, audioContext.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.4, audioContext.currentTime + 0.05);
      gainNode.gain.linearRampToValueAtTime(0, audioContext.currentTime + 0.3);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.3);
      
      // Play second beep
      setTimeout(() => {
        try {
          const osc2 = audioContext.createOscillator();
          const gain2 = audioContext.createGain();
          
          osc2.connect(gain2);
          gain2.connect(audioContext.destination);
          
          osc2.frequency.setValueAtTime(1046.5, audioContext.currentTime); // C6 note
          osc2.type = 'sine';
          
          gain2.gain.setValueAtTime(0, audioContext.currentTime);
          gain2.gain.linearRampToValueAtTime(0.4, audioContext.currentTime + 0.05);
          gain2.gain.linearRampToValueAtTime(0, audioContext.currentTime + 0.3);
          
          osc2.start(audioContext.currentTime);
          osc2.stop(audioContext.currentTime + 0.3);
        } catch (e) {
          console.log('Second beep failed:', e);
        }
      }, 150);

    } catch (error) {
      console.log('Audio notification not supported:', error);
    }
  }, []);

  useEffect(() => {
    if (!isActive) {
      console.log('Order notifications disabled');
      return;
    }

    console.log('Setting up order notification subscription...');

    // Subscribe to new orders using schema-db-changes channel
    const channel = supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'orders'
        },
        (payload) => {
          console.log('🔔 New order received via realtime:', payload);
          
          // Skip if we just subscribed (avoid duplicate notifications)
          if (!hasSubscribedRef.current) {
            console.log('Skipping - not fully subscribed yet');
            return;
          }

          // Play sound
          playNotificationSound();
          
          // Show toast notification
          toast({
            title: '🔔 طلب جديد!',
            description: `تم استلام طلب جديد بقيمة $${(payload.new as any).amount}`,
          });
          
          // Refresh orders
          onNewOrder();
        }
      )
      .subscribe((status) => {
        console.log('Realtime subscription status:', status);
        if (status === 'SUBSCRIBED') {
          console.log('✅ Successfully subscribed to order notifications');
          // Wait a moment before enabling notifications to avoid false triggers
          setTimeout(() => {
            hasSubscribedRef.current = true;
            console.log('Notifications enabled');
          }, 2000);
        }
      });

    return () => {
      console.log('Cleaning up order notification subscription');
      hasSubscribedRef.current = false;
      supabase.removeChannel(channel);
    };
  }, [isActive, onNewOrder, playNotificationSound, toast]);

  return { playNotificationSound };
};
