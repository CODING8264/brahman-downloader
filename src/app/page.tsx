'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Download,
  Link,
  Settings,
  History,
  Trash2,
  Play,
  CheckCircle,
  XCircle,
  Loader2,
  Music,
  Video,
  FileAudio,
  RefreshCw,
  X,
  Clock,
  Sun,
  Moon,
  Sparkles
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger
} from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast, Toaster } from 'sonner';

/* ================= TYPES ================= */

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
  format: string;
  status: 'pending' | 'downloading' | 'completed' | 'failed';
  progress: number;
  thumbnail: string | null;
  createdAt: string;
}

/* ================= HELPERS ================= */

const platformColor: Record<string, string> = {
  youtube: 'bg-red-500',
  instagram: 'bg-pink-500',
  tiktok: 'bg-black',
  spotify: 'bg-green-500',
  twitter: 'bg-blue-400',
  default: 'bg-gray-500'
};

const formatDuration = (s: number) =>
  `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

/* ================= PAGE ================= */

export default function Home() {
  const [url, setUrl] = useState('');
  const [videoInfo, setVideoInfo] = useState<VideoInfo | null>(null);
  const [downloads, setDownloads] = useState<DownloadItem[]>([]);
  const [format, setFormat] = useState('mp4');
  const [quality, setQuality] = useState('best');
  const [customName, setCustomName] = useState('');
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState('download');
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const pollRef = useRef<NodeJS.Timeout | null>(null);

  /* ========== FETCH HISTORY ========== */
  const fetchHistory = async () => {
    const res = await fetch('/api/history');
    const data = await res.json();
    if (data.success) setDownloads(data.data);
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  useEffect(() => {
    const active = downloads.some(
      d => d.status === 'pending' || d.status === 'downloading'
    );

    if (active) {
      pollRef.current = setInterval(fetchHistory, 2000);
    } else if (pollRef.current) {
      clearInterval(pollRef.current);
    }

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [downloads]);

  /* ========== FETCH INFO ========== */
  const fetchInfo = async () => {
    if (!url) return toast.error('Enter a URL');

    setLoading(true);
    setVideoInfo(null);

    try {
      const res = await fetch('/api/info', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url })
      });

      const data = await res.json();
      if (!data.success) throw new Error(data.error);

      setVideoInfo(data.data);
      toast.success('Media detected');
    } catch (e: any) {
      toast.error(e.message || 'Failed');
    } finally {
      setLoading(false);
    }
  };

  /* ========== DOWNLOAD ========== */
  const startDownload = async () => {
    const res = await fetch('/api/download', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, format, quality, customName })
    });

    const data = await res.json();
    if (data.success) {
      toast.success('Download started');
      setUrl('');
      setVideoInfo(null);
      setCustomName('');
      fetchHistory();
    } else toast.error(data.error);
  };

  /* ========== DELETE ========== */
  const removeItem = async (id: string) => {
    await fetch(`/api/history?id=${id}`, { method: 'DELETE' });
    fetchHistory();
  };

  /* ========== STATUS ICON ========== */
  const statusIcon = (s: string) => {
    if (s === 'pending') return <Clock className="w-4 h-4 text-yellow-500" />;
    if (s === 'downloading')
      return <Loader2 className="w-4 h-4 animate-spin text-blue-500" />;
    if (s === 'completed')
      return <CheckCircle className="w-4 h-4 text-green-500" />;
    return <XCircle className="w-4 h-4 text-red-500" />;
  };

  return (
    <div className="min-h-screen">
      <Toaster richColors />

      {/* ================= HEADER ================= */}
      <header className="border-b sticky top-0 bg-background z-50">
        <div className="container mx-auto p-4 flex justify-between items-center">
          <h1 className="font-bold text-xl">Brahman Media Downloader</h1>
          <Button
            size="icon"
            variant="ghost"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          >
            {theme === 'dark' ? <Sun /> : <Moon />}
          </Button>
        </div>
      </header>

      {/* ================= MAIN ================= */}
      <main className="container mx-auto p-4">
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="grid grid-cols-3 mb-6">
            <TabsTrigger value="download">
              <Download className="w-4 h-4 mr-2" /> Download
            </TabsTrigger>
            <TabsTrigger value="history">
              <History className="w-4 h-4 mr-2" /> History
            </TabsTrigger>
            <TabsTrigger value="settings">
              <Settings className="w-4 h-4 mr-2" /> Settings
            </TabsTrigger>
          </TabsList>

          {/* ================= DOWNLOAD TAB ================= */}
          <TabsContent value="download" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Paste URL</CardTitle>
                <CardDescription>Any supported platform</CardDescription>
              </CardHeader>
              <CardContent className="flex gap-2">
                <Input value={url} onChange={e => setUrl(e.target.value)} />
                <Button onClick={fetchInfo} disabled={loading}>
                  {loading ? <Loader2 className="animate-spin" /> : <Play />}
                </Button>
              </CardContent>
            </Card>

            <AnimatePresence>
              {videoInfo && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  <Card>
                    <CardContent className="p-4 space-y-4">
                      <img
                        src={videoInfo.thumbnail}
                        className="rounded"
                        alt=""
                      />
                      <h3 className="font-semibold">{videoInfo.title}</h3>

                      <Select value={format} onValueChange={setFormat}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="mp4">MP4</SelectItem>
                          <SelectItem value="mp3">MP3</SelectItem>
                          <SelectItem value="m4a">M4A</SelectItem>
                        </SelectContent>
                      </Select>

                      <Button onClick={startDownload} className="w-full">
                        <Download className="mr-2" /> Download
                      </Button>
                    </CardContent>
                  </Card>
                </motion.div>
              )}
            </AnimatePresence>
          </TabsContent>

          {/* ================= HISTORY TAB ================= */}
          <TabsContent value="history">
            <Card>
              <CardHeader className="flex flex-row justify-between">
                <CardTitle>History</CardTitle>
                <Button size="sm" onClick={fetchHistory}>
                  <RefreshCw className="w-4 h-4 mr-1" /> Refresh
                </Button>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[500px]">
                  {downloads.map(d => (
                    <div
                      key={d.id}
                      className="flex gap-3 items-center p-3 rounded bg-muted mb-2"
                    >
                      {d.thumbnail ? (
                        <img src={d.thumbnail} className="w-20 rounded" />
                      ) : d.format === 'mp3' ? (
                        <Music />
                      ) : (
                        <Video />
                      )}

                      <div className="flex-1">
                        <p className="font-medium truncate">
                          {d.title || d.url}
                        </p>
                        <div className="flex items-center gap-2 text-sm">
                          {statusIcon(d.status)}
                          {d.status}
                        </div>
                        {d.status !== 'completed' && (
                          <Progress value={d.progress} />
                        )}
                      </div>

                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => removeItem(d.id)}
                      >
                        <Trash2 className="text-red-500" />
                      </Button>
                    </div>
                  ))}
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ================= SETTINGS TAB ================= */}
          <TabsContent value="settings">
            <Card>
              <CardContent className="p-6 text-sm text-muted-foreground">
                Settings are controlled from server.
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}