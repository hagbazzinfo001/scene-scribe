import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

/**
 * Token Status Interface
 * 
 * Represents the current state of a user's token balance and claim eligibility.
 */
interface TokenStatus {
  current_balance: number;
  credits_used: number;
  daily_free_tokens: number;
  can_claim_free_tokens: boolean;
  hours_until_reset: number;
  minutes_until_reset: number;
  last_claim: string | null;
}

/**
 * Token Package Interface
 * 
 * Represents a purchasable token package.
 */
interface TokenPackage {
  id: string;
  name: string;
  tokens: number;
  amount: number;       // Price in Naira
  popular?: boolean;
}

/**
 * Available Token Packages
 * 
 * To modify packages, update both here AND in paystack-payment/index.ts
 */
export const TOKEN_PACKAGES: TokenPackage[] = [
  { id: 'starter', name: 'Starter Pack', tokens: 50, amount: 500 },
  { id: 'standard', name: 'Standard Pack', tokens: 150, amount: 1000, popular: true },
  { id: 'premium', name: 'Premium Pack', tokens: 500, amount: 3000 },
  { id: 'pro', name: 'Pro Pack', tokens: 1500, amount: 8000 },
];

/**
 * useTokens Hook
 * 
 * Provides token management functionality:
 * - Fetch current token balance and status
 * - Claim daily free tokens
 * - Initiate token purchases
 * - Verify payment completion
 * 
 * Usage:
 * ```tsx
 * const { tokenStatus, claimFreeTokens, initiatePayment } = useTokens();
 * ```
 */
export function useTokens() {
  const { user, session } = useAuth();
  const queryClient = useQueryClient();

  // Fetch token status
  const { data: tokenStatus, isLoading, refetch, error } = useQuery({
    queryKey: ['token-status', user?.id],
    queryFn: async (): Promise<TokenStatus> => {
      if (!session?.access_token) throw new Error('Not authenticated');
      
      const { data, error } = await supabase.functions.invoke('daily-tokens', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) {
        console.error('Token status error:', error);
        throw error;
      }
      return data;
    },
    enabled: !!user && !!session,
    refetchInterval: 60000, // Refetch every minute to update countdown
    retry: 2,
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
      if (!data.success && data.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (data) => {
      if (data.dev_mode) {
        toast.info('Development mode - Paystack not configured. Configure PAYSTACK_SECRET_KEY in Supabase secrets.');
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
    // Token status
    tokenStatus,
    isLoading,
    error,
    refetchTokens: refetch,
    
    // Claim free tokens
    claimFreeTokens: claimFreeTokensMutation.mutate,
    isClaimingTokens: claimFreeTokensMutation.isPending,
    
    // Payment
    initiatePayment: initiatePaymentMutation.mutate,
    isInitiatingPayment: initiatePaymentMutation.isPending,
    verifyPayment: verifyPaymentMutation.mutate,
    isVerifyingPayment: verifyPaymentMutation.isPending,
    
    // Packages for display
    packages: TOKEN_PACKAGES,
  };
}
