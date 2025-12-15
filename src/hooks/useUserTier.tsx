import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export type AccountTier = 'free' | 'pro' | 'studio' | 'enterprise';

// Features restricted by tier
export const TIER_FEATURES = {
  free: ['ai-chat', 'script-breakdown'],
  pro: ['ai-chat', 'script-breakdown', 'audio-cleanup', 'mesh-generator'],
  studio: ['ai-chat', 'script-breakdown', 'audio-cleanup', 'mesh-generator', 'motion-generator', 'storyboard', 'vfx-animation', 'roto-tracking'],
  enterprise: ['all'],
} as const;

// Special full-access emails
const FULL_ACCESS_EMAILS = ['ovieadidi@gmail.com', 'ovie.adidi@example.com', 'ovieadidi@example.com'];

export function useUserTier() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: profile, isLoading, error } = useQuery({
    queryKey: ['user-tier', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      
      const { data, error } = await supabase
        .from('profiles')
        .select('account_tier, email, full_name, credits_remaining')
        .eq('id', user.id)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Check if user has special full access
  const hasFullAccess = FULL_ACCESS_EMAILS.some(
    email => user?.email?.toLowerCase() === email.toLowerCase() || 
             profile?.email?.toLowerCase() === email.toLowerCase()
  );

  const tier: AccountTier = hasFullAccess ? 'enterprise' : (profile?.account_tier as AccountTier) || 'free';

  const canAccessFeature = (feature: string): boolean => {
    if (hasFullAccess) return true;
    if (tier === 'enterprise') return true;
    
    const tierFeatures = TIER_FEATURES[tier] || TIER_FEATURES.free;
    return tierFeatures.includes(feature as any);
  };

  const isStudioFeature = (feature: string): boolean => {
    return ['motion-generator', 'storyboard', 'roto-tracking'].includes(feature);
  };

  const getTierLabel = (): string => {
    if (hasFullAccess) return 'VIP Access';
    switch (tier) {
      case 'enterprise': return 'Enterprise';
      case 'studio': return 'Studio';
      case 'pro': return 'Pro';
      default: return 'Free';
    }
  };

  const getTierColor = (): string => {
    if (hasFullAccess) return 'bg-gradient-to-r from-amber-500 to-yellow-400 text-black';
    switch (tier) {
      case 'enterprise': return 'bg-purple-600 text-white';
      case 'studio': return 'bg-primary text-primary-foreground';
      case 'pro': return 'bg-blue-600 text-white';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  return {
    tier,
    profile,
    isLoading,
    error,
    hasFullAccess,
    canAccessFeature,
    isStudioFeature,
    getTierLabel,
    getTierColor,
  };
}
