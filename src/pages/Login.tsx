import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { TrendingUp, Github, Mail } from 'lucide-react';
import { motion } from 'motion/react';

interface LoginPageProps {
  onLogin: () => void;
}

export function LoginPage({ onLogin }: LoginPageProps) {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-muted/30 p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <div className="flex flex-col items-center gap-4 mb-8">
          <div className="h-12 w-12 bg-primary rounded-xl flex items-center justify-center shadow-xl">
            <TrendingUp className="h-7 w-7 text-primary-foreground" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Luminous</h1>
          <p className="text-muted-foreground text-center">Your intelligent stock market companion.</p>
        </div>
        <Card className="shadow-2xl border-none">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold">Sign in</CardTitle>
            <CardDescription>Enter your email below to access your dashboard</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="grid grid-cols-2 gap-6">
              <Button variant="outline" className="gap-2">
                <Github className="h-4 w-4" /> Github
              </Button>
              <Button variant="outline" className="gap-2">
                <Mail className="h-4 w-4" /> Google
              </Button>
            </div>
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">Or continue with</span>
              </div>
            </div>
            <div className="grid gap-2">
              <Input id="email" type="email" placeholder="m@example.com" />
            </div>
            <div className="grid gap-2">
              <Input id="password" type="password" placeholder="••••••••" />
            </div>
          </CardContent>
          <CardFooter>
            <Button className="w-full py-6 text-lg font-semibold" onClick={onLogin}>
              Login to Dashboard
            </Button>
          </CardFooter>
        </Card>
        <p className="mt-8 text-center text-sm text-muted-foreground">
          Don't have an account? <span className="text-primary font-semibold cursor-pointer hover:underline">Sign up</span>
        </p>
      </motion.div>
    </div>
  );
}
