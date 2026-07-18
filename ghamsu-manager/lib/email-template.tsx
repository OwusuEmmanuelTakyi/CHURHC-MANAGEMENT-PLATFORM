import { Html, Head, Preview, Body, Container, Heading, Hr, Text } from '@react-email/components';
import { render } from '@react-email/render';

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Composer input is plain text; this is the only place it becomes HTML, and it's
// always escaped first — never trust body content as raw markup.
export function textToSimpleHtml(text: string): string {
  return text
    .split(/\n{2,}/)
    .map((para) => `<p style="margin:0 0 12px">${escapeHtml(para).replace(/\n/g, '<br/>')}</p>`)
    .join('');
}

function AnnouncementEmail({ subject, bodyHtml, localName }: { subject: string; bodyHtml: string; localName: string }) {
  return (
    <Html>
      <Head />
      <Preview>{subject}</Preview>
      <Body style={{ backgroundColor: '#F4F6FB', fontFamily: 'Arial, Helvetica, sans-serif', margin: 0, padding: '24px 0' }}>
        <Container style={{ backgroundColor: '#ffffff', borderRadius: 12, padding: 24, maxWidth: 560 }}>
          <Text style={{ color: '#1B3A6B', fontSize: 20, fontWeight: 700, margin: '0 0 4px' }}>GHAMSU Manager</Text>
          <Heading as="h2" style={{ fontSize: 16, color: '#1B2A45', margin: '0 0 16px' }}>{subject}</Heading>
          <div style={{ color: '#1B2A45', fontSize: 14, lineHeight: 1.6 }} dangerouslySetInnerHTML={{ __html: bodyHtml }} />
          <Hr style={{ borderColor: 'rgba(27,58,107,0.15)', margin: '24px 0 12px' }} />
          <Text style={{ color: '#6B7A99', fontSize: 12, margin: 0 }}>Sent by {localName} via GHAMSU Manager</Text>
        </Container>
      </Body>
    </Html>
  );
}

export async function renderAnnouncementEmail(params: { subject: string; bodyHtml: string; localName: string }) {
  const element = <AnnouncementEmail {...params} />;
  const html = await render(element);
  const text = await render(element, { plainText: true });
  return { html, text };
}

function BirthdayEmail({ firstName, localName }: { firstName: string; localName: string }) {
  return (
    <Html>
      <Head />
      <Preview>Happy birthday from {localName}! 🎉</Preview>
      <Body style={{ backgroundColor: '#F4F6FB', fontFamily: 'Arial, Helvetica, sans-serif', margin: 0, padding: '24px 0' }}>
        <Container style={{ backgroundColor: '#ffffff', borderRadius: 12, padding: 32, maxWidth: 480, textAlign: 'center' }}>
          <Text style={{ fontSize: 36, margin: '0 0 8px' }}>🎉🎂🎈</Text>
          <Heading as="h2" style={{ fontSize: 22, color: '#1B3A6B', margin: '0 0 12px' }}>
            Happy birthday, {firstName}!
          </Heading>
          <Text style={{ color: '#1B2A45', fontSize: 14, lineHeight: 1.6, margin: '0 0 16px' }}>
            Everyone at {localName} is wishing you a wonderful day filled with joy and blessings.
            Thank you for being part of our GHAMSU family!
          </Text>
          <Hr style={{ borderColor: 'rgba(27,58,107,0.15)', margin: '20px 0 12px' }} />
          <Text style={{ color: '#6B7A99', fontSize: 12, margin: 0 }}>With love, {localName} · GHAMSU</Text>
        </Container>
      </Body>
    </Html>
  );
}

export async function renderBirthdayEmail(params: { firstName: string; localName: string }) {
  const element = <BirthdayEmail {...params} />;
  const html = await render(element);
  const text = await render(element, { plainText: true });
  return { html, text };
}

export interface WeeklyAnalysisParams {
  localName: string;
  noServiceTaken: boolean;
  serviceDate?: string;
  presentCount?: number;
  previousCount?: number | null;
  eligibleCount?: number;
  percentage?: number;
  wingBreakdown?: { wing_name: string; presentCount: number; eligibleCount: number }[];
  followUpList?: { full_name: string; phone: string }[];
  birthdaysNoEmailCount?: number;
}

function WeeklyAnalysisEmail(props: WeeklyAnalysisParams) {
  const { localName, noServiceTaken } = props;
  const delta = (props.presentCount ?? 0) - (props.previousCount ?? 0);

  return (
    <Html>
      <Head />
      <Preview>
        {noServiceTaken ? `No attendance recorded for ${localName} this Sunday` : `${localName}'s Sunday attendance report`}
      </Preview>
      <Body style={{ backgroundColor: '#F4F6FB', fontFamily: 'Arial, Helvetica, sans-serif', margin: 0, padding: '24px 0' }}>
        <Container style={{ backgroundColor: '#ffffff', borderRadius: 12, padding: 24, maxWidth: 560 }}>
          <Text style={{ color: '#1B3A6B', fontSize: 20, fontWeight: 700, margin: '0 0 4px' }}>GHAMSU Manager</Text>
          <Heading as="h2" style={{ fontSize: 16, color: '#1B2A45', margin: '0 0 16px' }}>
            Weekly attendance report — {localName}
          </Heading>

          {noServiceTaken ? (
            <Text style={{ color: '#1B2A45', fontSize: 14, lineHeight: 1.6 }}>
              No attendance was recorded for {localName} this past Sunday. If a service happened,
              remember to log it in GHAMSU Manager next time.
            </Text>
          ) : (
            <>
              <Text style={{ color: '#1B2A45', fontSize: 14, lineHeight: 1.6, margin: '0 0 4px' }}>
                <strong>{props.presentCount}</strong> of {props.eligibleCount} members present ({props.percentage}%) on {props.serviceDate}.
              </Text>
              {props.previousCount != null && (
                <Text style={{ color: '#6B7A99', fontSize: 13, margin: '0 0 16px' }}>
                  {delta >= 0 ? 'Up' : 'Down'} {Math.abs(delta)} from last week ({props.previousCount}).
                </Text>
              )}

              {props.wingBreakdown && props.wingBreakdown.length > 0 && (
                <>
                  <Text style={{ color: '#1B3A6B', fontSize: 14, fontWeight: 700, margin: '16px 0 6px' }}>By wing</Text>
                  {props.wingBreakdown.map((w) => (
                    <Text key={w.wing_name} style={{ color: '#1B2A45', fontSize: 13, margin: '0 0 4px' }}>
                      {w.wing_name}: {w.presentCount}/{w.eligibleCount}
                    </Text>
                  ))}
                </>
              )}

              {props.followUpList && props.followUpList.length > 0 && (
                <>
                  <Text style={{ color: '#1B3A6B', fontSize: 14, fontWeight: 700, margin: '16px 0 6px' }}>
                    Missing 3+ weeks running — worth a call
                  </Text>
                  {props.followUpList.map((m) => (
                    <Text key={m.phone} style={{ color: '#1B2A45', fontSize: 13, margin: '0 0 4px' }}>
                      {m.full_name} — {m.phone}
                    </Text>
                  ))}
                </>
              )}

              {!!props.birthdaysNoEmailCount && (
                <Text style={{ color: '#1B2A45', fontSize: 13, margin: '16px 0 0' }}>
                  {props.birthdaysNoEmailCount} member(s) had birthdays this week but have no email on file — wish them in person!
                </Text>
              )}
            </>
          )}

          <Hr style={{ borderColor: 'rgba(27,58,107,0.15)', margin: '24px 0 12px' }} />
          <Text style={{ color: '#6B7A99', fontSize: 12, margin: 0 }}>GHAMSU Manager weekly report</Text>
        </Container>
      </Body>
    </Html>
  );
}

export async function renderWeeklyAnalysisEmail(params: WeeklyAnalysisParams) {
  const element = <WeeklyAnalysisEmail {...params} />;
  const html = await render(element);
  const text = await render(element, { plainText: true });
  return { html, text };
}
