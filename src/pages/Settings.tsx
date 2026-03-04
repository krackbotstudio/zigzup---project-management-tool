import { useState, useEffect } from 'react';
import {
    User,
    Bell,
    Shield,
    Settings as SettingsIcon,
    Globe,
    Save,
    Mail,
    Lock,
    Moon,
    Sun,
    Camera,
    Copy,
    Check,
    Link as LinkIcon
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { useTheme } from '@/context/ThemeContext';
import { useSettings } from '@/context/SettingsContext';
import { useProject } from '@/context/ProjectContext';
import { Language } from '@/i18n/translations';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { Users, Trash2, ShieldCheck, Plus, Building2, AlertTriangle, Crown } from 'lucide-react';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';

export default function Settings() {
    const { toast } = useToast();
    const { theme, setTheme, toggleTheme } = useTheme();
    const { language, setLanguage, timezone, setTimezone, boardViewMode, setBoardViewMode, t } = useSettings();
    const { members, activeWorkspaceId, workspaces, updateWorkspace, deleteWorkspace, inviteUser } = useProject();
    const { user } = useAuth();
    const [isLoading, setIsLoading] = useState(false);
    const activeWorkspace = workspaces.find(w => w.id === activeWorkspaceId);
    const isOwner = activeWorkspace?.ownerId === user?.id;

    // Invite state
    const [isInviteOpen, setIsInviteOpen] = useState(false);
    const [inviteEmail, setInviteEmail] = useState('');
    const [inviteRole, setInviteRole] = useState('member');
    const [isInviting, setIsInviting] = useState(false);
    const [inviteLink, setInviteLink] = useState('');
    const [linkCopied, setLinkCopied] = useState(false);

    // Workspace management state
    const [wsName, setWsName] = useState(activeWorkspace?.name || '');
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [confirmName, setConfirmName] = useState('');

    // Derive real user info from Supabase auth
    const provider = user?.app_metadata?.provider as string | undefined;
    const isGoogleUser = provider === 'google';
    const displayName =
        user?.user_metadata?.full_name ||
        user?.user_metadata?.name ||
        user?.email?.split('@')[0] ||
        'User';
    const avatarUrl =
        user?.user_metadata?.avatar_url ||
        user?.user_metadata?.picture ||
        null;
    const currentMember = members.find(m => m.userId === user?.id && m.workspaceId === activeWorkspaceId);
    const userRole = currentMember?.role || 'member';

    // Profile form state — initialised from live user object
    const [profileName, setProfileName] = useState('');
    const [profileBio, setProfileBio] = useState('');
    const [isSavingProfile, setIsSavingProfile] = useState(false);

    useEffect(() => {
        if (user) {
            setProfileName(
                user.user_metadata?.full_name ||
                user.user_metadata?.name ||
                user.email?.split('@')[0] ||
                ''
            );
            setProfileBio(user.user_metadata?.bio || '');
        }
    }, [user?.id]);

    const handleSaveProfile = async () => {
        setIsSavingProfile(true);
        try {
            const { error } = await supabase.auth.updateUser({
                data: { name: profileName, full_name: profileName, bio: profileBio }
            });
            if (error) throw error;
            // Sync the member display name too
            if (currentMember) {
                await supabase.from('members').update({ name: profileName }).eq('id', currentMember.id);
            }
            toast({ title: "Profile saved", description: "Your details have been updated." });
        } catch (e: any) {
            toast({ title: "Failed to save profile", description: e.message, variant: "destructive" });
        } finally {
            setIsSavingProfile(false);
        }
    };

    // Password change state (email users only)
    const [newPass, setNewPass] = useState('');
    const [confirmPass, setConfirmPass] = useState('');
    const [isChangingPassword, setIsChangingPassword] = useState(false);

    const handleChangePassword = async () => {
        if (newPass !== confirmPass) {
            toast({ title: "Passwords don't match", variant: "destructive" });
            return;
        }
        if (newPass.length < 6) {
            toast({ title: "Password too short", description: "Minimum 6 characters.", variant: "destructive" });
            return;
        }
        setIsChangingPassword(true);
        try {
            const { error } = await supabase.auth.updateUser({ password: newPass });
            if (error) throw error;
            toast({ title: "Password updated successfully" });
            setNewPass(''); setConfirmPass('');
        } catch (e: any) {
            toast({ title: "Failed to update password", description: e.message, variant: "destructive" });
        } finally {
            setIsChangingPassword(false);
        }
    };

    const handleSave = (section: string) => {
        setIsLoading(true);
        setTimeout(() => {
            setIsLoading(false);
            toast({
                title: "Settings updated",
                description: `Your ${section} settings have been saved successfully.`,
            });
        }, 1000);
    };

    return (
        <div className="p-6 max-w-5xl mx-auto animate-fade-in pb-20">
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-foreground">Settings</h1>
                <p className="text-muted-foreground mt-1">Manage your account preferences and application settings.</p>
            </div>

            <Tabs defaultValue="profile" className="space-y-8">
                <TabsList className="bg-muted/50 p-1 border border-border">
                    <TabsTrigger value="profile" className="gap-2 px-6">
                        <User className="w-4 h-4" /> Profile
                    </TabsTrigger>
                    <TabsTrigger value="general" className="gap-2 px-6">
                        <Globe className="w-4 h-4" /> General
                    </TabsTrigger>
                    <TabsTrigger value="notifications" className="gap-2 px-6">
                        <Bell className="w-4 h-4" /> Notifications
                    </TabsTrigger>
                    <TabsTrigger value="security" className="gap-2 px-6">
                        <Shield className="w-4 h-4" /> Security
                    </TabsTrigger>
                    <TabsTrigger value="members" className="gap-2 px-6">
                        <Users className="w-4 h-4" /> Members
                    </TabsTrigger>
                    <TabsTrigger value="workspace" className="gap-2 px-6">
                        <Building2 className="w-4 h-4" /> Workspace
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="profile" className="space-y-6 animate-in slide-in-from-left-2 duration-300">
                    <div className="bg-card border border-border rounded-2xl p-8 shadow-sm">
                        <div className="flex flex-col md:flex-row items-start gap-10">
                            {/* Avatar + identity */}
                            <div className="flex flex-col items-center gap-4 min-w-[140px]">
                                <div className="relative group">
                                    <Avatar className="w-32 h-32 border-4 border-background ring-1 ring-border shadow-xl">
                                        {avatarUrl ? (
                                            <AvatarImage src={avatarUrl} referrerPolicy="no-referrer" />
                                        ) : (
                                            <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(displayName)}&backgroundColor=4f46e5&textColor=ffffff`} />
                                        )}
                                        <AvatarFallback className="text-3xl font-bold bg-primary/10 text-primary">
                                            {displayName.charAt(0).toUpperCase()}
                                        </AvatarFallback>
                                    </Avatar>
                                    {!isGoogleUser && (
                                        <button className="absolute bottom-1 right-1 p-2 bg-primary text-primary-foreground rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-all scale-90 group-hover:scale-100">
                                            <Camera className="w-4 h-4" />
                                        </button>
                                    )}
                                </div>
                                <div className="text-center space-y-1">
                                    <h3 className="font-bold text-base leading-tight">{displayName}</h3>
                                    <p className="text-xs text-muted-foreground capitalize">{userRole}</p>
                                    {/* Provider badge */}
                                    <div className={cn(
                                        "inline-flex items-center gap-1.5 text-[10px] font-bold px-2 py-1 rounded-full border mt-1",
                                        isGoogleUser
                                            ? "bg-blue-500/10 border-blue-500/20 text-blue-500"
                                            : "bg-muted/40 border-border text-muted-foreground"
                                    )}>
                                        {isGoogleUser ? (
                                            <svg className="w-3 h-3" viewBox="0 0 24 24">
                                                <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                                <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                                <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
                                                <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                                            </svg>
                                        ) : (
                                            <Mail className="w-3 h-3" />
                                        )}
                                        {isGoogleUser ? 'Google account' : 'Email & password'}
                                    </div>
                                </div>
                            </div>

                            {/* Form fields */}
                            <div className="flex-1 w-full space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <Label htmlFor="profileName">Full Name</Label>
                                        <Input
                                            id="profileName"
                                            value={profileName}
                                            onChange={(e) => setProfileName(e.target.value)}
                                            placeholder="Your full name"
                                            className="bg-muted/10"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="profileEmail">Email Address</Label>
                                        <Input
                                            id="profileEmail"
                                            value={user?.email || ''}
                                            readOnly
                                            className="bg-muted/10 cursor-not-allowed opacity-70"
                                        />
                                        {isGoogleUser && (
                                            <p className="text-[11px] text-muted-foreground">Managed by your Google account.</p>
                                        )}
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="profileBio">Bio</Label>
                                    <Textarea
                                        id="profileBio"
                                        placeholder="Tell your team a bit about yourself..."
                                        value={profileBio}
                                        onChange={(e) => setProfileBio(e.target.value.slice(0, 250))}
                                        className="min-h-[120px] bg-muted/10 leading-relaxed"
                                    />
                                    <p className="text-[11px] text-muted-foreground">{profileBio.length}/250 characters</p>
                                </div>

                                {isGoogleUser && (
                                    <div className="flex items-start gap-3 p-3 rounded-xl bg-blue-500/5 border border-blue-500/15 text-blue-600 dark:text-blue-400 text-xs leading-relaxed">
                                        <svg className="w-3.5 h-3.5 mt-0.5 shrink-0" viewBox="0 0 24 24">
                                            <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                            <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                            <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
                                            <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                                        </svg>
                                        Signed in with Google. Your avatar and email are pulled from your Google account and cannot be changed here.
                                    </div>
                                )}

                                <div className="pt-2 flex justify-end">
                                    <Button
                                        onClick={handleSaveProfile}
                                        disabled={isSavingProfile}
                                        className="gap-2 h-10 px-8"
                                    >
                                        {isSavingProfile ? "Saving..." : <><Save className="w-4 h-4" /> Save Profile</>}
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </div>
                </TabsContent>

                <TabsContent value="general" className="space-y-6 animate-in slide-in-from-left-2 duration-300">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="bg-card border border-border rounded-2xl p-6 shadow-sm space-y-6">
                            <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                                <Globe className="w-4 h-4" /> Language & Region
                            </h3>
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <Label>{t('language')}</Label>
                                    <select
                                        value={language}
                                        onChange={(e) => setLanguage(e.target.value as Language)}
                                        className="w-full h-10 px-3 rounded-lg border border-border bg-muted/10 text-sm focus:ring-1 focus:ring-primary outline-none"
                                    >
                                        <option value="en">English (United States)</option>
                                        <option value="hi">हिन्दी (Hindi)</option>
                                        <option value="te">తెలుగు (Telugu)</option>
                                        <option value="ta">தமிழ் (Tamil)</option>
                                        <option value="ml">മലയാളം (Malayalam)</option>
                                        <option value="bn">বাংলা (Bengali)</option>
                                        <option value="sa">संस्कृतम् (Sanskrit)</option>
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <Label>{t('timezone')}</Label>
                                    <select
                                        value={timezone}
                                        onChange={(e) => setTimezone(e.target.value)}
                                        className="w-full h-10 px-3 rounded-lg border border-border bg-muted/10 text-sm focus:ring-1 focus:ring-primary outline-none"
                                    >
                                        <option value="America/Los_Angeles">(GMT-08:00) Pacific Time</option>
                                        <option value="Europe/London">(GMT+00:00) London</option>
                                        <option value="Asia/Kolkata">(GMT+05:30) India Standard Time (Mumbai)</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        <div className="bg-card border border-border rounded-2xl p-6 shadow-sm space-y-6">
                            <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                                <Sun className="w-4 h-4" /> Appearance
                            </h3>
                            <div className="space-y-4">
                                <div className="flex items-center justify-between p-3 rounded-xl border border-border bg-muted/5">
                                    <div className="space-y-0.5">
                                        <Label className="text-sm">Dark Mode</Label>
                                        <p className="text-[11px] text-muted-foreground">Adjust the interface for lower light environment</p>
                                    </div>
                                    <Switch
                                        checked={theme === 'dark'}
                                        onCheckedChange={toggleTheme}
                                    />
                                </div>
                                <div className="space-y-2 pt-2 border-t border-border/50 mt-2">
                                    <Label className="text-[11px] font-bold uppercase tracking-tighter text-muted-foreground">{t('board_view_mode')}</Label>
                                    <div className="grid grid-cols-2 gap-2 mt-1">
                                        <button
                                            onClick={() => setBoardViewMode('all')}
                                            className={cn(
                                                "px-3 py-2 rounded-lg border text-xs font-medium transition-all",
                                                boardViewMode === 'all'
                                                    ? "bg-primary text-primary-foreground border-primary shadow-sm"
                                                    : "bg-muted/10 border-border hover:bg-muted/20 text-muted-foreground"
                                            )}
                                        >
                                            {t('all_workspaces')}
                                        </button>
                                        <button
                                            onClick={() => setBoardViewMode('active')}
                                            className={cn(
                                                "px-3 py-2 rounded-lg border text-xs font-medium transition-all",
                                                boardViewMode === 'active'
                                                    ? "bg-primary text-primary-foreground border-primary shadow-sm"
                                                    : "bg-muted/10 border-border hover:bg-muted/20 text-muted-foreground"
                                            )}
                                        >
                                            {t('active_workspace_only')}
                                        </button>
                                    </div>
                                    <p className="text-[10px] text-muted-foreground mt-1 px-1">Control which boards appear in your overview.</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-card border border-border rounded-2xl p-6 shadow-sm space-y-6">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-6">
                                <div className="w-12 h-12 bg-indigo-500/10 rounded-2xl flex items-center justify-center text-indigo-500 border border-indigo-500/20">
                                    <SettingsIcon className="w-6 h-6" />
                                </div>
                                <div>
                                    <h4 className="font-bold">Database Setup</h4>
                                    <p className="text-sm text-muted-foreground">Initialize your Supabase collections with base mock data.</p>
                                </div>
                            </div>
                            <Button
                                variant="outline"
                                className="gap-2 border-indigo-500/30 text-indigo-600"
                                disabled={true}
                            >
                                Coming Soon
                            </Button>
                        </div>
                    </div>

                    <div className="bg-card border border-border rounded-2xl p-6 shadow-sm flex items-center justify-between">
                        <div className="flex items-center gap-6">
                            <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center text-primary border border-primary/20">
                                <Sun className="w-6 h-6" />
                            </div>
                            <div>
                                <h4 className="font-bold">System Maintenance</h4>
                                <p className="text-sm text-muted-foreground">Check for updates and manage system health.</p>
                            </div>
                        </div>
                        <Button variant="outline" className="gap-2">
                            Check for Updates
                        </Button>
                    </div>

                    <div className="pt-4 flex justify-end">
                        <Button onClick={() => handleSave('general')} disabled={isLoading} className="gap-2">
                            <Save className="w-4 h-4" /> Save Preferences
                        </Button>
                    </div>
                </TabsContent>

                <TabsContent value="notifications" className="space-y-6 animate-in slide-in-from-left-2 duration-300">
                    <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
                        <div className="p-6 border-b border-border bg-muted/5">
                            <h3 className="font-bold flex items-center gap-2">
                                <Bell className="w-4 h-4 text-primary" /> Notification Preferences
                            </h3>
                            <p className="text-sm text-muted-foreground mt-1">Configure how you want to receive updates.</p>
                        </div>

                        <div className="divide-y divide-border">
                            {[
                                { title: "Mentions", desc: "Get notified when someone @mentions you in a task or comment.", email: true, push: true },
                                { title: "Task Assignments", desc: "Receive a notification when a new task is assigned to you.", email: true, push: true },
                                { title: "Due Date Reminders", desc: "Get alerted when tasks are approaching their deadlines.", email: true, push: true },
                                { title: "Board Updates", desc: "Stay informed about general changes to boards you belong to.", email: false, push: true },
                                { title: "Weekly Reports", desc: "A summary of your team's weekly progress and your contribution.", email: true, push: false },
                            ].map((item, i) => (
                                <div key={i} className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 group hover:bg-muted/10 transition-colors">
                                    <div className="space-y-1 max-w-xl">
                                        <h4 className="text-sm font-bold text-foreground">{item.title}</h4>
                                        <p className="text-[12px] text-muted-foreground leading-relaxed">{item.desc}</p>
                                    </div>
                                    <div className="flex items-center gap-8">
                                        <div className="flex items-center gap-3 bg-muted/20 px-3 py-1.5 rounded-lg border border-border/50">
                                            <Mail className="w-3.5 h-3.5 text-muted-foreground" />
                                            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground min-w-10">Email</span>
                                            <Switch defaultChecked={item.email} />
                                        </div>
                                        <div className="flex items-center gap-3 bg-muted/20 px-3 py-1.5 rounded-lg border border-border/50">
                                            <Bell className="w-3.5 h-3.5 text-muted-foreground" />
                                            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground min-w-10">Push</span>
                                            <Switch defaultChecked={item.push} />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="p-6 bg-muted/5 flex justify-end">
                            <Button onClick={() => handleSave('notification')} disabled={isLoading} className="gap-2">
                                <Save className="w-4 h-4" /> Save Notification Settings
                            </Button>
                        </div>
                    </div>
                </TabsContent>

                <TabsContent value="security" className="space-y-6 animate-in slide-in-from-left-2 duration-300">
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                        <div className="lg:col-span-12">
                            {isGoogleUser ? (
                                /* Google users don't have a password */
                                <div className="bg-card border border-border rounded-2xl p-6 shadow-sm flex items-center gap-6">
                                    <div className="w-12 h-12 bg-blue-500/10 rounded-2xl flex items-center justify-center border border-blue-500/20 shrink-0">
                                        <svg className="w-6 h-6 text-blue-500" viewBox="0 0 24 24">
                                            <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                            <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                            <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
                                            <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                                        </svg>
                                    </div>
                                    <div>
                                        <h3 className="text-base font-bold">Signed in with Google</h3>
                                        <p className="text-sm text-muted-foreground mt-0.5">
                                            Your account uses Google for authentication. Password management is handled by Google — visit your{' '}
                                            <a href="https://myaccount.google.com/security" target="_blank" rel="noreferrer" className="text-primary underline underline-offset-2">Google Account</a> to change it.
                                        </p>
                                    </div>
                                </div>
                            ) : (
                                /* Email users can change password */
                                <div className="bg-card border border-border rounded-2xl p-6 shadow-sm space-y-8">
                                    <div className="flex items-center gap-6">
                                        <div className="w-12 h-12 bg-orange-500/10 rounded-2xl flex items-center justify-center text-orange-500 border border-orange-500/20">
                                            <Lock className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <h3 className="text-lg font-bold">Change Password</h3>
                                            <p className="text-sm text-muted-foreground">Ensure your account is using a long, random password to stay secure.</p>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <Label htmlFor="newPass">New Password</Label>
                                            <Input
                                                id="newPass"
                                                type="password"
                                                placeholder="••••••••"
                                                value={newPass}
                                                onChange={(e) => setNewPass(e.target.value)}
                                                className="bg-muted/10"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="confirmPass">Confirm New Password</Label>
                                            <Input
                                                id="confirmPass"
                                                type="password"
                                                placeholder="••••••••"
                                                value={confirmPass}
                                                onChange={(e) => setConfirmPass(e.target.value)}
                                                className={cn("bg-muted/10", confirmPass && newPass !== confirmPass && "border-destructive focus-visible:ring-destructive")}
                                            />
                                            {confirmPass && newPass !== confirmPass && (
                                                <p className="text-xs text-destructive">Passwords don't match</p>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex justify-end pt-2">
                                        <Button
                                            onClick={handleChangePassword}
                                            disabled={isChangingPassword || !newPass || newPass !== confirmPass}
                                            variant="outline"
                                            className="text-primary hover:bg-primary/10 border-primary/20 bg-primary/5 gap-2"
                                        >
                                            <Lock className="w-4 h-4" />
                                            {isChangingPassword ? 'Updating...' : 'Update Password'}
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="lg:col-span-12">
                            <div className="bg-red-500/5 border border-red-500/20 rounded-2xl p-6 space-y-6">
                                <div className="flex items-center gap-6">
                                    <div className="w-12 h-12 bg-red-500/10 rounded-2xl flex items-center justify-center text-red-500 border border-red-500/20">
                                        <Shield className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-bold text-red-500">Danger Zone</h3>
                                        <p className="text-sm text-muted-foreground">Permanently delete your account and all associated data. This action cannot be undone.</p>
                                    </div>
                                </div>

                                <div className="flex justify-end pr-2 pb-2">
                                    <Button variant="destructive" className="bg-red-600 hover:bg-red-700 shadow-lg shadow-red-500/20 px-8">
                                        Delete Account
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </div>
                </TabsContent>
                <TabsContent value="members" className="space-y-6 animate-in slide-in-from-left-2 duration-300">
                    <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
                        <div className="p-6 border-b border-border bg-muted/5 flex items-center justify-between">
                            <div>
                                <h3 className="font-bold flex items-center gap-2">
                                    <Users className="w-4 h-4 text-primary" /> Workspace Members
                                </h3>
                                <p className="text-sm text-muted-foreground mt-1">
                                    Managing <span className="font-semibold text-foreground">{activeWorkspace?.name || 'current workspace'}</span> — {members.filter(m => m.workspaceId === activeWorkspaceId).length} member(s)
                                </p>
                            </div>
                            {isOwner && (
                                <Button size="sm" className="gap-2" onClick={() => setIsInviteOpen(true)}>
                                    <Plus className="w-4 h-4" /> Invite Member
                                </Button>
                            )}
                        </div>

                        <div className="divide-y divide-border">
                            {members.filter(m => m.workspaceId === activeWorkspaceId).map((member) => {
                                const isWorkspaceOwner = activeWorkspace?.ownerId === member.userId;
                                const isSelf = member.userId === user?.id;
                                return (
                                    <div key={member.id} className="p-6 flex items-center justify-between group hover:bg-muted/5 transition-colors">
                                        <div className="flex items-center gap-4">
                                            <Avatar className="w-10 h-10 border border-border">
                                                <AvatarImage src={member.avatar} />
                                                <AvatarFallback>{member.name.charAt(0)}</AvatarFallback>
                                            </Avatar>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <h4 className="text-sm font-bold">{member.name}{isSelf && <span className="text-muted-foreground font-normal"> (you)</span>}</h4>
                                                    {isWorkspaceOwner && (
                                                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-500/10 text-amber-500 font-bold uppercase tracking-wider flex items-center gap-1">
                                                            <Crown className="w-2.5 h-2.5" /> Owner
                                                        </span>
                                                    )}
                                                    {member.role === 'admin' && !isWorkspaceOwner && (
                                                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary font-bold uppercase tracking-wider">Admin</span>
                                                    )}
                                                </div>
                                                <p className="text-xs text-muted-foreground">{member.email}</p>
                                            </div>
                                        </div>
                                        {isOwner && !isSelf && (
                                            <div className="flex items-center gap-3">
                                                <select
                                                    defaultValue={member.role}
                                                    className="bg-transparent text-xs border border-border rounded-md px-2 py-1 focus:ring-1 focus:ring-primary cursor-pointer text-muted-foreground hover:text-foreground transition-colors"
                                                >
                                                    <option value="member">Member</option>
                                                    <option value="admin">Admin</option>
                                                    <option value="viewer">Viewer</option>
                                                </select>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                                    onClick={async () => {
                                                        await supabase.from('members').delete().eq('id', member.id);
                                                        toast({ title: `${member.name} removed from workspace` });
                                                    }}
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                            {members.filter(m => m.workspaceId === activeWorkspaceId).length === 0 && (
                                <div className="p-8 text-center text-sm text-muted-foreground">No members found in this workspace.</div>
                            )}
                        </div>
                    </div>

                    <div className="bg-primary/5 border border-primary/20 rounded-2xl p-6">
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
                                <ShieldCheck className="w-5 h-5" />
                            </div>
                            <div>
                                <h4 className="font-bold text-sm">Role-based Permissions</h4>
                                <p className="text-xs text-muted-foreground">Admins can manage members and settings. Members can create and edit boards. Viewers have read-only access.</p>
                            </div>
                        </div>
                    </div>

                    {/* Invite Dialog */}
                    <Dialog open={isInviteOpen} onOpenChange={(open) => {
                        setIsInviteOpen(open);
                        if (!open) { setInviteEmail(''); setInviteLink(''); setLinkCopied(false); }
                    }}>
                        <DialogContent className="max-w-md">
                            <DialogHeader>
                                <DialogTitle>Invite to {activeWorkspace?.name}</DialogTitle>
                            </DialogHeader>
                            <div className="py-4 space-y-4">
                                {!inviteLink ? (
                                    <>
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium">Email Address</label>
                                            <Input
                                                placeholder="colleague@example.com"
                                                value={inviteEmail}
                                                onChange={(e) => setInviteEmail(e.target.value)}
                                                className="bg-muted/10"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium">Role</label>
                                            <select
                                                value={inviteRole}
                                                onChange={(e) => setInviteRole(e.target.value)}
                                                className="w-full h-10 px-3 rounded-md border border-border bg-muted/10 text-sm"
                                            >
                                                <option value="member">Member</option>
                                                <option value="admin">Admin</option>
                                                <option value="viewer">Viewer</option>
                                            </select>
                                        </div>
                                    </>
                                ) : (
                                    <div className="space-y-4">
                                        {/* Success banner */}
                                        <div className="flex items-center gap-3 p-3 rounded-xl bg-green-500/10 border border-green-500/20">
                                            <div className="w-7 h-7 rounded-full bg-green-500/20 flex items-center justify-center shrink-0">
                                                <Check className="w-3.5 h-3.5 text-green-600" />
                                            </div>
                                            <div>
                                                <p className="text-sm font-semibold text-green-700 dark:text-green-400">Invitation created!</p>
                                                <p className="text-xs text-green-600/80 dark:text-green-500/80">{inviteEmail}</p>
                                            </div>
                                        </div>

                                        {/* Link section */}
                                        <div className="space-y-2">
                                            <p className="text-sm font-medium flex items-center gap-1.5">
                                                <LinkIcon className="w-3.5 h-3.5 text-primary" />
                                                Share this invite link
                                            </p>
                                            <p className="text-xs text-muted-foreground leading-relaxed">
                                                Copy and send this link to your teammate. They'll join the workspace as soon as they sign in.
                                            </p>
                                            {/* Link input — full width, selectable */}
                                            <div className="relative">
                                                <input
                                                    readOnly
                                                    value={inviteLink}
                                                    onClick={(e) => (e.target as HTMLInputElement).select()}
                                                    className="w-full text-xs bg-muted/20 border border-border rounded-lg px-3 py-2.5 pr-10 text-muted-foreground font-mono focus:outline-none focus:ring-2 focus:ring-primary/30 cursor-text"
                                                />
                                            </div>
                                            {/* Copy button — full width, prominent */}
                                            <Button
                                                className="w-full gap-2"
                                                variant={linkCopied ? 'outline' : 'default'}
                                                onClick={() => {
                                                    navigator.clipboard.writeText(inviteLink);
                                                    setLinkCopied(true);
                                                    setTimeout(() => setLinkCopied(false), 2500);
                                                }}
                                            >
                                                {linkCopied
                                                    ? <><Check className="w-4 h-4 text-green-500" /> Copied to clipboard!</>
                                                    : <><Copy className="w-4 h-4" /> Copy invite link</>
                                                }
                                            </Button>
                                        </div>
                                    </div>
                                )}
                            </div>
                            <DialogFooter>
                                {!inviteLink ? (
                                    <>
                                        <Button variant="outline" onClick={() => { setIsInviteOpen(false); setInviteEmail(''); }}>Cancel</Button>
                                        <Button
                                            disabled={!inviteEmail || isInviting}
                                            onClick={async () => {
                                                setIsInviting(true);
                                                try {
                                                    const id = await inviteUser(inviteEmail, inviteRole);
                                                    const link = `${window.location.origin}/invite?id=${id}`;
                                                    setInviteLink(link);
                                                } catch {
                                                    toast({ title: "Failed to create invite", variant: "destructive" });
                                                } finally {
                                                    setIsInviting(false);
                                                }
                                            }}
                                        >
                                            {isInviting ? 'Creating...' : 'Create Invitation'}
                                        </Button>
                                    </>
                                ) : (
                                    <Button onClick={() => { setIsInviteOpen(false); setInviteEmail(''); setInviteLink(''); }}>Done</Button>
                                )}
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </TabsContent>

                <TabsContent value="workspace" className="space-y-6 animate-in slide-in-from-left-2 duration-300">
                    <div className="bg-card border border-border rounded-2xl p-6 shadow-sm space-y-6">
                        <div className="flex items-center gap-6">
                            <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center text-primary border border-primary/20">
                                <Building2 className="w-6 h-6" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold">Workspace Settings</h3>
                                <p className="text-sm text-muted-foreground">Manage your workspace identity and core configuration.</p>
                            </div>
                        </div>

                        <div className="space-y-4 pt-2">
                            <div className="space-y-2">
                                <Label htmlFor="wsName">Workspace Name</Label>
                                <div className="flex gap-3">
                                    <Input
                                        id="wsName"
                                        value={wsName}
                                        onChange={(e) => setWsName(e.target.value)}
                                        className="bg-muted/10 max-w-md"
                                    />
                                    <Button
                                        onClick={async () => {
                                            if (!activeWorkspaceId || !wsName.trim()) return;
                                            setIsLoading(true);
                                            await updateWorkspace(activeWorkspaceId, { name: wsName });
                                            setIsLoading(false);
                                            toast({ title: "Workspace updated" });
                                        }}
                                        disabled={isLoading || wsName === activeWorkspace?.name}
                                    >
                                        Rename
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-red-500/5 border border-red-500/20 rounded-2xl p-6 space-y-6">
                        <div className="flex items-center gap-6">
                            <div className="w-12 h-12 bg-red-500/10 rounded-2xl flex items-center justify-center text-red-500 border border-red-500/20">
                                <AlertTriangle className="w-6 h-6" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-red-500">Delete Workspace</h3>
                                <p className="text-sm text-muted-foreground leading-relaxed">
                                    Deleting this workspace will permanently remove all associated boards, lists, and cards.
                                    <span className="block font-bold mt-1 text-red-600/80 uppercase text-[10px] tracking-widest">This action cannot be undone.</span>
                                </p>
                            </div>
                        </div>

                        <div className="flex justify-end p-2">
                            <Button
                                variant="destructive"
                                className="bg-red-600 hover:bg-red-700 shadow-md ring-red-500/20"
                                onClick={() => setIsDeleteDialogOpen(true)}
                            >
                                <Trash2 className="w-4 h-4 mr-2" /> Delete Workspace
                            </Button>
                        </div>
                    </div>
                </TabsContent>
            </Tabs>

            <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <AlertDialogContent className="max-w-md">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="text-red-500">Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription className="space-y-4 py-2 text-foreground/80 leading-relaxed">
                            This will permanently delete the <span className="font-bold text-foreground">"{activeWorkspace?.name}"</span> workspace and all its data.
                            To confirm, please type the name of the workspace below.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <div className="py-2">
                        <Input
                            placeholder="Type workspace name here..."
                            value={confirmName}
                            onChange={(e) => setConfirmName(e.target.value)}
                            className="bg-muted/30 border-red-500/30 focus-visible:ring-red-500/50"
                        />
                    </div>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => { setConfirmName(''); setIsDeleteDialogOpen(false); }}>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            disabled={confirmName !== activeWorkspace?.name || isLoading}
                            onClick={async () => {
                                if (!activeWorkspaceId) return;
                                setIsLoading(true);
                                await deleteWorkspace(activeWorkspaceId);
                                setIsLoading(false);
                                setIsDeleteDialogOpen(false);
                                setConfirmName('');
                                toast({
                                    title: "Workspace deleted",
                                    description: "The workspace and all its data have been removed.",
                                    variant: "destructive"
                                });
                            }}
                            className="bg-red-600 hover:bg-red-700 text-white"
                        >
                            Delete Workspace
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
