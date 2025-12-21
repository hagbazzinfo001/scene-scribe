import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Coins, Loader2} from 'lucide-react';
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
  } = useTokens();

  useEffect(() => {
    const reference = searchParams.get('reference');
    if (reference) {
      verifyPayment(reference);
      navigate('/payment', { replace: true });
    }
  }, [searchParams, verifyPayment, navigate]);

  if (!user) {
    return (
      <div className="flex-1 flex items-center justify-center p-4 md:p-8">
        <Card className="max-w-sm w-full">
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
    <div className="flex-1 p-4 md:p-8">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Buy Tokens</h1>
          <p className="text-muted-foreground mt-1">
            Purchase tokens to power AI models for your projects
          </p>
        </div>
        <div className="w-full lg:w-auto lg:min-w-[320px]">
          <TokenDisplay showClaimButton={true} />
        </div>
      </div>

      {/* Payment Verification */}
      {isVerifyingPayment && (
        <Card className="mb-8 border-primary">
          <CardContent className="flex items-center justify-center gap-3 py-6">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
            <span>Verifying your payment...</span>
          </CardContent>
        </Card>
      )}

      {/* Token Packages */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4 mb-8">
        {TOKEN_PACKAGES.map((pkg) => {
          const pricePerToken = (pkg.amount / pkg.tokens).toFixed(1);
          const savings = pkg.tokens > 50 ? Math.round((1 - (pkg.amount / pkg.tokens) / 10) * 100) : 0;
          
          return (
            <Card 
              key={pkg.id} 
              className={`relative transition-shadow hover:shadow-lg ${
                pkg.popular ? 'ring-2 ring-primary' : ''
              }`}
            >
              {pkg.popular && (
                <Badge className="absolute -top-2.5 left-1/2 -translate-x-1/2">
                  Popular
                </Badge>
              )}
              
              <CardHeader className={pkg.popular ? 'pt-6' : ''}>
                <CardTitle className="text-lg">{pkg.name}</CardTitle>
                <CardDescription>
                  {pkg.tokens < 100 ? 'Try it out' : 
                   pkg.tokens < 300 ? 'Regular use' : 
                   pkg.tokens < 1000 ? 'Heavy projects' : 
                   'Professional work'}
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-4">
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1.5">
                    <Coins className="h-5 w-5 text-primary" />
                    <span className="text-4xl font-bold">{pkg.tokens.toLocaleString()}</span>
                  </div>
                  <p className="text-sm text-muted-foreground">tokens</p>
                </div>

                <div className="text-center py-3 border-t border-b">
                  <p className="text-2xl font-semibold">₦{pkg.amount.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    ₦{pricePerToken} per token
                    {savings > 0 && (
                      <span className="text-primary font-medium ml-1">
                        · Save {savings}%
                      </span>
                    )}
                  </p>
                </div>
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
                    <Coins className="h-4 w-4 mr-2" />
                  )}
                  Buy Now
                </Button>
              </CardFooter>
            </Card>
          );
        })}
      </div>

      {/* Usage Guide */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Token Usage</CardTitle>
          <CardDescription>Estimated token costs for AI features</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-y-3 gap-x-8 sm:grid-cols-2 lg:grid-cols-4">
            <div className="flex justify-between sm:flex-col sm:gap-0.5">
              <span className="font-medium">Script Breakdown</span>
              <span className="text-muted-foreground text-sm">~5 tokens/page</span>
            </div>
            <div className="flex justify-between sm:flex-col sm:gap-0.5">
              <span className="font-medium">Rotoscoping</span>
              <span className="text-muted-foreground text-sm">~10 tokens/min</span>
            </div>
            <div className="flex justify-between sm:flex-col sm:gap-0.5">
              <span className="font-medium">3D Mesh Generation</span>
              <span className="text-muted-foreground text-sm">~15 tokens/model</span>
            </div>
            <div className="flex justify-between sm:flex-col sm:gap-0.5">
              <span className="font-medium">Audio Cleanup</span>
              <span className="text-muted-foreground text-sm">~3 tokens/min</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
