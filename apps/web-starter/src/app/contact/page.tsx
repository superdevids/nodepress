import type { Metadata } from 'next';
import { Container, Heading, Text } from '@nodepressjs/ui';
import { getSiteSettings } from '@/lib/api';
import { ContactForm } from './contact-form';

export const metadata: Metadata = {
  title: 'Contact',
  description: 'Get in touch with the NodePress team.',
  openGraph: {
    title: 'Contact — NodePress',
    description: 'Get in touch with the NodePress team.',
  },
};

export default async function ContactPage() {
  const settings = await getSiteSettings();

  return (
    <Container size="md" className="py-12 sm:py-16">
      <div className="mb-12">
        <Heading level={1}>Contact Us</Heading>
        <Text size="lg" color="muted" className="mt-4">
          Have a question, suggestion, or want to collaborate? We&apos;d love to hear from you.
        </Text>
      </div>

      <div className="grid gap-12 lg:grid-cols-2">
        {/* Contact information */}
        <section>
          <Heading level={2}>Get in Touch</Heading>
          <div className="mt-6 space-y-6">
            <div className="flex items-start gap-4">
              <div className="bg-wp-primary/10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full">
                <svg
                  className="text-wp-primary h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75"
                  />
                </svg>
              </div>
              <div>
                <h3 className="text-wp-text font-medium">Email</h3>
                <Text size="sm" color="muted" className="mt-1">
                  {settings?.adminEmail ? (settings.adminEmail as string) : 'admin@nodepress.local'}
                </Text>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="bg-wp-primary/10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full">
                <svg
                  className="text-wp-primary h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418"
                  />
                </svg>
              </div>
              <div>
                <h3 className="text-wp-text font-medium">Website</h3>
                <Text size="sm" color="muted" className="mt-1">
                  {settings?.siteUrl ? (settings.siteUrl as string) : 'http://localhost:3000'}
                </Text>
              </div>
            </div>
          </div>
        </section>

        {/* Contact form */}
        <section>
          <Heading level={2}>Send a Message</Heading>
          <div className="mt-6">
            <ContactForm />
          </div>
        </section>
      </div>
    </Container>
  );
}
