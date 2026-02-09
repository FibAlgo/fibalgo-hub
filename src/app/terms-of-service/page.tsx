import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import AnimatedBackground from '@/components/ui/AnimatedBackground';
import Breadcrumbs from '@/components/seo/Breadcrumbs';

export default function TermsOfServicePage() {
  return (
    <div style={{ minHeight: '100vh', background: '#0A0A0B', color: '#FFFFFF' }}>
      <AnimatedBackground />
      <Navbar />
      <Breadcrumbs items={[{ name: 'Terms of Service', href: '/terms-of-service' }]} />

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
            Terms of Service
          </h1>

          <div style={{ 
            background: 'rgba(255,255,255,0.02)', 
            borderRadius: '16px', 
            padding: '2rem',
            border: '1px solid rgba(255,255,255,0.05)',
          }}>
            <Section title="Overview">
              <p>
                This website is operated by MAC FINANCE SOFTWARE TECHNOLOGIES, LTD, doing business as FibAlgo. Throughout the site, the terms &quot;we&quot;, &quot;us&quot; and &quot;our&quot; refer to FibAlgo. FibAlgo offers this website, including all information, tools and services available from this site to you, the user, conditioned upon your acceptance of all terms, conditions, policies and notices stated here.
              </p>
              <p style={{ marginTop: '1rem' }}>
                By visiting our site and/or purchasing something from us, you are participating in our &quot;Service&quot; and agree to be bound by the following terms and conditions (&quot;Terms of Service&quot;, &quot;Terms&quot;), including any additional terms and conditions and policies referenced herein and/or available via hyperlink. These Terms of Service apply to all users of the site, including but not limited to browsers, vendors, customers, merchants and/or content contributors.
              </p>
              <p style={{ marginTop: '1rem' }}>
                Please read these Terms of Service carefully before accessing or using our website. By accessing or using any part of the site, you agree to be bound by these Terms of Service. If you do not agree to all the terms and conditions of this agreement, you may not access the website or use any services.
              </p>
            </Section>

            <Section title="Online Store Terms">
              <p>
                By agreeing to these Terms of Service, you represent that you are at least the age of majority in your state or province of residence, or that you are the age of majority in your state or province of residence and you have given us your consent to allow any of your minor dependents to use this site.
              </p>
              <p style={{ marginTop: '1rem' }}>
                You may not use our products for any illegal or unauthorized purpose nor may you, in the use of the Service, violate any laws in your jurisdiction (including but not limited to copyright laws).
              </p>
              <p style={{ marginTop: '1rem' }}>
                You must not transmit any worms or viruses or any code of a destructive nature.
              </p>
              <p style={{ marginTop: '1rem' }}>
                A breach or violation of any of the Terms will result in an immediate termination of your Services.
              </p>
            </Section>

            <Section title="General Conditions">
              <p>
                We reserve the right to refuse service to anyone for any reason at any time.
              </p>
              <p style={{ marginTop: '1rem' }}>
                You understand that your content (not including credit card information), may be transferred unencrypted and involve (a) transmissions over various networks; and (b) changes to conform and adapt to technical requirements of connecting networks or devices. Credit card information is always encrypted during transfer over networks.
              </p>
              <p style={{ marginTop: '1rem' }}>
                You agree not to reproduce, duplicate, copy, sell, resell or exploit any portion of the Service, use of the Service, or access to the Service or any contact on the website through which the service is provided, without express written permission by us.
              </p>
            </Section>

            <Section title="Risk Disclaimer">
              <p>
                Trading is risky &amp; most day traders lose money. All content is to be considered hypothetical, selected after the fact, in order to demonstrate our product and should not be construed as financial advice. Decisions to buy, sell, hold or trade in securities, commodities and other investments involve risk and are best made based on the advice of qualified financial professionals. Past performance does not guarantee future results.
              </p>
              <p style={{ marginTop: '1rem' }}>
                The risk of loss in trading can be substantial. You should therefore carefully consider whether such trading is suitable for you in light of your financial condition.
              </p>
            </Section>

            <Section title="Hypothetical and Simulated Performance Disclaimer">
              <p>
                Hypothetical or Simulated performance results have certain limitations, unlike an actual performance record, simulated results do not represent actual trading. Also, since the trades have not been executed, the results may have under-or-over compensated for the impact, if any, of certain market factors, such as lack of liquidity. Simulated trading programs in general are also subject to the fact that they are designed with the benefit of hindsight. No representation is being made that any account will or is likely to achieve profit or losses similar to those shown.
              </p>
            </Section>

            <Section title="Testimonials Disclaimer">
              <p>
                Testimonials appearing on this website may not be representative of other clients or customers and is not a guarantee of future performance or success. Any trading results depicted in testimonials are not verified and we have no basis for believing that individual experiences depicted are typical considering that results will vary given many factors such as skill, risk management, experience, and the fact that trading itself is a very high-risk activity where it is easy to lose money.
              </p>
            </Section>

            <Section title="Information and Educational Purposes Only">
              <p>
                FibAlgo and the tools provided DO NOT offer or provide personalized investment advice. The tools, browsers, data, content and information provided are not personal and are not customized to meet the investment needs of any individual. Therefore, the tools, browsers, data, content and information are for informational and educational purposes only.
              </p>
              <p style={{ marginTop: '1rem' }}>
                YOU SHOULD NOT RELY ON THE TOOLS, SCANNERS OR THE DATA, CONTENT AND INFORMATION IN THEM AS THE SOLE BASIS FOR AN INVESTMENT DECISION OR TRANSACTION. If you choose to rely on our tools, scanners or such data, content or information, you do so at your own risk and you fully acknowledge, understand and agree that you are solely responsible for your investment research and decisions.
              </p>
            </Section>

            <Section title="TradingView Disclosure">
              <p>
                The charts used on this site are prepared by TradingView, on which our tools are built.
              </p>
              <p style={{ marginTop: '1rem' }}>
                TradingView® is a registered trademark of TradingView, Inc.{' '}
                <a href="http://www.tradingview.com" target="_blank" rel="noopener noreferrer" style={{ color: '#00F5FF' }}>
                  www.TradingView.com
                </a>. TradingView has no affiliation with the owner, developer or provider of the products or services described herein, or has any interest, proprietary or otherwise, in any such product or service, nor does it endorse or recommend any such product or service.
              </p>
            </Section>

            <Section title="Refunds">
              <p>
                We allow refunds within a 3-day period if you are not satisfied or do not understand our services, which means you have 3 days after you sign up to any FibAlgo subscription plan to receive a refund.
              </p>
              <p style={{ marginTop: '1rem' }}>
                To get a refund, you can contact us at{' '}
                <a href="mailto:support@fibalgo.com" style={{ color: '#00F5FF' }}>
                  support@fibalgo.com
                </a>{' '}
                and we will assist you within 12 hours. Refunds generally take 5-7 business days to arrive in your bank account.
              </p>
              <p style={{ marginTop: '1rem' }}>
                We allow refunds specifically for yearly subscription auto-renewals within the first 72 hours of billing, however, we are not required to process a refund under any other circumstance after 30 days including the case you forgot about auto-renewal of your subscription.
              </p>
              <p style={{ marginTop: '1rem' }}>
                We send reminders prior to each billing cycle within the first 30 days, and it is your sole responsibility to manage your subscription prior to renewals by logging in or emailing{' '}
                <a href="mailto:support@fibalgo.com" style={{ color: '#00F5FF' }}>
                  support@fibalgo.com
                </a>.
              </p>
              <p style={{ marginTop: '1rem' }}>
                We do not accept refunds when paying with crypto due to potential transaction fees &amp; other complications.
              </p>
            </Section>

            <Section title="Product / Service">
              <p>
                Certain products or services may be available exclusively online through the website. We do not warrant that the quality of any products, services, information, or other material purchased or obtained by you will meet your expectations, or that any errors in the Service will be corrected. Imitations of our product are not allowed, you agree that we have the right at anytime to remove your access and ban you from our server if suspected of imitating in any form.
              </p>
            </Section>

            <Section title="Prohibited Uses">
              <p>
                In addition to other prohibitions as set forth in the Terms of Service, you are prohibited from using the site or its content:
              </p>
              <ul style={{ paddingLeft: '1.5rem', marginTop: '0.5rem', marginBottom: '1rem' }}>
                <li style={{ marginBottom: '0.5rem' }}>For any unlawful purpose</li>
                <li style={{ marginBottom: '0.5rem' }}>To solicit others to perform or participate in any unlawful acts</li>
                <li style={{ marginBottom: '0.5rem' }}>To violate any international, federal, provincial or state regulations, rules, laws, or local ordinances</li>
                <li style={{ marginBottom: '0.5rem' }}>To infringe upon or violate our intellectual property rights or the intellectual property rights of others</li>
                <li style={{ marginBottom: '0.5rem' }}>To harass, abuse, insult, harm, defame, slander, disparage, intimidate, or discriminate</li>
                <li style={{ marginBottom: '0.5rem' }}>To submit false or misleading information</li>
                <li style={{ marginBottom: '0.5rem' }}>To upload or transmit viruses or any other type of malicious code</li>
                <li style={{ marginBottom: '0.5rem' }}>To collect or track the personal information of others</li>
                <li style={{ marginBottom: '0.5rem' }}>To spam, phish, pharm, pretext, spider, crawl, or scrape</li>
                <li style={{ marginBottom: '0.5rem' }}>To interfere with or circumvent the security features of the Service</li>
              </ul>
              <p>
                We reserve the right to terminate your use of the Service or any related website for violating any of the prohibited uses.
              </p>
            </Section>

            <Section title="Disclaimer of Warranties; Limitation of Liability">
              <p>
                We do not warrant, represent or undertake that your use of our Service will be uninterrupted, timely, secure or error-free.
              </p>
              <p style={{ marginTop: '1rem' }}>
                We do not guarantee that the results that may be obtained from the use of the Service will be accurate or reliable.
              </p>
              <p style={{ marginTop: '1rem' }}>
                You expressly agree that your use or inability to use the Service is entirely at your own risk. The Service and all products and services made available to you through the Service are provided &apos;as is&apos; and &apos;as available&apos; for your use without any representations, warranties or conditions, express or implied.
              </p>
              <p style={{ marginTop: '1rem' }}>
                In no event shall FibAlgo, our directors, officers, employees, affiliates, agents, contractors, interns, suppliers, service providers or licensors be liable for any direct, indirect, incidental, punitive, special or consequential damages.
              </p>
            </Section>

            <Section title="Changes to Terms of Service">
              <p>
                We reserve the right, at our sole discretion, to update, change or replace any part of these Terms of Service by posting updates and changes to our website. It is your responsibility to check our website periodically for changes. Your continued use of or access to our website or the Service following the posting of any changes to these Terms of Service constitutes acceptance of those changes.
              </p>
            </Section>

            <Section title="Contact Information">
              <p>
                Questions about the Terms of Service should be sent to us at{' '}
                <a href="mailto:support@fibalgo.com" style={{ color: '#00F5FF' }}>
                  support@fibalgo.com
                </a>
              </p>
            </Section>
          </div>
        </div>
      </main>

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
