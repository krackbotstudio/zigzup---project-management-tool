import { useState } from 'react';
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
    Camera
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
import { Users, Trash2, ShieldCheck, Plus, Building2, AlertTriangle } from 'lucide-react';
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

export default function Settings() {
    const { toast } = useToast();
    const { theme, setTheme, toggleTheme } = useTheme();
    const { language, setLanguage, timezone, setTimezone, boardViewMode, setBoardViewMode, t } = useSettings();
    const { members, activeWorkspaceId, workspaces, updateWorkspace, deleteWorkspace } = useProject();
    const [isLoading, setIsLoading] = useState(false);
    const activeWorkspace = workspaces.find(w => w.id === activeWorkspaceId);

    // Workspace management state
    const [wsName, setWsName] = useState(activeWorkspace?.name || '');
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [confirmName, setConfirmName] = useState('');

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
                            <div className="flex flex-col items-center gap-4">
                                <div className="relative group">
                                    <Avatar className="w-32 h-32 border-4 border-background ring-1 ring-border shadow-xl">
                                        <AvatarImage src="https://api.dicebear.com/7.x/avataaars/svg?seed=Alex" />
                                        <AvatarFallback className="text-3xl font-bold">AC</AvatarFallback>
                                    </Avatar>
                                    <button className="absolute bottom-1 right-1 p-2 bg-primary text-primary-foreground rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-all scale-90 group-hover:scale-100">
                                        <Camera className="w-4 h-4" />
                                    </button>
                                </div>
                                <div className="text-center">
                                    <h3 className="font-bold text-lg">Alex Chen</h3>
                                    <p className="text-sm text-muted-foreground">Workspace Admin</p>
                                </div>
                            </div>

                            <div className="flex-1 w-full space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <Label htmlFor="firstName">Full Name</Label>
                                        <Input id="firstName" defaultValue="Alex Chen" className="bg-muted/10" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="email">Email Address</Label>
                                        <Input id="email" defaultValue="alex@zigzup.com" className="bg-muted/10" />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="bio">Bio</Label>
                                    <Textarea
                                        id="bio"
                                        placeholder="Tell us about yourself..."
                                        defaultValue="Product Designer and Full-stack Developer at ZigZup. Passionate about AI and user experiences."
                                        className="min-h-[120px] bg-muted/10 leading-relaxed"
                                    />
                                    <p className="text-[11px] text-muted-foreground">Maximum 250 characters. Markdown supported.</p>
                                </div>

                                <div className="pt-4 flex justify-end">
                                    <Button
                                        onClick={() => handleSave('profile')}
                                        disabled={isLoading}
                                        className="gap-2 h-10 px-8"
                                    >
                                        {isLoading ? "Saving..." : <><Save className="w-4 h-4" /> Save Profile</>}
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
                                    <p className="text-sm text-muted-foreground">Initialize your Firestore collections with base mock data.</p>
                                </div>
                            </div>
                            <Button
                                variant="outline"
                                className="gap-2 border-indigo-500/30 text-indigo-600 hover:bg-indigo-50"
                                onClick={async () => {
                                    setIsLoading(true);
                                    try {
                                        // Check if env vars are present
                                        const apiKey = import.meta.env.VITE_FIREBASE_API_KEY;
                                        if (!apiKey || apiKey.includes('your_actual_api_key')) {
                                            throw new Error("Firebase configuration not detected. Please ensure your .env file is correctly filled and restart the dev server.");
                                        }

                                        const { db } = await import('@/lib/firebase');
                                        const { collection, addDoc, getDocs, query, limit } = await import('firebase/firestore');
                                        const { mockBoards, mockLists, mockCards, mockNotifications } = await import('@/data/mock');

                                        const collections = [
                                            { name: 'boards', data: mockBoards },
                                            { name: 'lists', data: mockLists },
                                            { name: 'cards', data: mockCards },
                                            { name: 'notifications', data: mockNotifications }
                                        ];

                                        let totalSeeded = 0;
                                        for (const col of collections) {
                                            const snapshot = await getDocs(query(collection(db, col.name), limit(1)));
                                            if (snapshot.empty) {
                                                console.log(`Seeding ${col.name}...`);
                                                for (const item of col.data) {
                                                    const { id, ...data } = item as any;
                                                    await addDoc(collection(db, col.name), data);
                                                    totalSeeded++;
                                                }
                                            }
                                        }

                                        toast({
                                            title: totalSeeded > 0 ? "Database Seeded" : "Database Ready",
                                            description: totalSeeded > 0
                                                ? `Successfully initialized collections with ${totalSeeded} items.`
                                                : "Collections already contain data.",
                                        });
                                    } catch (error: any) {
                                        console.error("Seeding failed:", error);
                                        toast({
                                            title: "Seeding Failed",
                                            description: error.message || "Unknown error occurred. Check browser console.",
                                            variant: "destructive"
                                        });
                                    } finally {
                                        setIsLoading(false);
                                    }
                                }}
                            >
                                Seed Database
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

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <div className="space-y-2">
                                        <Label htmlFor="currentPass">Current Password</Label>
                                        <Input id="currentPass" type="password" placeholder="••••••••" className="bg-muted/10" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="newPass">New Password</Label>
                                        <Input id="newPass" type="password" placeholder="••••••••" className="bg-muted/10" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="confirmPass">Confirm Password</Label>
                                        <Input id="confirmPass" type="password" placeholder="••••••••" className="bg-muted/10" />
                                    </div>
                                </div>

                                <div className="flex justify-end pt-2">
                                    <Button onClick={() => handleSave('password')} variant="outline" className="text-primary hover:bg-primary/10 border-primary/20 bg-primary/5">
                                        Update Password
                                    </Button>
                                </div>
                            </div>
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
                                <p className="text-sm text-muted-foreground mt-1">Manage who has access to the {activeWorkspace?.name || 'current'} workspace.</p>
                            </div>
                            <Button size="sm" className="gap-2">
                                <Plus className="w-4 h-4" /> Invite Member
                            </Button>
                        </div>

                        <div className="divide-y divide-border">
                            {members.map((member) => (
                                <div key={member.id} className="p-6 flex items-center justify-between group hover:bg-muted/5 transition-colors">
                                    <div className="flex items-center gap-4">
                                        <Avatar className="w-10 h-10 border border-border">
                                            <AvatarImage src={member.avatar} />
                                            <AvatarFallback>{member.name.charAt(0)}</AvatarFallback>
                                        </Avatar>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <h4 className="text-sm font-bold">{member.name}</h4>
                                                {member.role === 'admin' && (
                                                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary font-bold uppercase tracking-wider">Admin</span>
                                                )}
                                            </div>
                                            <p className="text-xs text-muted-foreground">{member.email}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <select className="bg-transparent text-xs border-none focus:ring-0 cursor-pointer text-muted-foreground hover:text-foreground transition-colors">
                                            <option value="member">Member</option>
                                            <option value="admin">Admin</option>
                                            <option value="viewer">Viewer</option>
                                        </select>
                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive">
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </div>
                            ))}
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
