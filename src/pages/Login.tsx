import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/AuthContext';
import {
    Shield,
    Mail,
    Lock,
    ArrowRight,
    Loader2,
    LogIn
} from 'lucide-react';

export default function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isGoogleLoading, setIsGoogleLoading] = useState(false);
    const navigate = useNavigate();
    const { toast } = useToast();
    const { user } = useAuth();

    useEffect(() => {
        if (user) {
            navigate('/dashboard');
        }
    }, [user, navigate]);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            const { error } = await supabase.auth.signInWithPassword({
                email,
                password,
            });
            if (error) throw error;
            toast({
                title: "Welcome back!",
                description: "Successfully logged in.",
            });
            navigate('/dashboard');
        } catch (error: any) {
            toast({
                title: "Login failed",
                description: "Invalid email or password.",
                variant: "destructive",
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handleGoogleLogin = async () => {
        setIsGoogleLoading(true);
        try {
            const { error } = await supabase.auth.signInWithOAuth({
                provider: 'google',
            });
            if (error) throw error;
            navigate('/dashboard');
        } catch (error: any) {
            toast({
                title: "Google Login failed",
                description: error.message,
                variant: "destructive",
            });
        } finally {
            setIsGoogleLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4 overflow-hidden relative">
            {/* Abstract Background Decoration */}
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/5 rounded-full blur-3xl" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[30%] h-[30%] bg-indigo-500/5 rounded-full blur-3xl" />

            <div className="w-full max-w-md space-y-8 animate-in fade-in zoom-in duration-500 relative z-10">
                <div className="text-center space-y-2">
                    <div className="inline-flex items-center justify-center p-3 mb-4 rounded-2xl bg-primary/10 border border-primary/20 text-primary">
                        <Shield className="w-8 h-8" />
                    </div>
                    <h1 className="text-4xl font-black tracking-tight text-foreground">
                        Welcome to <span className="text-primary italic">ZigZup</span>
                    </h1>
                    <p className="text-muted-foreground font-medium">Log in to your workspace.</p>
                </div>

                <div className="bg-card/50 backdrop-blur-xl border border-border rounded-3xl p-8 shadow-2xl space-y-6">
                    <div className="space-y-4">
                        <Button
                            variant="outline"
                            className="w-full h-12 gap-3 border-border bg-background hover:bg-muted/50 font-bold transition-all active:scale-95"
                            onClick={handleGoogleLogin}
                            disabled={isGoogleLoading}
                        >
                            {isGoogleLoading ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                                <svg className="w-5 h-5" viewBox="0 0 24 24">
                                    <path
                                        fill="currentColor"
                                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                                    />
                                    <path
                                        fill="currentColor"
                                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                                    />
                                    <path
                                        fill="currentColor"
                                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
                                    />
                                    <path
                                        fill="currentColor"
                                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                                    />
                                </svg>
                            )}
                            Continue with Google
                        </Button>

                        <div className="relative">
                            <div className="absolute inset-0 flex items-center">
                                <span className="w-full border-t border-border"></span>
                            </div>
                            <div className="relative flex justify-center text-[10px] uppercase font-bold tracking-widest">
                                <span className="bg-card px-3 text-muted-foreground">Or with email</span>
                            </div>
                        </div>
                    </div>

                    <form onSubmit={handleLogin} className="space-y-5">
                        <div className="space-y-2">
                            <Label htmlFor="email">Email address</Label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                                <Input
                                    id="email"
                                    type="email"
                                    placeholder="name@email.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="pl-10 h-12 bg-muted/20 border-border/50 focus:border-primary"
                                    required
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <Label htmlFor="password">Password</Label>
                                <a href="#" className="text-[11px] text-primary hover:underline font-bold">Forgot?</a>
                            </div>
                            <div className="relative">
                                <Lock className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                                <Input
                                    id="password"
                                    type="password"
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="pl-10 h-12 bg-muted/20 border-border/50 focus:border-primary"
                                    required
                                />
                            </div>
                        </div>

                        <Button
                            type="submit"
                            className="w-full h-12 text-base font-bold gap-2 group shadow-lg shadow-primary/20"
                            disabled={isLoading}
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    Logging in...
                                </>
                            ) : (
                                <>
                                    <LogIn className="w-5 h-5" />
                                    Sign In
                                    <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
                                </>
                            )}
                        </Button>
                    </form>

                    <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                            <span className="w-full border-t border-border/50"></span>
                        </div>
                        <div className="relative flex justify-center text-[11px] uppercase tracking-wider font-bold">
                            <span className="bg-card px-2 text-muted-foreground">Protecting your ideas</span>
                        </div>
                    </div>
                </div>

                <p className="text-center text-sm text-muted-foreground">
                    New user?{' '}
                    <Link to="/signup" className="text-primary font-bold hover:underline">
                        Create account
                    </Link>
                </p>
            </div>
        </div>
    );
}
