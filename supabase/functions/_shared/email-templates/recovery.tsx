/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Img,
  Preview,
  Section,
  Text,
} from 'npm:@react-email/components@0.0.22'

interface RecoveryEmailProps {
  siteName: string
  confirmationUrl: string
}

const LOGO_URL =
  'https://aoiqnrhwndtttlcoiiny.supabase.co/storage/v1/object/public/email-assets/school-logo.png'

export const RecoveryEmail = ({
  siteName,
  confirmationUrl,
}: RecoveryEmailProps) => (
  <Html lang="ar" dir="rtl">
    <Head />
    <Preview>استعادة كلمة المرور - منصة المتميز</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={logoSection}>
          <Img
            src={LOGO_URL}
            alt="منصة المتميز"
            width="84"
            height="84"
            style={logo}
          />
          <Text style={brand}>منصة المتميز الرقمية</Text>
        </Section>

        <Section style={card}>
          <Heading style={h1}>استعادة كلمة المرور</Heading>
          <Text style={text}>أهلاً بك،</Text>
          <Text style={text}>
            لقد تلقينا طلباً لإعادة تعيين كلمة المرور الخاصة بحسابك في منصة
            المتميز. يرجى الضغط على الزر أدناه للمتابعة وتعيين كلمة مرور جديدة.
          </Text>

          <Section style={buttonWrap}>
            <Button style={button} href={confirmationUrl}>
              تعيين كلمة مرور جديدة
            </Button>
          </Section>

          <Text style={hint}>
            صلاحية الرابط محدودة لأسباب أمنية. إذا انتهت الصلاحية، يمكنك طلب
            رابط جديد من صفحة تسجيل الدخول.
          </Text>

          <Hr style={hr} />

          <Text style={footer}>
            إذا لم تطلب إعادة تعيين كلمة المرور، يمكنك تجاهل هذه الرسالة بأمان
            ولن يتم تغيير كلمة المرور الخاصة بك.
          </Text>
        </Section>

        <Text style={brandFooter}>
          © منصة المتميز الرقمية — رسالة آلية، يرجى عدم الرد عليها.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default RecoveryEmail

const main = {
  backgroundColor: '#ffffff',
  fontFamily:
    '"IBM Plex Sans Arabic", "Segoe UI", Tahoma, Arial, sans-serif',
  margin: '0',
  padding: '0',
}
const container = {
  maxWidth: '560px',
  margin: '0 auto',
  padding: '32px 16px',
}
const logoSection = {
  textAlign: 'center' as const,
  marginBottom: '20px',
}
const logo = {
  display: 'block',
  margin: '0 auto 12px',
  borderRadius: '20px',
  border: '1px solid #e6eaf2',
  padding: '8px',
  backgroundColor: '#ffffff',
}
const brand = {
  textAlign: 'center' as const,
  fontSize: '15px',
  fontWeight: 600 as const,
  color: 'hsl(225, 50%, 18%)',
  margin: '0',
}
const card = {
  backgroundColor: '#ffffff',
  border: '1px solid #e6eaf2',
  borderRadius: '20px',
  padding: '32px 28px',
  boxShadow: '0 10px 30px -12px rgba(15, 23, 42, 0.12)',
  textAlign: 'right' as const,
}
const h1 = {
  fontSize: '22px',
  fontWeight: 700 as const,
  color: 'hsl(225, 50%, 10%)',
  margin: '0 0 18px',
  textAlign: 'right' as const,
}
const text = {
  fontSize: '15px',
  color: 'hsl(220, 12%, 30%)',
  lineHeight: '1.85',
  margin: '0 0 12px',
  textAlign: 'right' as const,
}
const buttonWrap = {
  textAlign: 'center' as const,
  margin: '28px 0 18px',
}
const button = {
  background:
    'linear-gradient(135deg, hsl(195, 100%, 42%) 0%, hsl(270, 75%, 55%) 100%)',
  backgroundColor: 'hsl(195, 100%, 42%)',
  color: '#ffffff',
  fontSize: '15px',
  fontWeight: 700 as const,
  borderRadius: '14px',
  padding: '14px 28px',
  textDecoration: 'none',
  display: 'inline-block',
  boxShadow: '0 8px 20px -8px rgba(8, 145, 178, 0.55)',
}
const hint = {
  fontSize: '13px',
  color: 'hsl(220, 12%, 46%)',
  lineHeight: '1.7',
  margin: '8px 0 0',
  textAlign: 'right' as const,
}
const hr = {
  borderColor: '#e6eaf2',
  margin: '24px 0 16px',
}
const footer = {
  fontSize: '12px',
  color: 'hsl(220, 12%, 46%)',
  lineHeight: '1.7',
  margin: '0',
  textAlign: 'right' as const,
}
const brandFooter = {
  textAlign: 'center' as const,
  fontSize: '11px',
  color: 'hsl(220, 12%, 55%)',
  marginTop: '20px',
}
