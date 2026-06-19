import * as React from 'npm:react@18.3.1'
import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = 'MaximumAI Chatbot'
const APP_URL = 'https://chat.maximumaiconsulting.com'

interface HotLeadAlertProps {
  orgName?: string
  leadEmail?: string
  project?: string
  timeline?: string
  budget?: string
  preferredTime?: string | null
  score?: string
  sessionId?: string
}

const HotLeadAlertEmail = ({
  orgName = 'your team',
  leadEmail,
  project,
  timeline,
  budget,
  preferredTime,
  score = 'hot',
  sessionId,
}: HotLeadAlertProps) => {
  const scoreLabel = score.toUpperCase()
  const scoreColor =
    score.toLowerCase() === 'hot'
      ? '#dc2626'
      : score.toLowerCase() === 'warm'
        ? '#f59e0b'
        : '#6b7280'

  return (
    <Html lang="en" dir="ltr">
      <Head />
      <Preview>
        🔥 New {scoreLabel} lead captured — {project || 'qualified visitor'}
      </Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={badge(scoreColor)}>
            <Text style={badgeText}>🔥 {scoreLabel} LEAD</Text>
          </Section>

          <Heading style={h1}>New qualified lead for {orgName}</Heading>
          <Text style={text}>
            Your chatbot just identified a high-intent visitor. Reach out
            quickly while they're still warm.
          </Text>

          <Section style={detailsBox}>
            {leadEmail && (
              <Text style={detailRow}>
                <strong style={label}>Email:</strong>{' '}
                <a href={`mailto:${leadEmail}`} style={link}>
                  {leadEmail}
                </a>
              </Text>
            )}
            {project && (
              <Text style={detailRow}>
                <strong style={label}>Project:</strong> {project}
              </Text>
            )}
            {timeline && (
              <Text style={detailRow}>
                <strong style={label}>Timeline:</strong> {timeline}
              </Text>
            )}
            {budget && (
              <Text style={detailRow}>
                <strong style={label}>Budget:</strong> {budget}
              </Text>
            )}
            {preferredTime && (
              <Text style={detailRow}>
                <strong style={label}>Preferred time:</strong> {preferredTime}
              </Text>
            )}
          </Section>

          <Section style={{ textAlign: 'center', margin: '32px 0' }}>
            <Button style={button} href={`${APP_URL}/leads`}>
              View Lead in Dashboard
            </Button>
          </Section>

          <Hr style={hr} />
          <Text style={footer}>
            Sent by {SITE_NAME}
            {sessionId ? ` · Session ${sessionId.slice(0, 8)}` : ''}
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: HotLeadAlertEmail,
  subject: (data: Record<string, any>) =>
    `🔥 New ${(data.score || 'hot').toUpperCase()} lead${data.project ? ` — ${data.project}` : ''}`,
  displayName: 'Hot Lead Alert',
  previewData: {
    orgName: 'Acme Co',
    leadEmail: 'jane@example.com',
    project: 'AI chatbot for SaaS onboarding',
    timeline: 'Next 30 days',
    budget: '$5-10k',
    preferredTime: 'Tuesday afternoon',
    score: 'hot',
    sessionId: 'abc12345-xxxx',
  },
} satisfies TemplateEntry

const main = {
  backgroundColor: '#ffffff',
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
}
const container = {
  maxWidth: '560px',
  margin: '0 auto',
  padding: '32px 24px',
}
const badge = (color: string) => ({
  backgroundColor: color,
  borderRadius: '6px',
  display: 'inline-block',
  padding: '4px 12px',
  marginBottom: '20px',
})
const badgeText = {
  color: '#ffffff',
  fontSize: '12px',
  fontWeight: '700',
  letterSpacing: '0.5px',
  margin: 0,
}
const h1 = {
  fontSize: '24px',
  fontWeight: '700',
  color: '#0a0a0f',
  margin: '0 0 12px',
  lineHeight: '1.3',
}
const text = {
  fontSize: '15px',
  color: '#475569',
  lineHeight: '1.6',
  margin: '0 0 24px',
}
const detailsBox = {
  backgroundColor: '#f8fafc',
  border: '1px solid #e2e8f0',
  borderRadius: '8px',
  padding: '20px 24px',
  margin: '24px 0',
}
const detailRow = {
  fontSize: '14px',
  color: '#1e293b',
  margin: '8px 0',
  lineHeight: '1.5',
}
const label = { color: '#64748b', fontWeight: '600' }
const link = { color: '#10b981', textDecoration: 'none' }
const button = {
  backgroundColor: '#10b981',
  color: '#ffffff',
  fontSize: '15px',
  fontWeight: '600',
  padding: '12px 28px',
  borderRadius: '8px',
  textDecoration: 'none',
  display: 'inline-block',
}
const hr = { borderColor: '#e2e8f0', margin: '32px 0 16px' }
const footer = {
  fontSize: '12px',
  color: '#94a3b8',
  textAlign: 'center' as const,
  margin: 0,
}
