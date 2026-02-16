'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Download, Link, Settings, History, Trash2, 
  Play, CheckCircle, XCircle, Loader2,
  Music, Video, FileAudio,
  RefreshCw, X, Clock, HardDrive,
  Sun, Moon, Sparkles
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { toast, Toaster } from 'sonner';

interface VideoInfo {
  title: string;
  thumbnail: string;
  duration: number;
  uploader: string;
  platform: string;
}

interface DownloadItem {
  id: string;
  url: string;
  platform: string;
  title: string | null;
  customName: string | null;
  format: string;
  quality: string | null;
  status: string;
  progress: number;
  fileSize: string | null;
  thumbnail: string | null;
  error: string | null;
  createdAt: string;
}

interface SettingsType {
  id: string;
  defaultQuality: string;
  defaultFormat: string;
  autoRename: boolean;
}

const platformConfig: Record<string, { color: string }> = {
  youtube: { color: 'bg-red-500' },
  instagram: { color: 'bg-pink-500' },
  tiktok: { color: 'bg-black' },
  twitter: { color: 'bg-blue-400' },
  facebook: { color: 'bg-blue-600' },
  spotify: { color: 'bg-green-500' },
  soundcloud: { color: 'bg-orange-500' },
  vimeo: { color: 'bg-cyan-500' },
  default: { color: 'bg-gray-500' }
};

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', { 
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' 
  });
}

export default function Home() {
  const [url, setUrl] = useState('');
  const [videoInfo, setVideoInfo] = useState<VideoInfo | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [format, setFormat] = useState('mp4');
  const [quality, setQuality] = useState('best');
  const [customName, setCustomName] = useState('');
  const [downloads, setDownloads] = useState<DownloadItem[]>([]);
  const [settings, setSettings] = useState<SettingsType | null>(null);
  const [activeTab, setActiveTab] = useState('download');
  const [timeLeft, setTimeLeft] = useState(5);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const pollingRef = useRef<NodeJS.Timeout | null>(null);
  const renameTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    fetchSettings();
    fetchHistory();
  }, []);

  useEffect(() => {
    const activeDownloads = downloads.filter(d => d.status === 'downloading' || d.status === 'pending');
    if (activeDownloads.length > 0) {
      pollingRef.current = setInterval(fetchHistory, 2000);
    } else if (pollingRef.current) {
      clearInterval(pollingRef.current);
    }
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [downloads]);

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/settings');
      const data = await res.json();
      if (data.success) {
        setSettings(data.data);
        setFormat(data.data.defaultFormat);
        setQuality(data.data.defaultQuality);
      }
    } catch (error) {
      console.error('Failed to fetch settings:', error);
    }
  };

  const fetchHistory = async () => {
    try {
      const res = await fetch('/api/history');
      const data = await res.json();
      if (data.success) setDownloads(data.data);
    } catch (error) {
      console.error('Failed to fetch history:', error);
    }
  };

  const handleFetchInfo = async (urlToFetch?: string) => {
    const targetUrl = urlToFetch || url;
    if (!targetUrl) {
      toast.error('Please enter a URL');
      return;
    }

    setIsLoading(true);
    setVideoInfo(null);

    try {
      const res = await fetch('/api/info', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: targetUrl })
      });

      const data = await res.json();

      if (data.success) {
        setVideoInfo(data.data);
        setCustomName('');
        startRenameTimer(data.data.title);
        toast.success('Video info loaded!');
      } else {
        toast.error(data.error || 'Failed to fetch video info');
      }
    } catch {
      toast.error('Failed to fetch video info');
    } finally {
      setIsLoading(false);
    }
  };

  const startRenameTimer = (title: string) => {
    setTimeLeft(5);
    if (renameTimerRef.current) clearInterval(renameTimerRef.current);
    
    renameTimerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(renameTimerRef.current!);
          setCustomName(sanitizeFilename(title));
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const sanitizeFilename = (name: string): string => {
    return name.replace(/[<>:"/\\|?*]/g, '').replace(/\s+/g, ' ').trim().slice(0, 100);
  };

  const handleDownload = async () => {
    if (!url) {
      toast.error('Please enter a URL');
      return;
    }

    try {
      const res = await fetch('/api/download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, format, quality, customName: customName || undefined })
      });

      const data = await res.json();

      if (data.success) {
        toast.success('Download started!');
        fetchHistory();
        setUrl('');
        setVideoInfo(null);
        setCustomName('');
        if (renameTimerRef.current) clearInterval(renameTimerRef.current);
      } else {
        toast.error(data.error || 'Failed to start download');
      }
    } catch {
      toast.error('Failed to start download');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await fetch(`/api/history?id=${id}`, { method: 'DELETE' });
      fetchHistory();
      toast.success('Download removed');
    } catch {
      toast.error('Failed to delete');
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Clock className="w-4 h-4 text-yellow-500" />;
      case 'downloading': return <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />;
      case 'completed': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'failed': return <XCircle className="w-4 h-4 text-red-500" />;
      default: return null;
    }
  };

  const getPlatformColor = (platform: string) => {
    return platformConfig[platform]?.color || platformConfig.default.color;
  };

  const renderThumbnail = (download: DownloadItem) => {
    if (download.thumbnail) {
      return (
        <img 
          src={download.thumbnail} 
          alt="" 
          className="w-20 h-14 object-cover rounded" 
        />
      );
    }
    return (
      <div className="w-20 h-14 bg-muted rounded flex items-center justify-center">
        {download.format === 'mp3' ? (
          <Music className="w-6 h-6 text-muted-foreground" />
        ) : (
          <Video className="w-6 h-6 text-muted-foreground" />
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 flex flex-col">
      <Toaster position="top-center" richColors />
      
      <header className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-br from-orange-500 to-red-600 text-white shadow-lg">
              <Download className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">
                ब्राह्मण Media Downloader
              </h1>
              <p className="text-xs text-muted-foreground">Download from any platform</p>
            </div>
          </div>
          
          <Button variant="ghost" size="icon" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
            {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </Button>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-4 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full max-w-md mx-auto grid-cols-3">
            <TabsTrigger value="download" className="flex items-center gap-2">
              <Download className="w-4 h-4" /> Download
            </TabsTrigger>
            <TabsTrigger value="history" className="flex items-center gap-2">
              <History className="w-4 h-4" /> History
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center gap-2">
              <Settings className="w-4 h-4" /> Settings
            </TabsTrigger>
          </TabsList>

          <TabsContent value="download" className="space-y-6">
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Link className="w-5 h-5" /> Paste URL
                </CardTitle>
                <CardDescription>
                  Paste any video or audio URL from YouTube, Instagram, TikTok, Spotify, and more
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Input
                      placeholder="https://youtube.com/watch?v=... or any media URL"
                      value={url}
                      onChange={(e) => setUrl(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleFetchInfo()}
                    />
                    {url && (
                      <Button variant="ghost" size="sm" className="absolute right-1 top-1/2 -translate-y-1/2 h-7" onClick={() => { setUrl(''); setVideoInfo(null); }}>
                        <X className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                  <Button onClick={() => handleFetchInfo()} disabled={isLoading}>
                    {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Play className="w-4 h-4 mr-2" /> Fetch</>}
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {['YouTube', 'Instagram', 'TikTok', 'Spotify', 'Twitter', 'Vimeo'].map(p => (
                    <Badge key={p} variant="secondary" className="text-xs">{p}</Badge>
                  ))}
                </div>
              </CardContent>
            </Card>

            <AnimatePresence>
              {videoInfo && (
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
                  <Card className="shadow-lg overflow-hidden">
                    <div className="flex flex-col md:flex-row">
                      <div className="relative md:w-64 aspect-video md:aspect-auto">
                        {videoInfo.thumbnail && (
                          <img src={videoInfo.thumbnail} alt={videoInfo.title} className="w-full h-full object-cover" />
                        )}
                        <Badge className="absolute bottom-2 right-2 bg-black/70">{formatDuration(videoInfo.duration)}</Badge>
                        <Badge className={`absolute top-2 left-2 ${getPlatformColor(videoInfo.platform)} text-white`}>
                          {videoInfo.platform}
                        </Badge>
                      </div>

                      <div className="flex-1 p-4 space-y-4">
                        <div>
                          <h3 className="font-semibold text-lg line-clamp-2">{videoInfo.title}</h3>
                          <p className="text-sm text-muted-foreground">{videoInfo.uploader}</p>
                        </div>

                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <Label>Custom Filename</Label>
                            {timeLeft > 0 && (
                              <Badge variant="outline" className="text-xs animate-pulse">Auto-naming in {timeLeft}s</Badge>
                            )}
                          </div>
                          <Input
                            placeholder="Enter custom name or leave empty for auto"
                            value={customName}
                            onChange={(e) => {
                              setCustomName(e.target.value);
                              if (renameTimerRef.current) clearInterval(renameTimerRef.current);
                              setTimeLeft(0);
                            }}
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>Format</Label>
                            <Select value={format} onValueChange={setFormat}>
                              <SelectTrigger><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="mp4"><div className="flex items-center gap-2"><Video className="w-4 h-4" /> MP4 Video</div></SelectItem>
                                <SelectItem value="mp3"><div className="flex items-center gap-2"><FileAudio className="w-4 h-4" /> MP3 Audio</div></SelectItem>
                                <SelectItem value="webm"><div className="flex items-center gap-2"><Video className="w-4 h-4" /> WebM</div></SelectItem>
                                <SelectItem value="m4a"><div className="flex items-center gap-2"><Music className="w-4 h-4" /> M4A Audio</div></SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-2">
                            <Label>Quality</Label>
                            <Select value={quality} onValueChange={setQuality}>
                              <SelectTrigger><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="best">Best Quality</SelectItem>
                                <SelectItem value="1080p">1080p HD</SelectItem>
                                <SelectItem value="720p">720p HD</SelectItem>
                                <SelectItem value="480p">480p SD</SelectItem>
                                <SelectItem value="audio">Audio Only</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        <Button className="w-full" size="lg" onClick={handleDownload}>
                          <Download className="w-5 h-5 mr-2" /> Download Now
                        </Button>
                      </div>
                    </div>
                  </Card>
                </motion.div>
              )}
            </AnimatePresence>

            {downloads.filter(d => d.status === 'downloading' || d.status === 'pending').length > 0 && (
              <Card className="shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Loader2 className="w-5 h-5 animate-spin text-blue-500" /> Active Downloads
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {downloads.filter(d => d.status === 'downloading' || d.status === 'pending').map(download => (
                    <div key={download.id} className="flex items-center gap-4 p-3 bg-muted rounded-lg">
                      {download.thumbnail && <img src={download.thumbnail} alt="" className="w-16 h-12 object-cover rounded" />}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{download.title || download.url}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Progress value={download.progress} className="h-2 flex-1" />
                          <span className="text-sm font-medium">{download.progress}%</span>
                        </div>
                      </div>
                      <Badge variant="secondary">{download.platform}</Badge>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            <Card className="bg-gradient-to-br from-orange-50 to-red-50 dark:from-orange-950/20 dark:to-red-950/20">
              <CardContent className="pt-6">
                <div className="flex items-start gap-3">
                  <Sparkles className="w-5 h-5 text-orange-600 mt-0.5" />
                  <div className="space-y-2">
                    <h4 className="font-semibold">Quick Tips</h4>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      <li>Auto-naming kicks in after 5 seconds if you do not enter a name</li>
                      <li>Download audio in MP3 format for music from any platform</li>
                      <li>Works with Instagram, TikTok, Spotify, and 1000+ sites</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="history">
            <Card className="shadow-lg">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2"><History className="w-5 h-5" /> Download History</CardTitle>
                    <CardDescription>Your recent downloads</CardDescription>
                  </div>
                  <Button variant="outline" size="sm" onClick={fetchHistory}>
                    <RefreshCw className="w-4 h-4 mr-2" /> Refresh
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {downloads.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Download className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No downloads yet</p>
                    <p className="text-sm">Paste a URL to get started</p>
                  </div>
                ) : (
                  <ScrollArea className="h-[500px] pr-4">
                    <div className="space-y-3">
                      {downloads.map((download) => (
                        <motion.div
                          key={download.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          className="flex items-center gap-4 p-3 bg-muted/50 rounded-lg hover:bg-muted transi
