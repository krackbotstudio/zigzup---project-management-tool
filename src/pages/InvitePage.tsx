import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { Loader2, CheckCircle2, XCircle, Users, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface InviteData {
    id: string;
    workspace_id: string;
    workspace_name: string;
    invited_by: string;
    invited_email: string;
    role: string;
    status: string;
}

export default function InvitePage() {
    const [params] = useSearchParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const inviteId = params.get('id');

    const [invite, setInvite] = useState<InviteData | null>(null);
    const [status, setStatus] = useState<'loading' | 'ready' | 'accepting' | 'accepted' | 'error' | 'expired'>('loading');
    const [errorMsg, setErrorMsg] = useState('');

    // Load invite data
    useEffect(() => {
        if (!inviteId) {
            setStatus('error');
            setErrorMsg('Invalid invite link — no invite ID found.');
            return;
        }

        supabase
            .from('invites')
            .select('*')
            .eq('id', inviteId)
            .single()
            .then(({ data, error }) => {
                if (error || !data) {
                    setStatus('error');
                    setErrorMsg('This invite link is invalid or has been removed.');
                    return;
                }
                if (data.status === 'accepted') {
                    setStatus('expired');
                    return;
                }
                setInvite(data as InviteData);
                setStatus('ready');
            });
    }, [inviteId]);

    // If the user is already logged in and the invite email matches, auto-accept
    useEffect(() => {
        if (status !== 'ready' || !invite || !user) return;

        if (user.email !== invite.invited_email) {
            // User is logged in with a different email — just show the info, let them act
            return;
        }

        // Email matches — auto-accept
        handleAccept();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [status, invite, user]);

    const handleAccept = async () => {
        if (!invite || !user) return;
        setStatus('accepting');

        const { error: memberError } = await supabase.from('members').upsert({
            workspace_id: invite.workspace_id,
            user_id: user.id,
            email: user.email,
            name: user.user_metadata?.name || user.email?.split('@')[0] || 'Member',
            role: invite.role,
            avatar: user.user_metadata?.avatar_url ?? null,
        }, { onConflict: 'workspace_id,user_id' });

        if (memberError) {
            setStatus('error');
            setErrorMsg('Failed to join the workspace. Please try again.');
            return;
        }

        await supabase.from('invites').update({ status: 'accepted' }).eq('id', invite.id);
        await supabase.from('notifications').insert({
            user_id: user.id,
            title: 'Added to workspace',
            message: `You've been added to "${invite.workspace_name}" as ${invite.role} by ${invite.invited_by}.`,
            type: 'system',
            is_read: false,
            created_at: new Date().toISOString(),
        });

        setStatus('accepted');
        // Redirect to dashboard after short delay so the workspace loads
        setTimeout(() => navigate('/dashboard'), 2000);
    };

    return (
        <div className="min-h-screen bg-background flex items-center justify-center p-6">
            <div className="w-full max-w-md">
                {/* Logo */}
                <div className="flex items-center justify-center gap-2 mb-10">
                    <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                        <Zap className="w-5 h-5 text-white" />
                    </div>
                    <span className="text-xl font-bold tracking-tight">ZigZup</span>
                </div>

                <div className="bg-card border border-border rounded-3xl p-8 shadow-xl text-center space-y-6">

                    {/* Loading */}
                    {(status === 'loading' || status === 'accepting') && (
                        <>
                            <Loader2 className="w-10 h-10 animate-spin text-primary mx-auto" />
                            <p className="text-muted-foreground text-sm">
                                {status === 'loading' ? 'Loading invitation…' : 'Joining workspace…'}
                            </p>
                        </>
                    )}

                    {/* Accepted */}
                    {status === 'accepted' && (
                        <>
                            <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto" />
                            <div>
                                <h2 className="text-xl font-bold">You're in!</h2>
                                <p className="text-muted-foreground text-sm mt-1">
                                    You've joined <span className="font-semibold text-foreground">{invite?.workspace_name}</span>. Redirecting to your dashboard…
                                </p>
                            </div>
                            <Loader2 className="w-4 h-4 animate-spin text-muted-foreground mx-auto" />
                        </>
                    )}

                    {/* Expired */}
                    {status === 'expired' && (
                        <>
                            <XCircle className="w-12 h-12 text-amber-500 mx-auto" />
                            <div>
                                <h2 className="text-xl font-bold">Invite already used</h2>
                                <p className="text-muted-foreground text-sm mt-1">
                                    This invite link has already been accepted. Log in to access your workspace.
                                </p>
                            </div>
                            <Button asChild className="w-full">
                                <Link to="/login">Log in</Link>
                            </Button>
                        </>
                    )}

                    {/* Error */}
                    {status === 'error' && (
                        <>
                            <XCircle className="w-12 h-12 text-destructive mx-auto" />
                            <div>
                                <h2 className="text-xl font-bold">Invalid invite</h2>
                                <p className="text-muted-foreground text-sm mt-1">{errorMsg}</p>
                            </div>
                            <Button asChild variant="outline" className="w-full">
                                <Link to="/">Go home</Link>
                            </Button>
                        </>
                    )}

                    {/* Ready — show invite info */}
                    {status === 'ready' && invite && (
                        <>
                            <div className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto">
                                <Users className="w-7 h-7 text-primary" />
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">
                                    <span className="font-semibold text-foreground">{invite.invited_by}</span> invited you to join
                                </p>
                                <h2 className="text-2xl font-bold mt-1">{invite.workspace_name}</h2>
                                <span className="inline-block mt-2 text-xs px-3 py-1 rounded-full bg-primary/10 text-primary font-semibold capitalize border border-primary/20">
                                    {invite.role}
                                </span>
                            </div>

                            {user ? (
                                // Logged in but different email
                                <div className="space-y-3">
                                    <p className="text-xs text-muted-foreground bg-amber-500/10 border border-amber-500/20 rounded-xl p-3">
                                        You're signed in as <span className="font-semibold">{user.email}</span>, but this invite is for <span className="font-semibold">{invite.invited_email}</span>.
                                        Please log in with the correct account.
                                    </p>
                                    <Button asChild variant="outline" className="w-full">
                                        <Link to="/login">Switch account</Link>
                                    </Button>
                                </div>
                            ) : (
                                // Not logged in — prompt to sign up or log in
                                <div className="space-y-3">
                                    <p className="text-xs text-muted-foreground">
                                        Create an account with <span className="font-semibold text-foreground">{invite.invited_email}</span> or log in to accept this invitation.
                                    </p>
                                    <Button asChild className="w-full">
                                        <Link to={`/signup?invite=${invite.id}&email=${encodeURIComponent(invite.invited_email)}`}>
                                            Create account & join
                                        </Link>
                                    </Button>
                                    <Button asChild variant="outline" className="w-full">
                                        <Link to={`/login?invite=${invite.id}`}>
                                            Log in to accept
                                        </Link>
                                    </Button>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
