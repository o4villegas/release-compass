import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card';
import { Badge } from '~/components/ui/badge';
import { Button } from '~/components/ui/button';
import { Alert } from '~/components/ui/alert';
import { Lightbulb, Flame, Star, CheckCircle, Camera } from 'lucide-react';
import {
  type ContentSuggestion,
  getSuggestionsForMilestone,
  getContentTypeLabel,
  getCaptureContextLabel
} from '~/utils/contentSuggestions';

interface ContentSuggestionsProps {
  milestoneName: string;
  alreadyCaptured: Array<{ content_type: string; capture_context: string }>;
  onCaptureNow?: (contentType: string, captureContext: string) => void;
}

export function ContentSuggestions({
  milestoneName,
  alreadyCaptured,
  onCaptureNow
}: ContentSuggestionsProps) {
  const [expandedSuggestions, setExpandedSuggestions] = useState<Set<number>>(new Set());
  const suggestions = getSuggestionsForMilestone(milestoneName, alreadyCaptured);

  if (suggestions.length === 0) {
    return null; // No suggestions available
  }

  const toggleExpanded = (index: number) => {
    const newExpanded = new Set(expandedSuggestions);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedSuggestions(newExpanded);
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'destructive';
      case 'medium':
        return 'default';
      case 'low':
        return 'secondary';
      default:
        return 'secondary';
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'high':
        return <Flame className="h-5 w-5" />;
      case 'medium':
        return <Star className="h-5 w-5" />;
      case 'low':
        return <Lightbulb className="h-5 w-5" />;
      default:
        return <Lightbulb className="h-5 w-5" />;
    }
  };

  return (
    <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-card">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Lightbulb className="h-6 w-6 text-primary" />
          <CardTitle>Smart Content Suggestions</CardTitle>
        </div>
        <CardDescription>
          Capture these recommended content types during "{milestoneName}" to maximize your marketing material
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {suggestions.length === 0 ? (
          <Alert className="border-primary/30 bg-primary/10">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-primary" />
              <span className="font-medium">Great work! You've captured all recommended content for this milestone.</span>
            </div>
          </Alert>
        ) : (
          suggestions.map((suggestion, index) => {
            const isExpanded = expandedSuggestions.has(index);
            return (
              <Card
                key={index}
                className={`
                  transition-all duration-200 border-l-4
                  ${suggestion.priority === 'high'
                    ? 'border-l-red-500 bg-gradient-to-r from-red-950/20 to-card hover:shadow-red-500/10'
                    : suggestion.priority === 'medium'
                    ? 'border-l-yellow-500 bg-gradient-to-r from-yellow-950/20 to-card hover:shadow-yellow-500/10'
                    : 'border-l-primary bg-gradient-to-r from-primary/10 to-card hover:shadow-primary/10'
                  }
                  ${isExpanded ? 'shadow-lg' : 'hover:shadow-md'}
                `}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className={`
                        flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center shadow-lg
                        ${suggestion.priority === 'high' ? 'bg-red-500/20 border-2 border-red-500/50 shadow-red-500/20' :
                          suggestion.priority === 'medium' ? 'bg-yellow-500/20 border-2 border-yellow-500/50 shadow-yellow-500/20' :
                          'bg-primary/20 border-2 border-primary/50 shadow-primary/20'}
                      `}>
                        <span className="text-xl">{getPriorityIcon(suggestion.priority)}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <CardTitle className="text-base font-semibold leading-tight">
                            {getContentTypeLabel(suggestion.content_type)}
                          </CardTitle>
                          <Badge variant="outline" className="text-xs">
                            {getCaptureContextLabel(suggestion.capture_context)}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          {suggestion.why}
                        </p>
                      </div>
                    </div>
                    <Badge
                      variant={getPriorityColor(suggestion.priority)}
                      className="flex-shrink-0 font-semibold shadow-sm text-xs"
                    >
                      {suggestion.priority.toUpperCase()}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  {/* Examples (collapsible) */}
                  {suggestion.examples.length > 0 && (
                    <div className="mb-3">
                      <button
                        onClick={() => toggleExpanded(index)}
                        className="text-sm text-primary hover:underline flex items-center gap-1 mb-2"
                      >
                        {isExpanded ? '▼' : '▶'} {suggestion.examples.length} Example Ideas
                      </button>
                      {isExpanded && (
                        <ul className="space-y-1.5 ml-4 text-sm text-muted-foreground">
                          {suggestion.examples.map((example, exIdx) => (
                            <li key={exIdx} className="flex items-start gap-2">
                              <span className="text-primary mt-0.5">•</span>
                              <span>{example}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}

                  {/* Capture Now Button */}
                  {onCaptureNow && (
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => onCaptureNow(suggestion.content_type, suggestion.capture_context)}
                      className="shadow-sm hover:shadow-md hover:shadow-primary/30 transition-shadow font-medium flex items-center gap-1.5"
                    >
                      <Camera className="h-4 w-4" />
                      Capture This Now
                      <span className="ml-1">→</span>
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
