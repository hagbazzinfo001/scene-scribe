import { useState } from 'react';
import { Play, Pause, Download, Volume2, VolumeX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

interface MediaPreviewProps {
  url: string;
  type: 'audio' | 'video' | 'image';
  filename?: string;
  className?: string;
}

export function MediaPreview({ url, type, filename, className = '' }: MediaPreviewProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);

  const handlePlayPause = (element: HTMLAudioElement | HTMLVideoElement) => {
    if (isPlaying) {
      element.pause();
    } else {
      element.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = url;
    link.download = filename || 'download';
    link.click();
  };

  const handleMuteToggle = (element: HTMLAudioElement | HTMLVideoElement) => {
    element.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  if (type === 'image') {
    return (
      <Card className={className}>
        <CardContent className="p-4">
          <div className="relative">
            <img
              src={url}
              alt={filename || 'Uploaded image'}
              className="w-full h-auto max-h-64 object-contain rounded"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.src = '/placeholder.svg';
              }}
            />
            <div className="absolute top-2 right-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={handleDownload}
                className="bg-background/80 backdrop-blur-sm"
              >
                <Download className="h-4 w-4" />
              </Button>
            </div>
          </div>
          {filename && (
            <p className="text-xs text-muted-foreground mt-2 truncate">{filename}</p>
          )}
        </CardContent>
      </Card>
    );
  }

  if (type === 'audio') {
    return (
      <Card className={className}>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={(e) => {
                const audio = e.currentTarget.parentElement?.querySelector('audio') as HTMLAudioElement;
                if (audio) handlePlayPause(audio);
              }}
            >
              {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                const audio = e.currentTarget.parentElement?.querySelector('audio') as HTMLAudioElement;
                if (audio) handleMuteToggle(audio);
              }}
            >
              {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
            </Button>

            <div className="flex-1">
              <audio
                src={url}
                controls
                className="w-full"
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
                onEnded={() => setIsPlaying(false)}
              >
                Your browser does not support audio playback.
              </audio>
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={handleDownload}
            >
              <Download className="h-4 w-4" />
            </Button>
          </div>
          
          {filename && (
            <p className="text-xs text-muted-foreground mt-2 truncate">{filename}</p>
          )}
        </CardContent>
      </Card>
    );
  }

  if (type === 'video') {
    return (
      <Card className={className}>
        <CardContent className="p-4">
          <div className="relative">
            <video
              src={url}
              controls
              className="w-full h-auto max-h-64 rounded"
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
              onEnded={() => setIsPlaying(false)}
            >
              Your browser does not support video playback.
            </video>
            
            <div className="absolute top-2 right-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={handleDownload}
                className="bg-background/80 backdrop-blur-sm"
              >
                <Download className="h-4 w-4" />
              </Button>
            </div>
          </div>
          
          {filename && (
            <p className="text-xs text-muted-foreground mt-2 truncate">{filename}</p>
          )}
        </CardContent>
      </Card>
    );
  }

  return null;
}