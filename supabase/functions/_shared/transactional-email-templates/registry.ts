/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'

export interface TemplateEntry {
  component: React.ComponentType<any>
  subject: string | ((data: Record<string, any>) => string)
  to?: string
  displayName?: string
  previewData?: Record<string, any>
}

import { template as hotLeadAlert } from './hot-lead-alert.tsx'
import { template as missedChatFollowup } from './missed-chat-followup.tsx'
import { template as weeklyDigest } from './weekly-digest.tsx'

export const TEMPLATES: Record<string, TemplateEntry> = {
  'hot-lead-alert': hotLeadAlert,
  'missed-chat-followup': missedChatFollowup,
  'weekly-digest': weeklyDigest,
}
