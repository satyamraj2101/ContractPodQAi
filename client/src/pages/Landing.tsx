import { Bot, Lock, Zap, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default function Landing() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <div className="container mx-auto px-6 py-16">
        <div className="flex flex-col items-center justify-center min-h-[80vh] text-center">
          <div className="mb-8">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center mx-auto mb-6 shadow-xl shadow-primary/20">
              <Bot className="w-10 h-10 text-primary-foreground" />
            </div>
            <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
              ContractPodAI Assistant
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              AI-powered documentation assistant for your CLM platform. Get instant, accurate answers with source citations.
            </p>
          </div>

          <div className="flex gap-4">
            <Button
              size="lg"
              className="text-lg px-8 py-6 shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 transition-all"
              onClick={() => window.location.href = '/login'}
              data-testid="button-login"
            >
              <Lock className="w-5 h-5 mr-2" />
              Sign In
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="text-lg px-8 py-6"
              onClick={() => window.location.href = '/register'}
              data-testid="button-register"
            >
              Create Account
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-20 max-w-5xl">
            <Card className="p-8 hover-elevate">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                <Bot className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Smart AI Responses</h3>
              <p className="text-sm text-muted-foreground">
                Get precise answers powered by OpenAI, trained exclusively on your ContractPodAI documentation.
              </p>
            </Card>

            <Card className="p-8 hover-elevate">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                <Zap className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Source Citations</h3>
              <p className="text-sm text-muted-foreground">
                Every answer includes clickable links to exact source documents for quick verification.
              </p>
            </Card>

            <Card className="p-8 hover-elevate">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                <Shield className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Secure & Internal</h3>
              <p className="text-sm text-muted-foreground">
                Secure team-only access with automatic chat cleanup after 7 days for data privacy.
              </p>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
