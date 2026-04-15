/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Text,
} from 'npm:@react-email/components@0.0.22'

interface ReauthenticationEmailProps {
  token: string
}

export const ReauthenticationEmail = ({ token }: ReauthenticationEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Your verification code</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Confirm reauthentication</Heading>
        <Text style={text}>Use the code below to confirm your identity:</Text>
        <Text style={codeStyle}>{token}</Text>
        <Text style={footer}>
          This code will expire shortly. If you didn't request this, you can
          safely ignore this email.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default ReauthenticationEmail

const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, sans-serif' }
const container = {
  maxWidth: '560px',
  margin: '0 auto',
  padding: '40px 32px',
  backgroundColor: '#ffffff',
  borderTop: '4px solid #33ccff',
}
const h1 = {
  fontSize: '24px',
  fontWeight: 'bold' as const,
  color: '#0a0b14',
  margin: '0 0 20px',
  fontFamily: 'Georgia, serif',
}
const text = {
  fontSize: '15px',
  color: '#444444',
  lineHeight: '1.6',
  margin: '0 0 20px',
}
const codeStyle = {
  fontFamily: 'Courier, monospace',
  fontSize: '28px',
  fontWeight: 'bold' as const,
  color: '#33ccff',
  letterSpacing: '6px',
  margin: '0 0 30px',
}
const footer = { fontSize: '12px', color: '#999999', margin: '32px 0 0' }
