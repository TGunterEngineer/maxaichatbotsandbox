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

interface MissedChatFollowupProps {
  orgName?: string
  visitorName?: string | null
  bookingLink?: string | null
  contactEmail?: string | null
  lastBotMessage?: string | null
}

const MissedChatFollowupEmail = ({
  orgName = 'our team',
  visitorName,
  bookingLink,
  contactEmail,
  lastBotMessage,
}: MissedChatFollowupProps) => {
  const greeting = visitorName ? `Hi ${visitorName},` : 'Hi there,'
  return (
    <Html lang="en" dir="ltr">
      <Head />
      <Preview>Sorry we missed you — here's how to pick this back up</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>Sorry we missed you!</Heading>
          <Text style={text}>{greeting}</Text>
          <Text style={text}>
            Thanks for chatting with {orgName} earlier today. Looks like our
            conversation got cut short — no worries, we'd still love to help.
          </Text>

          {lastBotMessage && (
            <Section style={quoteBox}>
              <Text style={quoteLabel}>Where we left off:</Text>
              <Text style={quoteText}>"{lastBotMessage.slice(0, 280)}"</Text>
            </Section>
          )}

          {bookingLink && (
            <>
              <Text style={text}>
                The fastest way to continue is to grab a time directly on our calendar:
              </Text>
              <Section style={{ textAlign: 'center', margin: '24px 0' }}>
                <Button style={button} href={bookingLink}>
                  Book a time
                </Button>
              </Section>
            </>
          )}

          <Text style={text}>
            Or just reply to this email{contactEmail ? '' : ''} and we'll get right
            back to you.
          </Text>

          <Hr style={hr} />
          <Text style={footer}>
            Sent by {orgName} · powered by {SITE_NAME}
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: MissedChatFollowupEmail,
  subject: (data: Record<string, any>) =>
    `Sorry we missed you${data.orgName ? ` — ${data.orgName}` : ''}`,
  displayName: 'Missed Chat Follow-up',
  previewData: {
    orgName: 'Acme Co',
    visitorName: 'Jane',
    bookingLink: 'https://cal.com/acme/30min',
    contactEmail: 'hello@acme.com',
    lastBotMessage:
      "We have flexible packages starting at $1,500/mo. Want me to send over a few options?",
  },
} satisfies TemplateEntry

const main = {
  backgroundColor: '#ffffff',
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
}
const container = { maxWidth: '560px', margin: '0 auto', padding: '32px 24px' }
const h1 = {
  fontSize: '24px',
  fontWeight: '700',
  color: '#0a0a0f',
  margin: '0 0 16px',
  lineHeight: '1.3',
}
const text = {
  fontSize: '15px',
  color: '#475569',
  lineHeight: '1.6',
  margin: '0 0 16px',
}
const quoteBox = {
  backgroundColor: '#f8fafc',
  borderLeft: '3px solid #10b981',
  borderRadius: '4px',
  padding: '14px 18px',
  margin: '20px 0',
}
const quoteLabel = {
  fontSize: '12px',
  color: '#64748b',
  fontWeight: '600',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.5px',
  margin: '0 0 6px',
}
const quoteText = {
  fontSize: '14px',
  color: '#1e293b',
  fontStyle: 'italic',
  margin: 0,
  lineHeight: '1.5',
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
