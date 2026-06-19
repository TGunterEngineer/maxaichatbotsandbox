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
  Row,
  Column,
  Section,
  Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = 'MaximumAI Chatbot'
const APP_URL = 'https://chat.maximumaiconsulting.com'

interface WeeklyDigestProps {
  orgName?: string
  weekRangeLabel?: string
  conversations?: number
  leads?: number
  hotLeads?: number
  topQuestion?: string | null
  conversationsTrend?: number | null
}

const WeeklyDigestEmail = ({
  orgName = 'your team',
  weekRangeLabel = 'this week',
  conversations = 0,
  leads = 0,
  hotLeads = 0,
  topQuestion,
  conversationsTrend,
}: WeeklyDigestProps) => {
  const trendLabel =
    conversationsTrend === null || conversationsTrend === undefined
      ? null
      : conversationsTrend > 0
        ? `▲ ${conversationsTrend}% vs last week`
        : conversationsTrend < 0
          ? `▼ ${Math.abs(conversationsTrend)}% vs last week`
          : 'Same as last week'

  return (
    <Html lang="en" dir="ltr">
      <Head />
      <Preview>{`${orgName} — ${conversations} chats, ${leads} leads, ${hotLeads} hot`}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Text style={eyebrow}>WEEKLY DIGEST · {weekRangeLabel.toUpperCase()}</Text>
          <Heading style={h1}>Your week at a glance</Heading>
          <Text style={text}>
            Here's what your chatbot did for {orgName} this past week.
          </Text>

          <Section style={statsRow}>
            <Row>
              <Column style={statCell}>
                <Text style={statValue}>{conversations}</Text>
                <Text style={statLabel}>Conversations</Text>
                {trendLabel && <Text style={trendText}>{trendLabel}</Text>}
              </Column>
              <Column style={statCell}>
                <Text style={statValue}>{leads}</Text>
                <Text style={statLabel}>Leads captured</Text>
              </Column>
              <Column style={statCell}>
                <Text style={{ ...statValue, color: '#dc2626' }}>{hotLeads}</Text>
                <Text style={statLabel}>🔥 Hot leads</Text>
              </Column>
            </Row>
          </Section>

          {topQuestion && (
            <Section style={quoteBox}>
              <Text style={quoteLabel}>Most common question this week</Text>
              <Text style={quoteText}>"{topQuestion}"</Text>
            </Section>
          )}

          {conversations === 0 && (
            <Section style={emptyBox}>
              <Text style={emptyText}>
                No conversations this week. Make sure your chatbot is embedded
                on your high-traffic pages — most clients see lift in 7–14 days.
              </Text>
            </Section>
          )}

          <Section style={{ textAlign: 'center', margin: '32px 0' }}>
            <Button style={button} href={`${APP_URL}/leads`}>
              View Full Dashboard
            </Button>
          </Section>

          <Hr style={hr} />
          <Text style={footer}>
            Sent every Sunday by {SITE_NAME}
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: WeeklyDigestEmail,
  subject: (data: Record<string, any>) =>
    `📊 ${data.orgName || 'Your'} weekly digest — ${data.conversations || 0} chats, ${data.leads || 0} leads`,
  displayName: 'Weekly Digest',
  previewData: {
    orgName: 'Acme Co',
    weekRangeLabel: 'Apr 14 – Apr 20',
    conversations: 47,
    leads: 12,
    hotLeads: 3,
    topQuestion: 'Do you offer weekend appointments?',
    conversationsTrend: 24,
  },
} satisfies TemplateEntry

const main = {
  backgroundColor: '#ffffff',
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
}
const container = { maxWidth: '560px', margin: '0 auto', padding: '32px 24px' }
const eyebrow = {
  fontSize: '11px',
  color: '#10b981',
  fontWeight: '700',
  letterSpacing: '1px',
  margin: '0 0 8px',
}
const h1 = {
  fontSize: '26px',
  fontWeight: '700',
  color: '#0a0a0f',
  margin: '0 0 12px',
  lineHeight: '1.2',
}
const text = {
  fontSize: '15px',
  color: '#475569',
  lineHeight: '1.6',
  margin: '0 0 24px',
}
const statsRow = {
  backgroundColor: '#f8fafc',
  border: '1px solid #e2e8f0',
  borderRadius: '12px',
  padding: '24px 12px',
  margin: '24px 0',
}
const statCell = {
  textAlign: 'center' as const,
  padding: '0 8px',
}
const statValue = {
  fontSize: '32px',
  fontWeight: '700',
  color: '#0a0a0f',
  margin: '0 0 4px',
  lineHeight: '1',
}
const statLabel = {
  fontSize: '12px',
  color: '#64748b',
  fontWeight: '500',
  margin: 0,
}
const trendText = {
  fontSize: '11px',
  color: '#10b981',
  fontWeight: '600',
  margin: '4px 0 0',
}
const quoteBox = {
  backgroundColor: '#fffbeb',
  border: '1px solid #fde68a',
  borderRadius: '8px',
  padding: '16px 20px',
  margin: '20px 0',
}
const quoteLabel = {
  fontSize: '11px',
  color: '#92400e',
  fontWeight: '700',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.5px',
  margin: '0 0 6px',
}
const quoteText = {
  fontSize: '15px',
  color: '#1e293b',
  fontStyle: 'italic',
  margin: 0,
  lineHeight: '1.5',
}
const emptyBox = {
  backgroundColor: '#f8fafc',
  border: '1px dashed #cbd5e1',
  borderRadius: '8px',
  padding: '20px',
  margin: '20px 0',
}
const emptyText = {
  fontSize: '14px',
  color: '#64748b',
  margin: 0,
  lineHeight: '1.6',
  textAlign: 'center' as const,
}
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
