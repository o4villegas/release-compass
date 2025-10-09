import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card';
import { Button } from '~/components/ui/button';
import { Input } from '~/components/ui/input';
import { Label } from '~/components/ui/label';
import { Badge } from '~/components/ui/badge';

interface Note {
  id: string;
  timestamp_seconds: number;
  note_text: string;
  created_by: string;
  created_at: string;
}

interface AudioPlayerProps {
  fileId: string;
  audioUrl: string;
  userUuid: string;
  uploadedBy: string;
  notesAcknowledged: boolean;
  onAcknowledge?: () => void;
}

export function AudioPlayer({
  fileId,
  audioUrl,
  userUuid,
  uploadedBy,
  notesAcknowledged,
  onAcknowledge,
}: AudioPlayerProps) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [currentTime, setCurrentTime] = useState(0);
  const [showAddNote, setShowAddNote] = useState(false);
  const [newNoteText, setNewNoteText] = useState('');
  const [duration, setDuration] = useState(0);
  const [isClient, setIsClient] = useState(false);
  const [PlyrComponent, setPlyrComponent] = useState<any>(null);
  const playerRef = useRef<any>(null);

  const isUploader = userUuid === uploadedBy;
  const hasNotes = notes.length > 0;
  const canAcknowledge = isUploader && hasNotes && !notesAcknowledged;

  // Load Plyr only on client side to avoid SSR issues
  useEffect(() => {
    setIsClient(true);
    import('plyr-react').then((module) => {
      setPlyrComponent(() => module.default);
    });
    import('plyr-react/plyr.css');
  }, []);

  // Fetch notes on load
  useEffect(() => {
    fetchNotes();
  }, [fileId]);

  const fetchNotes = async () => {
    try {
      const res = await fetch(`/api/files/${fileId}/notes`);
      const data = await res.json() as { notes?: Note[] };
      setNotes(data.notes || []);
    } catch (err) {
      console.error('Error fetching notes:', err instanceof Error ? err.message : 'Unknown error');
    }
  };

  // Handle Plyr ready event
  const handleReady = (player: any) => {
    setDuration(player.duration);
  };

  // Handle Plyr time update
  const handleTimeUpdate = (event: any) => {
    const player = event.detail?.plyr;
    if (player) {
      setCurrentTime(player.currentTime);
      if (duration === 0) {
        setDuration(player.duration);
      }
    }
  };

  // Jump to timestamp when clicking note
  const jumpToTimestamp = (seconds: number) => {
    if (playerRef.current?.plyr) {
      playerRef.current.plyr.currentTime = seconds;
      playerRef.current.plyr.play();
    }
  };

  // Add note at current timestamp
  const handleAddNote = async () => {
    if (!newNoteText.trim()) return;

    try {
      const response = await fetch(`/api/files/${fileId}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          timestamp_seconds: Math.floor(currentTime),
          note_text: newNoteText,
          user_uuid: userUuid,
        }),
      });

      if (!response.ok) throw new Error('Failed to add note');

      await fetchNotes();
      setNewNoteText('');
      setShowAddNote(false);
    } catch (err) {
      console.error('Error adding note:', err);
    }
  };

  // Acknowledge all notes
  const handleAcknowledge = async () => {
    try {
      const response = await fetch(`/api/files/${fileId}/acknowledge-notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_uuid: userUuid }),
      });

      if (!response.ok) {
        const error = await response.json() as { error?: string };
        throw new Error(error.error || 'Failed to acknowledge notes');
      }

      if (onAcknowledge) {
        onAcknowledge();
      }
    } catch (err) {
      console.error('Error acknowledging notes:', err);
      alert(err instanceof Error ? err.message : 'Failed to acknowledge notes');
    }
  };

  const formatTimestamp = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDate = (isoString: string): string => {
    return new Date(isoString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle>Audio Player</CardTitle>
            <CardDescription>
              {hasNotes ? `${notes.length} feedback note${notes.length !== 1 ? 's' : ''}` : 'No feedback notes yet'}
            </CardDescription>
          </div>
          <div className="flex gap-2">
            {notesAcknowledged && (
              <Badge variant="default" className="bg-primary">
                ✓ Acknowledged
              </Badge>
            )}
            {canAcknowledge && (
              <Button onClick={handleAcknowledge} variant="default">
                Acknowledge Feedback
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Audio Player */}
        <div className="relative">
          {!isClient || !PlyrComponent ? (
            <div className="p-4 text-center text-muted-foreground">Loading audio player...</div>
          ) : (
            <>
              <PlyrComponent
                ref={playerRef}
                source={{
                  type: 'audio',
                  sources: [{ src: audioUrl }],
                }}
                options={{
                  controls: ['play', 'progress', 'current-time', 'duration', 'mute', 'volume'],
                }}
                onReady={handleReady}
                onTimeUpdate={handleTimeUpdate}
              />

              {/* Timeline note markers overlay */}
              {duration > 0 && (
                <div className="absolute top-7 left-0 right-0 h-1 pointer-events-none">
                  {notes.map((note) => (
                    <div
                      key={note.id}
                      className="absolute w-2 h-2 bg-red-500 rounded-full transform -translate-y-1/2 pointer-events-auto cursor-pointer hover:scale-150 transition-transform"
                      style={{
                        left: `${(note.timestamp_seconds / duration) * 100}%`,
                      }}
                      onClick={() => jumpToTimestamp(note.timestamp_seconds)}
                      title={`${formatTimestamp(note.timestamp_seconds)}: ${note.note_text}`}
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        {/* Add Note Section */}
        <div className="space-y-2">
          {!showAddNote ? (
            <Button onClick={() => setShowAddNote(true)} variant="outline" className="w-full">
              Add Note at {formatTimestamp(currentTime)}
            </Button>
          ) : (
            <div className="space-y-2 p-4 border rounded-lg">
              <Label htmlFor="note-text">Note at {formatTimestamp(currentTime)}</Label>
              <Input
                id="note-text"
                placeholder="Enter your feedback note..."
                value={newNoteText}
                onChange={(e) => setNewNoteText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleAddNote();
                  }
                }}
              />
              <div className="flex gap-2">
                <Button onClick={handleAddNote} disabled={!newNoteText.trim()}>
                  Add Note
                </Button>
                <Button
                  onClick={() => {
                    setShowAddNote(false);
                    setNewNoteText('');
                  }}
                  variant="outline"
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Notes List */}
        {hasNotes && (
          <div className="space-y-2">
            <h4 className="font-semibold">Feedback Notes</h4>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {notes.map((note) => (
                <div
                  key={note.id}
                  className="p-3 border rounded-lg hover:bg-accent cursor-pointer transition-colors"
                  onClick={() => jumpToTimestamp(note.timestamp_seconds)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline" className="text-xs">
                          {formatTimestamp(note.timestamp_seconds)}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {formatDate(note.created_at)}
                        </span>
                      </div>
                      <p className="text-sm">{note.note_text}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
