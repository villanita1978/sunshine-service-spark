import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export const useOrderNotification = (
  onNewOrder: () => void,
  isActive: boolean = true
) => {
  const { toast } = useToast();
  const isReadyRef = useRef(false);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const playNotificationSound = useCallback(() => {
    console.log('🔊 Playing notification sound...');
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      // First beep
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.setValueAtTime(880, audioContext.currentTime);
      oscillator.type = 'sine';
      
      gainNode.gain.setValueAtTime(0, audioContext.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.5, audioContext.currentTime + 0.02);
      gainNode.gain.linearRampToValueAtTime(0, audioContext.currentTime + 0.25);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.25);
      
      // Second beep after 200ms
      setTimeout(() => {
        try {
          const audioContext2 = new (window.AudioContext || (window as any).webkitAudioContext)();
          const osc2 = audioContext2.createOscillator();
          const gain2 = audioContext2.createGain();
          
          osc2.connect(gain2);
          gain2.connect(audioContext2.destination);
          
          osc2.frequency.setValueAtTime(1046.5, audioContext2.currentTime);
          osc2.type = 'sine';
          
          gain2.gain.setValueAtTime(0, audioContext2.currentTime);
          gain2.gain.linearRampToValueAtTime(0.5, audioContext2.currentTime + 0.02);
          gain2.gain.linearRampToValueAtTime(0, audioContext2.currentTime + 0.25);
          
          osc2.start(audioContext2.currentTime);
          osc2.stop(audioContext2.currentTime + 0.25);
          console.log('🔊 Sound played successfully');
        } catch (e) {
          console.error('Second beep failed:', e);
        }
      }, 200);

    } catch (error) {
      console.error('Audio notification failed:', error);
    }
  }, []);

  useEffect(() => {
    if (!isActive) {
      console.log('❌ Order notifications disabled');
      return;
    }

    console.log('🔔 Setting up realtime subscription for orders...');
    
    // Clean up existing channel if any
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }

    const channel = supabase
      .channel('orders-realtime-' + Date.now())
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'orders'
        },
        (payload) => {
          console.log('📦 New order event received:', payload);
          
          if (!isReadyRef.current) {
            console.log('⏳ Skipping - still initializing');
            return;
          }

          console.log('✅ Processing new order notification');
          
          // Play sound
          playNotificationSound();
          
          // Show toast
          toast({
            title: '🔔 طلب جديد!',
            description: `تم استلام طلب جديد بقيمة $${(payload.new as any).amount}`,
          });
          
          // Callback
          onNewOrder();
        }
      )
      .subscribe((status) => {
        console.log('📡 Subscription status:', status);
        if (status === 'SUBSCRIBED') {
          console.log('✅ Realtime subscription active');
          setTimeout(() => {
            isReadyRef.current = true;
            console.log('🟢 Ready to receive notifications');
          }, 1500);
        }
      });

    channelRef.current = channel;

    return () => {
      console.log('🧹 Cleaning up subscription');
      isReadyRef.current = false;
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [isActive, onNewOrder, playNotificationSound, toast]);

  return { playNotificationSound };
};
