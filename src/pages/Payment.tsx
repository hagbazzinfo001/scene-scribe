import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Coins, Check, Loader2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useTokens, TOKEN_PACKAGES } from '@/hooks/useTokens';
import { useAuth } from '@/hooks/useAuth';
import { TokenDisplay } from '@/components/TokenDisplay';

export default function Payment() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const { 
    initiatePayment, 
    isInitiatingPayment, 
    verifyPayment, 
    isVerifyingPayment,
    tokenStatus,
  } = useTokens();

  // Handle payment verification on return from Paystack
  useEffect(() => {
    const reference = searchParams.get('reference');
    if (reference) {
      verifyPayment(reference);
      // Clean up URL
      navigate('/payment', { replace: true });
    }
  }, [searchParams, verifyPayment, navigate]);

  if (!user) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <CardTitle>Sign In Required</CardTitle>
            <CardDescription>
              Please sign in to purchase tokens
            </CardDescription>
          </CardHeader>
          <CardFooter>
            <Button onClick={() => navigate('/auth')} className="w-full">
              Sign In
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-6 p-4 md:p-8">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Buy Tokens</h1>
          <p className="text-muted-foreground">
            Purchase tokens to use AI models for your projects
          </p>
        </div>
        <div className="w-full md:w-auto md:min-w-[300px]">
          <TokenDisplay showClaimButton={true} />
        </div>
      </div>

      {isVerifyingPayment && (
        <Card className="border-primary">
          <CardContent className="flex items-center justify-center gap-3 py-6">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
            <span>Verifying your payment...</span>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {TOKEN_PACKAGES.map((pkg) => (
          <Card 
            key={pkg.id} 
            className={`relative transition-all hover:shadow-lg ${
              pkg.popular ? 'border-primary shadow-md' : ''
            }`}
          >
            {pkg.popular && (
              <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 gap-1">
                <Sparkles className="h-3 w-3" />
                Popular
              </Badge>
            )}
            <CardHeader className="text-center pb-2">
              <CardTitle className="text-xl">{pkg.name}</CardTitle>
              <CardDescription>
                Best for {pkg.tokens < 100 ? 'trying out' : pkg.tokens < 300 ? 'regular use' : pkg.tokens < 1000 ? 'heavy projects' : 'professional work'}
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center space-y-4">
              <div className="flex items-center justify-center gap-2">
                <Coins className="h-8 w-8 text-primary" />
                <span className="text-4xl font-bold">{pkg.tokens}</span>
              </div>
              <p className="text-sm text-muted-foreground">tokens</p>
              <div className="text-2xl font-semibold">
                ₦{pkg.amount.toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground">
                ₦{(pkg.amount / pkg.tokens).toFixed(1)} per token
              </p>
            </CardContent>
            <CardFooter>
              <Button 
                onClick={() => initiatePayment(pkg.id)}
                disabled={isInitiatingPayment}
                className="w-full"
                variant={pkg.popular ? 'default' : 'outline'}
              >
                {isInitiatingPayment ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Check className="h-4 w-4 mr-2" />
                )}
                Buy Now
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>

      <Card className="bg-muted/30">
        <CardContent className="py-6">
          <h3 className="font-semibold mb-4">Token Usage Guide</h3>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-1">
              <p className="font-medium">Script Breakdown</p>
              <p className="text-sm text-muted-foreground">~5 tokens per page</p>
            </div>
            <div className="space-y-1">
              <p className="font-medium">Rotoscoping</p>
              <p className="text-sm text-muted-foreground">~10 tokens per minute</p>
            </div>
            <div className="space-y-1">
              <p className="font-medium">3D Mesh Generation</p>
              <p className="text-sm text-muted-foreground">~15 tokens per model</p>
            </div>
            <div className="space-y-1">
              <p className="font-medium">Audio Cleanup</p>
              <p className="text-sm text-muted-foreground">~3 tokens per minute</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
