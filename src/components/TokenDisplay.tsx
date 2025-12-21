import { Coins, Gift, Clock, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useTokens } from '@/hooks/useTokens';
import { useNavigate } from 'react-router-dom';

interface TokenDisplayProps {
  compact?: boolean;
  showClaimButton?: boolean;
}

export function TokenDisplay({ compact = false, showClaimButton = true }: TokenDisplayProps) {
  const navigate = useNavigate();
  const { 
    tokenStatus, 
    isLoading, 
    claimFreeTokens, 
    isClaimingTokens 
  } = useTokens();

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span>Loading...</span>
      </div>
    );
  }

  if (compact) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 bg-secondary rounded-lg">
        <Coins className="h-4 w-4 text-primary" />
        <span className="font-medium">{tokenStatus?.current_balance || 0}</span>
        <span className="text-muted-foreground text-sm">tokens</span>
        {tokenStatus?.can_claim_free_tokens && showClaimButton && (
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-xs ml-1"
            onClick={() => claimFreeTokens()}
            disabled={isClaimingTokens}
          >
            <Gift className="h-3 w-3 mr-1" />
            Claim
          </Button>
        )}
      </div>
    );
  }

  const formatTimeUntilReset = () => {
    if (!tokenStatus) return '';
    const { hours_until_reset, minutes_until_reset } = tokenStatus;
    if (hours_until_reset > 0) {
      return `${hours_until_reset}h ${minutes_until_reset}m`;
    }
    return `${minutes_until_reset}m`;
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Coins className="h-5 w-5 text-primary" />
          Token Balance
        </CardTitle>
        <CardDescription>
          Use tokens to run AI models
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-baseline gap-2">
          <span className="text-4xl font-bold text-primary">
            {tokenStatus?.current_balance || 0}
          </span>
          <span className="text-muted-foreground">tokens available</span>
        </div>

        {tokenStatus && tokenStatus.credits_used > 0 && (
          <div className="space-y-1.5">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Total used</span>
              <span>{tokenStatus.credits_used} tokens</span>
            </div>
            <Progress 
              value={Math.min((tokenStatus.credits_used / (tokenStatus.credits_used + tokenStatus.current_balance)) * 100, 100)} 
              className="h-1.5"
            />
          </div>
        )}

        <div className="flex flex-col gap-2">
          {tokenStatus?.can_claim_free_tokens ? (
            <Button 
              onClick={() => claimFreeTokens()} 
              disabled={isClaimingTokens}
              className="w-full gap-2"
              variant="outline"
            >
              {isClaimingTokens ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Gift className="h-4 w-4" />
              )}
              Claim {tokenStatus.daily_free_tokens} Free Tokens
            </Button>
          ) : (
            <div className="flex items-center justify-center gap-2 py-2 px-3 bg-muted rounded-md text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              Next free tokens in {formatTimeUntilReset()}
            </div>
          )}

          <Button 
            onClick={() => navigate('/payment')}
            className="w-full"
          >
            <Coins className="h-4 w-4 mr-2" />
            Buy More Tokens
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
