export interface ContentSuggestion {
  content_type: 'short_video' | 'photo' | 'voice_memo' | 'long_video' | 'live_performance';
  capture_context: string;
  why: string;
  examples: string[];
  priority: 'high' | 'medium' | 'low';
}

export const SUGGESTIONS_BY_MILESTONE: Record<string, ContentSuggestion[]> = {
  'Recording Complete': [
    {
      content_type: 'short_video',
      capture_context: 'recording_session',
      why: 'Fans love behind-the-scenes studio content - shows the creative process',
      examples: ['Vocal booth setup', 'Producer reaction to take', 'Mic technique close-up', 'Artist headphone mix reaction'],
      priority: 'high'
    },
    {
      content_type: 'photo',
      capture_context: 'recording_session',
      why: 'High-quality session photos work great for announcements and throwbacks',
      examples: ['Artist at microphone', 'Studio equipment detail', 'Producer at console', 'Handwritten lyrics'],
      priority: 'high'
    },
    {
      content_type: 'voice_memo',
      capture_context: 'recording_session',
      why: 'Voice memos add personal touch - perfect for Stories and TikTok',
      examples: ['Discussing song meaning', 'Explaining production choice', 'Reaction to playback', 'Thank you to team'],
      priority: 'medium'
    },
    {
      content_type: 'long_video',
      capture_context: 'recording_session',
      why: 'Extended footage can be edited into YouTube content or documentary-style posts',
      examples: ['Full vocal take', 'Studio session vlog', 'Producer interview', 'A&R feedback session'],
      priority: 'low'
    }
  ],

  'Mixing Complete': [
    {
      content_type: 'short_video',
      capture_context: 'mixing_session',
      why: 'Mixing content shows technical craftsmanship - builds anticipation',
      examples: ['Before/after mix comparison', 'Engineer adjusting levels', 'Automation breakdown', 'Mix bus processing'],
      priority: 'high'
    },
    {
      content_type: 'photo',
      capture_context: 'mixing_session',
      why: 'Mixing studio aesthetics appeal to music production enthusiasts',
      examples: ['Mixing console wide shot', 'Plugin chain screenshot', 'Engineer at work', 'Waveform close-up'],
      priority: 'medium'
    },
    {
      content_type: 'voice_memo',
      capture_context: 'mixing_session',
      why: 'Quick audio clips comparing mix versions engage fans in the process',
      examples: ['Rough mix vs final', 'Explaining stereo width', 'Discussing vocal effects', 'Mix approval celebration'],
      priority: 'high'
    }
  ],

  'Mastering Complete': [
    {
      content_type: 'short_video',
      capture_context: 'mastering_session',
      why: 'Final polish content signals release is imminent - builds hype',
      examples: ['Mastering engineer review', 'Before/after master comparison', 'Final approval moment', 'Loudness metering'],
      priority: 'high'
    },
    {
      content_type: 'photo',
      capture_context: 'mastering_session',
      why: 'Mastering visuals represent completion milestone - great for announcements',
      examples: ['Mastering suite', 'Final waveform', 'Engineer notes', 'DDP export screen'],
      priority: 'medium'
    },
    {
      content_type: 'voice_memo',
      capture_context: 'mastering_session',
      why: 'Short audio comparing mastered vs unmastered showcases professional quality',
      examples: ['Master comparison', 'Engineer feedback', 'Artist final thoughts', 'Release date announcement'],
      priority: 'high'
    }
  ],

  'Artwork Finalized': [
    {
      content_type: 'short_video',
      capture_context: 'creative_meeting',
      why: 'Artwork reveal content generates massive engagement - tease the visual',
      examples: ['Designer presenting concepts', 'Artist choosing final design', 'Time-lapse creation', 'Artwork unboxing'],
      priority: 'high'
    },
    {
      content_type: 'photo',
      capture_context: 'creative_meeting',
      why: 'Behind-the-scenes design process shows artistic vision',
      examples: ['Mood board', 'Sketch iterations', 'Color palette', 'Final artwork flat lay'],
      priority: 'high'
    },
    {
      content_type: 'long_video',
      capture_context: 'creative_meeting',
      why: 'Extended artwork story can be YouTube content or Instagram carousel',
      examples: ['Full design process', 'Designer interview', 'Concept to completion', 'Artist creative direction'],
      priority: 'medium'
    }
  ],

  'Distribution Submitted': [
    {
      content_type: 'short_video',
      capture_context: 'admin',
      why: 'Upload/submission content proves professionalism - "we\'re really doing this"',
      examples: ['Distributor dashboard', 'Hitting submit button', 'Confirmation email', 'Metadata entry'],
      priority: 'high'
    },
    {
      content_type: 'photo',
      capture_context: 'admin',
      why: 'Administrative moments humanize the release process',
      examples: ['Completed upload screen', 'Release dashboard', 'ISRC codes', 'Submission confirmation'],
      priority: 'medium'
    },
    {
      content_type: 'voice_memo',
      capture_context: 'admin',
      why: 'Quick update on distribution status keeps fans informed',
      examples: ['Submission announcement', 'Expected live date', 'Platform list', 'Pre-save reminder'],
      priority: 'high'
    }
  ],

  'Playlist Pitching Complete': [
    {
      content_type: 'short_video',
      capture_context: 'marketing_campaign',
      why: 'Playlist pitching content shows industry hustle - fans love transparency',
      examples: ['Writing pitch email', 'Curator outreach', 'Pitch deck walkthrough', 'Submission confirmation'],
      priority: 'high'
    },
    {
      content_type: 'photo',
      capture_context: 'marketing_campaign',
      why: 'Marketing prep visuals demonstrate professional approach',
      examples: ['Pitch document', 'Curator list', 'EPK materials', 'Campaign calendar'],
      priority: 'medium'
    },
    {
      content_type: 'voice_memo',
      capture_context: 'marketing_campaign',
      why: 'Quick pitch explanation invites fans to support (streaming, sharing)',
      examples: ['Why playlisting matters', 'How fans can help', 'Target playlists', 'Streaming strategy'],
      priority: 'high'
    }
  ],

  'Content Strategy Approved': [
    {
      content_type: 'short_video',
      capture_context: 'creative_meeting',
      why: 'Strategy content shows organized campaign - builds credibility',
      examples: ['Content calendar review', 'Team brainstorm', 'Campaign timeline', 'Platform strategy'],
      priority: 'medium'
    },
    {
      content_type: 'photo',
      capture_context: 'creative_meeting',
      why: 'Planning visuals demonstrate professionalism and preparation',
      examples: ['Strategy whiteboard', 'Campaign mockups', 'Team meeting', 'Content matrix'],
      priority: 'medium'
    }
  ],

  'Release Week Prep': [
    {
      content_type: 'short_video',
      capture_context: 'rehearsal',
      why: 'Rehearsal content builds anticipation for potential performances',
      examples: ['Band practice', 'Sound check', 'Setlist planning', 'Performance prep'],
      priority: 'high'
    },
    {
      content_type: 'photo',
      capture_context: 'rehearsal',
      why: 'Performance prep shows dedication and creates countdown momentum',
      examples: ['Equipment setup', 'Artist warmup', 'Stage layout', 'Team huddle'],
      priority: 'medium'
    },
    {
      content_type: 'voice_memo',
      capture_context: 'personal',
      why: 'Personal reflections during release week are authentic and engaging',
      examples: ['Pre-release nerves', 'Thank you message', 'Release goals', 'Fan appreciation'],
      priority: 'high'
    }
  ]
};

export function getSuggestionsForMilestone(
  milestoneName: string,
  alreadyCaptured: Array<{ content_type: string; capture_context: string }>
): ContentSuggestion[] {
  const allSuggestions = SUGGESTIONS_BY_MILESTONE[milestoneName] || [];

  // Filter out suggestions that have already been captured
  const uncapturedSuggestions = allSuggestions.filter(suggestion => {
    return !alreadyCaptured.some(
      captured =>
        captured.content_type === suggestion.content_type &&
        captured.capture_context === suggestion.capture_context
    );
  });

  // Sort by priority (high → medium → low)
  const priorityOrder = { high: 0, medium: 1, low: 2 };
  return uncapturedSuggestions.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
}

export function getAllSuggestionsForMilestone(milestoneName: string): ContentSuggestion[] {
  return SUGGESTIONS_BY_MILESTONE[milestoneName] || [];
}

export function getContentTypeLabel(contentType: string): string {
  const labels: Record<string, string> = {
    'short_video': 'Short Video',
    'photo': 'Photo',
    'voice_memo': 'Voice Memo',
    'long_video': 'Long Video',
    'live_performance': 'Live Performance'
  };
  return labels[contentType] || contentType;
}

export function getCaptureContextLabel(context: string): string {
  const labels: Record<string, string> = {
    'recording_session': 'Recording Session',
    'mixing_session': 'Mixing Session',
    'mastering_session': 'Mastering Session',
    'rehearsal': 'Rehearsal',
    'creative_meeting': 'Creative Meeting',
    'marketing_campaign': 'Marketing Campaign',
    'admin': 'Administrative',
    'personal': 'Personal Reflection'
  };
  return labels[context] || context;
}
