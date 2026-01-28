'use client';

import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import AnimatedBackground from '@/components/ui/AnimatedBackground';

export default function PrivacyPolicyPage() {
  return (
    <div style={{ minHeight: '100vh', background: '#0A0A0B', color: '#FFFFFF' }}>
      <AnimatedBackground />
      <Navbar />

      {/* Content */}
      <main style={{ 
        paddingTop: '120px', 
        paddingBottom: '80px',
        paddingLeft: '2rem',
        paddingRight: '2rem',
        position: 'relative',
        zIndex: 1,
      }}>
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <h1 style={{ 
            fontSize: '2.5rem', 
            fontWeight: 700, 
            marginBottom: '2rem',
            background: 'linear-gradient(135deg, #FFFFFF 0%, #00F5FF 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}>
            Privacy Policy
          </h1>

          <div style={{ 
            background: 'rgba(255,255,255,0.02)', 
            borderRadius: '16px', 
            padding: '2rem',
            border: '1px solid rgba(255,255,255,0.05)',
          }}>
            <p style={{ color: 'rgba(255,255,255,0.7)', lineHeight: 1.8, marginBottom: '2rem' }}>
              This Privacy Policy describes how your personal information is collected, used, and shared when you visit or make a purchase from FibAlgo.com (the &quot;Site&quot;).
            </p>

            <Section title="Personal Information We Collect">
              <p>
                When you visit the Site, we automatically collect certain information about your device, including information about your web browser, IP address, time zone, and some of the cookies that are installed on your device. Additionally, as you browse the Site, we collect information about the individual web pages or products that you view, what websites or search terms referred you to the Site, and information about how you interact with the Site. We refer to this automatically-collected information as &quot;Device Information&quot;.
              </p>
            </Section>

            <Section title="We Collect Device Information Using the Following Technologies">
              <ul style={{ paddingLeft: '1.5rem', marginBottom: '1rem' }}>
                <li style={{ marginBottom: '0.75rem' }}>
                  <strong>&quot;Cookies&quot;</strong> are data files that are placed on your device or computer and often include an anonymous unique identifier. For more information about cookies, and how to disable cookies, visit{' '}
                  <a href="http://www.allaboutcookies.org" target="_blank" rel="noopener noreferrer" style={{ color: '#00F5FF' }}>
                    http://www.allaboutcookies.org
                  </a>.
                </li>
                <li style={{ marginBottom: '0.75rem' }}>
                  <strong>&quot;Log files&quot;</strong> track actions occurring on the Site, and collect data including your IP address, browser type, Internet service provider, referring/exit pages, and date/time stamps.
                </li>
                <li style={{ marginBottom: '0.75rem' }}>
                  <strong>&quot;Web beacons&quot;, &quot;tags&quot;, and &quot;pixels&quot;</strong> are electronic files used to record information about how you browse the Site.
                </li>
              </ul>
              <p>
                Additionally when you make a purchase or attempt to make a purchase through the Site, we collect certain information from you, including your name, payment information (including credit card numbers, email address, and phone number). We refer to this information as &quot;Order Information&quot;.
              </p>
              <p style={{ marginTop: '1rem' }}>
                When we talk about &quot;Personal Information&quot; in this Privacy Policy, we are talking both about Device Information and Order Information.
              </p>
            </Section>

            <Section title="How Do We Use Your Personal Information?">
              <p>We use the Order Information that we collect generally to fulfill any orders placed through the Site.</p>
              <p style={{ marginTop: '1rem' }}>Additionally, we use this Order Information to:</p>
              <ul style={{ paddingLeft: '1.5rem', marginTop: '0.5rem', marginBottom: '1rem' }}>
                <li style={{ marginBottom: '0.5rem' }}>Communicate with you;</li>
                <li style={{ marginBottom: '0.5rem' }}>Screen our orders for potential risk or fraud;</li>
                <li style={{ marginBottom: '0.5rem' }}>When in line with the preferences you have shared with us, provide you with information or advertising relating to our products or services;</li>
                <li style={{ marginBottom: '0.5rem' }}>Display information using third party apps on our website;</li>
                <li style={{ marginBottom: '0.5rem' }}>Set up your accounts with our products.</li>
              </ul>
              <p>
                We use the Device Information that we collect to help us screen for potential risk and fraud (in particular, your IP address), and more generally to improve and optimize our Site (for example, by generating analytics about how our customers browse and interact with the Site, and to assess the success of our marketing and advertising campaigns).
              </p>
            </Section>

            <Section title="Sharing Your Personal Information">
              <p>
                We share your Personal Information with third parties to help us use your Personal Information, as described above.
              </p>
              <p style={{ marginTop: '1rem' }}>
                We also use Google Analytics to help us understand how our customers use the Site — you can read more about how Google uses your Personal Information here:{' '}
                <a href="https://www.google.com/intl/en/policies/privacy" target="_blank" rel="noopener noreferrer" style={{ color: '#00F5FF' }}>
                  https://www.google.com/intl/en/policies/privacy
                </a>. You can also opt-out of Google Analytics here:{' '}
                <a href="https://tools.google.com/dlpage/gaoptout" target="_blank" rel="noopener noreferrer" style={{ color: '#00F5FF' }}>
                  https://tools.google.com/dlpage/gaoptout
                </a>.
              </p>
              <p style={{ marginTop: '1rem' }}>
                Finally, we may also share your Personal Information to comply with applicable laws and regulations, to respond to a subpoena, search warrant or other lawful request for information we receive, or to otherwise protect our rights.
              </p>
            </Section>

            <Section title="Do Not Track">
              <p>
                Please note that we do not alter our Site&apos;s data collection and use practices when we see a Do Not Track signal from your browser.
              </p>
            </Section>

            <Section title="Your Rights">
              <p>
                If you are a European resident, you have the right to access personal information we hold about you and to ask that your personal information be corrected, updated, or deleted. If you would like to exercise this right, please contact us through the contact information below.
              </p>
              <p style={{ marginTop: '1rem' }}>
                Additionally, if you are a European resident we note that we are processing your information in order to fulfill contracts we might have with you (for example if you make an order through the Site), or otherwise to pursue our legitimate business interests listed above.
              </p>
              <p style={{ marginTop: '1rem' }}>
                Additionally, please note that your information will be transferred outside of Europe, including to Canada and the United States.
              </p>
            </Section>

            <Section title="Data Retention">
              <p>
                When you place an order through the Site, we will maintain your Order Information for our records unless and until you ask us to delete this information.
              </p>
            </Section>

            <Section title="Changes">
              <p>
                We may update this privacy policy from time to time in order to reflect, for example, changes to our practices or for other operational, legal or regulatory reasons. The updated version will be indicated by an updated &quot;Revised&quot; date and the updated version will be effective as soon as it is accessible. If we make material changes to this privacy notice, we may notify you either by prominently posting a notice of such changes or by directly sending you a notification. We encourage you to review this privacy notice frequently to be informed of how we are protecting your information.
              </p>
            </Section>

            <Section title="Contact Us">
              <p>
                For more information about our privacy practices, if you have questions, or if you would like to make a complaint, please contact us by email at{' '}
                <a href="mailto:support@fibalgo.com" style={{ color: '#00F5FF' }}>
                  support@fibalgo.com
                </a>
              </p>
            </Section>
          </div>
        </div>
      </main>

      {/* Simple Footer */}
      <Footer />
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: '2rem' }}>
      <h2 style={{ 
        fontSize: '1.25rem', 
        fontWeight: 600, 
        color: '#00F5FF', 
        marginBottom: '1rem',
        paddingBottom: '0.5rem',
        borderBottom: '1px solid rgba(0,245,255,0.2)',
      }}>
        {title}
      </h2>
      <div style={{ color: 'rgba(255,255,255,0.7)', lineHeight: 1.8 }}>
        {children}
      </div>
    </div>
  );
}
