import { useState } from 'react';
import {
    Bell,
    Check,
    Trash2,
    Search,
    Filter,
    MessageSquare,
    UserPlus,
    Calendar,
    Info,
    MoreVertical,
    CheckCircle2
} from 'lucide-react';
import { useProject } from '@/context/ProjectContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Link } from 'react-router-dom';

export default function Notifications() {
    const { notifications, markAsRead, markAllAsRead, deleteNotification } = useProject();
    const [filter, setFilter] = useState<'all' | 'unread'>('all');
    const [searchQuery, setSearchQuery] = useState('');

    const filteredNotifications = notifications
        .filter(n => filter === 'all' || !n.isRead)
        .filter(n =>
            n.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            n.message.toLowerCase().includes(searchQuery.toLowerCase())
        )
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const getIcon = (type: string) => {
        switch (type) {
            case 'mention': return <MessageSquare className="w-4 h-4 text-blue-500" />;
            case 'assignment': return <UserPlus className="w-4 h-4 text-purple-500" />;
            case 'deadline': return <Calendar className="w-4 h-4 text-orange-500" />;
            case 'system': return <Info className="w-4 h-4 text-indigo-500" />;
            default: return <Bell className="w-4 h-4 text-muted-foreground" />;
        }
    };

    return (
        <div className="p-6 max-w-4xl mx-auto animate-fade-in">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-foreground">Notifications</h1>
                    <p className="text-muted-foreground mt-1">Stay updated with mentions, assignments, and system updates.</p>
                </div>
                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={async () => await markAllAsRead()}
                        className="gap-2"
                    >
                        <CheckCircle2 className="w-4 h-4" /> Mark all as read
                    </Button>
                </div>
            </div>

            {/* Controls */}
            <div className="flex flex-col md:flex-row gap-4 mb-6 items-center justify-between">
                <div className="flex items-center p-1 bg-muted/50 border border-border rounded-lg w-full md:w-auto">
                    <button
                        onClick={() => setFilter('all')}
                        className={cn(
                            "px-4 py-1.5 text-sm font-medium rounded-md transition-all",
                            filter === 'all' ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
                        )}
                    >
                        All
                    </button>
                    <button
                        onClick={() => setFilter('unread')}
                        className={cn(
                            "px-4 py-1.5 text-sm font-medium rounded-md transition-all flex items-center gap-2",
                            filter === 'unread' ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
                        )}
                    >
                        Unread
                        {notifications.filter(n => !n.isRead).length > 0 && (
                            <span className="w-2 h-2 rounded-full bg-primary" />
                        )}
                    </button>
                </div>

                <div className="relative w-full md:w-80">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                        placeholder="Search notifications..."
                        className="pl-10 h-10 bg-muted/30 border-border"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
            </div>

            <div className="space-y-3">
                {filteredNotifications.length === 0 ? (
                    <div className="text-center py-20 bg-muted/10 border border-dashed border-border rounded-2xl">
                        <div className="w-16 h-16 bg-muted/30 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Bell className="w-8 h-8 text-muted-foreground" />
                        </div>
                        <h3 className="text-lg font-medium text-foreground">No notifications found</h3>
                        <p className="text-muted-foreground mt-1">
                            {searchQuery ? "Try a different search term" : "You're all caught up!"}
                        </p>
                    </div>
                ) : (
                    filteredNotifications.map((notification) => (
                        <div
                            key={notification.id}
                            className={cn(
                                "group relative flex gap-4 p-4 rounded-2xl border transition-all duration-200",
                                notification.isRead
                                    ? "bg-background border-border"
                                    : "bg-primary/5 border-primary/20 shadow-sm border-l-4 border-l-primary"
                            )}
                        >
                            <div className={cn(
                                "w-10 h-10 rounded-full flex items-center justify-center shrink-0 border",
                                notification.isRead ? "bg-muted/30 border-border" : "bg-background border-primary/10"
                            )}>
                                {getIcon(notification.type)}
                            </div>

                            <div className="flex-1 min-w-0 pr-8">
                                <div className="flex items-center justify-between mb-1">
                                    <h4 className={cn(
                                        "text-sm font-bold truncate",
                                        notification.isRead ? "text-foreground" : "text-primary"
                                    )}>
                                        {notification.title}
                                    </h4>
                                    <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                                        {new Date(notification.createdAt).toLocaleDateString()}
                                    </span>
                                </div>
                                <p className="text-sm text-foreground/80 leading-relaxed mb-2">
                                    {notification.message}
                                </p>

                                {notification.link && (
                                    <Link
                                        to={notification.link}
                                        className="text-xs font-bold text-primary hover:underline flex items-center gap-1"
                                    >
                                        View Details
                                    </Link>
                                )}
                            </div>

                            <div className="absolute right-4 top-4 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                {!notification.isRead && (
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={async () => await markAsRead(notification.id)}
                                        className="h-8 w-8 text-muted-foreground hover:text-primary hover:bg-primary/10"
                                        title="Mark as read"
                                    >
                                        <Check className="w-4 h-4" />
                                    </Button>
                                )}
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={async () => await deleteNotification(notification.id)}
                                    className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                    title="Delete"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </Button>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
