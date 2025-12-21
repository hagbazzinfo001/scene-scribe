import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface TokenStatus {
  current_balance: number;
  credits_used: number;
  daily_free_tokens: number;
  can_claim_free_tokens: boolean;
  hours_until_reset: number;
  minutes_until_reset: number;
  last_claim: string | null;
}

interface TokenPackage {
  id: string;
  name: string;
  tokens: number;
  amount: number;
  popular?: boolean;
}

export const TOKEN_PACKAGES: TokenPackage[] = [
  { id: 'starter', name: 'Starter Pack', tokens: 50, amount: 500 },
  { id: 'standard', name: 'Standard Pack', tokens: 150, amount: 1000, popular: true },
  { id: 'premium', name: 'Premium Pack', tokens: 500, amount: 3000 },
  { id: 'pro', name: 'Pro Pack', tokens: 1500, amount: 8000 },
];

export function useTokens() {
  const { user, session } = useAuth();
  const queryClient = useQueryClient();

  // Fetch token status
  const { data: tokenStatus, isLoading, refetch } = useQuery({
    queryKey: ['token-status', user?.id],
    queryFn: async (): Promise<TokenStatus> => {
      if (!session?.access_token) throw new Error('Not authenticated');
      
      const { data, error } = await supabase.functions.invoke('daily-tokens', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) throw error;
      return data;
    },
    enabled: !!user && !!session,
    refetchInterval: 60000, // Refetch every minute to update countdown
  });

  // Claim daily free tokens
  const claimFreeTokensMutation = useMutation({
    mutationFn: async () => {
      if (!session?.access_token) throw new Error('Not authenticated');
      
      const { data, error } = await supabase.functions.invoke('daily-tokens?action=claim', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error);
      return data;
    },
    onSuccess: (data) => {
      toast.success(data.message);
      queryClient.invalidateQueries({ queryKey: ['token-status'] });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to claim free tokens');
    },
  });

  // Initiate payment
  const initiatePaymentMutation = useMutation({
    mutationFn: async (packageId: string) => {
      if (!session?.access_token) throw new Error('Not authenticated');
      
      const { data, error } = await supabase.functions.invoke('paystack-payment', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
        body: {
          packageId,
          callbackUrl: `${window.location.origin}/payment`,
        },
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error);
      return data;
    },
    onSuccess: (data) => {
      if (data.dev_mode) {
        toast.info('Development mode - Paystack not configured yet');
      }
      // Redirect to Paystack authorization URL
      if (data.data?.authorization_url) {
        window.location.href = data.data.authorization_url;
      }
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to initiate payment');
    },
  });

  // Verify payment
  const verifyPaymentMutation = useMutation({
    mutationFn: async (reference: string) => {
      if (!session?.access_token) throw new Error('Not authenticated');
      
      const { data, error } = await supabase.functions.invoke('paystack-payment', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
        body: { reference },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      if (data.success) {
        toast.success(`${data.tokens_added} tokens added to your account!`);
        queryClient.invalidateQueries({ queryKey: ['token-status'] });
      }
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Payment verification failed');
    },
  });

  return {
    tokenStatus,
    isLoading,
    refetchTokens: refetch,
    claimFreeTokens: claimFreeTokensMutation.mutate,
    isClaimingTokens: claimFreeTokensMutation.isPending,
    initiatePayment: initiatePaymentMutation.mutate,
    isInitiatingPayment: initiatePaymentMutation.isPending,
    verifyPayment: verifyPaymentMutation.mutate,
    isVerifyingPayment: verifyPaymentMutation.isPending,
  };
}
