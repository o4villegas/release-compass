import { useState } from 'react';
import { useRevalidator } from 'react-router';
import { generateCalendarMonth, suggestPostingSchedule, type ScheduledContent, type CalendarWeek } from '~/utils/contentCalendar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card';
import { Badge } from '~/components/ui/badge';
import { Button } from '~/components/ui/button';
import { Alert, AlertDescription } from '~/components/ui/alert';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Lightbulb, Plus, AlertCircle, CheckCircle, Camera, Video, Mic, Drama, Folder, Pin } from 'lucide-react';
import { ScheduleContentDialog } from '~/components/ScheduleContentDialog';
import { ContentPickerDialog } from '~/components/ContentPickerDialog';

interface ContentCalendarProps {
  projectId: string;
  releaseDate: string;
  scheduledContent: ScheduledContent[];
  milestones: Array<{ id: string; name: string; due_date: string; status: string }>;
  availableContent: Array<{ id: string; content_type: string; caption_draft: string | null }>;
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function ContentCalendar({
  projectId,
  releaseDate,
  scheduledContent,
  milestones,
  availableContent
}: ContentCalendarProps) {
  const today = new Date();
  const revalidator = useRevalidator();
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false);
  const [pickerDialogOpen, setPickerDialogOpen] = useState(false);
  const [selectedContent, setSelectedContent] = useState<{ id: string; content_type: string; caption_draft: string | null } | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');

  const calendarWeeks = generateCalendarMonth(currentYear, currentMonth, scheduledContent, milestones);
  const suggestions = suggestPostingSchedule(releaseDate, availableContent);

  const goToPreviousMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };

  const goToNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };

  const goToToday = () => {
    setCurrentMonth(today.getMonth());
    setCurrentYear(today.getFullYear());
  };

  const getContentTypeIcon = (contentType: string) => {
    if (contentType === 'photo') return <Camera className="h-4 w-4 inline" />;
    if (contentType.includes('short')) return <Video className="h-4 w-4 inline" />;
    if (contentType.includes('long')) return <Video className="h-4 w-4 inline" />;
    if (contentType.includes('voice')) return <Mic className="h-4 w-4 inline" />;
    if (contentType.includes('live')) return <Drama className="h-4 w-4 inline" />;
    return <Folder className="h-4 w-4 inline" />;
  };

  const handleSchedule = async (data: { contentId: string; scheduledDate: string; platforms: string; notes: string }) => {
    const userUuid = localStorage.getItem('userUuid');
    if (!userUuid) {
      setError('User identity not found. Please refresh the page.');
      return;
    }

    setError('');
    setSuccess('');

    try {
      const response = await fetch('/api/calendar/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contentId: data.contentId,
          scheduledDate: data.scheduledDate,
          platforms: data.platforms || null,
          notes: data.notes || null,
          userUuid
        })
      });

      if (response.ok) {
        setSuccess('Content scheduled successfully!');
        setScheduleDialogOpen(false);
        // Refresh calendar data without page reload
        revalidator.revalidate();
      } else {
        const errorData = (await response.json().catch(() => ({ error: 'Failed to schedule content' }))) as { error: string };
        setError(errorData.error || 'Failed to schedule content. Please try again.');
      }
    } catch (error) {
      setError('Network error. Please check your connection and try again.');
      console.error('Error scheduling content:', error);
    }
  };

  const handleDayClick = (dateString: string) => {
    if (availableContent.length === 0) {
      setError('No content available to schedule. Please upload content first.');
      return;
    }

    setError('');
    setSuccess('');
    setSelectedDate(dateString);
    setPickerDialogOpen(true);
  };

  const handleContentSelection = (content: { id: string; content_type: string; caption_draft: string | null }) => {
    setSelectedContent(content);
    setPickerDialogOpen(false);
    setScheduleDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Success Alert */}
      {success && (
        <Alert className="bg-green-50 border-green-500">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">{success}</AlertDescription>
        </Alert>
      )}

      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <CalendarIcon className="h-5 w-5" />
                Content Calendar
              </CardTitle>
              <CardDescription>
                Plan your content posting schedule leading up to release
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowSuggestions(!showSuggestions)}
              className="gap-2"
            >
              <Lightbulb className="h-4 w-4" />
              {showSuggestions ? 'Hide' : 'Show'} Suggestions
            </Button>
          </div>
        </CardHeader>

        {/* Posting Suggestions */}
        {showSuggestions && (
          <CardContent className="border-t border-border pt-6">
            <div className="space-y-3">
              <h4 className="font-semibold text-sm">Recommended Posting Schedule</h4>
              <div className="grid gap-2">
                {suggestions.map((suggestion, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border border-border hover:border-primary hover:bg-muted/70 transition-all cursor-pointer"
                    onClick={() => handleDayClick(suggestion.date)}
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10">
                        {getContentTypeIcon(suggestion.content_type)}
                      </div>
                      <div>
                        <p className="font-medium text-sm">
                          {new Date(suggestion.date).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric'
                          })}
                        </p>
                        <p className="text-xs text-muted-foreground">{suggestion.reason}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="capitalize">
                        {suggestion.content_type.replace('_', ' ')}
                      </Badge>
                      <Plus className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Calendar */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h3 className="text-2xl font-bold">
                {MONTH_NAMES[currentMonth]} {currentYear}
              </h3>
              <Button variant="outline" size="sm" onClick={goToToday}>
                Today
              </Button>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="icon" onClick={goToPreviousMonth}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon" onClick={goToNextMonth}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {/* Day names header */}
          <div className="grid grid-cols-7 gap-2 mb-2">
            {DAY_NAMES.map(day => (
              <div key={day} className="text-center text-sm font-semibold text-muted-foreground py-2">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="space-y-2">
            {calendarWeeks.map(week => (
              <div key={week.weekNumber} className="grid grid-cols-7 gap-2">
                {week.days.map(day => {
                  const isCurrentMonth = day.date.getMonth() === currentMonth;
                  const hasScheduledContent = day.scheduledContent.length > 0;
                  const hasMilestone = day.milestoneDeadlines.length > 0;

                  return (
                    <div
                      key={day.dateString}
                      onClick={() => isCurrentMonth && !day.isPast && handleDayClick(day.dateString)}
                      className={`
                        relative min-h-[100px] p-2 rounded-lg border transition-all
                        ${day.isToday ? 'border-primary border-2 bg-primary/5' : 'border-border'}
                        ${!isCurrentMonth ? 'opacity-40 bg-muted/20' : 'bg-card'}
                        ${day.isWeekend && isCurrentMonth ? 'bg-muted/30' : ''}
                        ${isCurrentMonth && !day.isPast ? 'hover:shadow-md hover:border-primary/50 cursor-pointer' : ''}
                      `}
                    >
                      {/* Date number */}
                      <div className="flex items-center justify-between mb-1">
                        <span className={`text-sm font-semibold ${day.isToday ? 'text-primary' : 'text-foreground'}`}>
                          {day.date.getDate()}
                        </span>
                        {day.isToday && (
                          <Badge variant="default" className="text-[10px] px-1 py-0">Today</Badge>
                        )}
                      </div>

                      {/* Scheduled content indicators */}
                      {hasScheduledContent && (
                        <div className="space-y-1">
                          {day.scheduledContent.slice(0, 2).map(content => (
                            <div
                              key={content.id}
                              className="text-[10px] px-1.5 py-0.5 rounded bg-primary/20 text-primary truncate"
                            >
                              {getContentTypeIcon(content.content?.content_type || 'unknown')}{' '}
                              {content.content?.caption_draft?.slice(0, 15) || 'Scheduled post'}
                            </div>
                          ))}
                          {day.scheduledContent.length > 2 && (
                            <div className="text-[10px] text-muted-foreground">
                              +{day.scheduledContent.length - 2} more
                            </div>
                          )}
                        </div>
                      )}

                      {/* Milestone indicators */}
                      {hasMilestone && (
                        <div className="mt-1 space-y-1">
                          {day.milestoneDeadlines.map(milestone => (
                            <div
                              key={milestone.id}
                              className="text-[10px] px-1.5 py-0.5 rounded bg-yellow-500/20 text-yellow-400 truncate flex items-center gap-1"
                            >
                              <Pin className="h-2.5 w-2.5 inline flex-shrink-0" /> {milestone.name}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>

          {/* Legend */}
          <div className="mt-6 pt-4 border-t border-border flex flex-wrap gap-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-primary/20 border border-primary"></div>
              <span>Scheduled Content</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-yellow-500/20 border border-yellow-500"></div>
              <span>Milestone Deadline</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded border-2 border-primary"></div>
              <span>Today</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{scheduledContent.length}</div>
            <div className="text-sm text-muted-foreground">Posts Scheduled</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">
              {Math.ceil((new Date(releaseDate).getTime() - today.getTime()) / (1000 * 60 * 60 * 24))}
            </div>
            <div className="text-sm text-muted-foreground">Days to Release</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">
              {availableContent.length}
            </div>
            <div className="text-sm text-muted-foreground">Content Available</div>
          </CardContent>
        </Card>
      </div>

      {/* Content Picker Dialog */}
      <ContentPickerDialog
        open={pickerDialogOpen}
        onClose={() => setPickerDialogOpen(false)}
        onSelect={handleContentSelection}
        availableContent={availableContent}
        selectedDate={selectedDate}
      />

      {/* Schedule Content Dialog */}
      <ScheduleContentDialog
        open={scheduleDialogOpen}
        onClose={() => setScheduleDialogOpen(false)}
        onSchedule={handleSchedule}
        contentItem={selectedContent}
        prefilledDate={selectedDate}
      />
    </div>
  );
}
