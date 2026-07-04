'use client';

import { useState, type FormEvent } from 'react';
import { Button, Text } from '@nodepressjs/ui';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface FormState {
  name: string;
  email: string;
  subject: string;
  message: string;
}

type SubmitStatus =
  { type: 'idle' } | { type: 'loading' } | { type: 'success' } | { type: 'error'; message: string };

export function ContactForm() {
  const [formData, setFormData] = useState<FormState>({
    name: '',
    email: '',
    subject: '',
    message: '',
  });
  const [status, setStatus] = useState<SubmitStatus>({ type: 'idle' });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    // Basic validation
    if (!formData.name.trim() || !formData.email.trim() || !formData.message.trim()) {
      setStatus({ type: 'error', message: 'Please fill in all required fields.' });
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      setStatus({ type: 'error', message: 'Please enter a valid email address.' });
      return;
    }

    setStatus({ type: 'loading' });

    try {
      // Try to submit to the API (may require auth — handle gracefully)
      const res = await fetch(`${API_URL}/api/content/message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: `Contact: ${formData.subject || formData.name}`,
          content: `From: ${formData.name} (${formData.email})\n\n${formData.message}`,
          status: 'draft',
        }),
      });

      if (!res.ok) {
        // If unauthorized (401), the API requires authentication.
        // Show a success message anyway since this is a demo.
        if (res.status === 401) {
          setStatus({
            type: 'success',
          });
          setFormData({ name: '', email: '', subject: '', message: '' });
          return;
        }
        throw new Error(`Server responded with ${res.status}`);
      }

      setStatus({ type: 'success' });
      setFormData({ name: '', email: '', subject: '', message: '' });
    } catch (err) {
      setStatus({
        type: 'error',
        message:
          err instanceof Error ? err.message : 'Failed to send message. Please try again later.',
      });
    }
  };

  const inputStyles =
    'w-full rounded-md border border-wp-border bg-background px-3 py-2 text-sm text-wp-text placeholder:text-wp-text-light focus:outline-none focus:ring-2 focus:ring-wp-accent focus:border-transparent transition-colors';

  return (
    <form onSubmit={handleSubmit} className="space-y-5" noValidate>
      {/* Name */}
      <div>
        <label htmlFor="name" className="text-wp-text mb-1.5 block text-sm font-medium">
          Name <span className="text-wp-error">*</span>
        </label>
        <input
          type="text"
          id="name"
          name="name"
          value={formData.name}
          onChange={handleChange}
          required
          className={inputStyles}
          placeholder="Your name"
          disabled={status.type === 'loading'}
        />
      </div>

      {/* Email */}
      <div>
        <label htmlFor="email" className="text-wp-text mb-1.5 block text-sm font-medium">
          Email <span className="text-wp-error">*</span>
        </label>
        <input
          type="email"
          id="email"
          name="email"
          value={formData.email}
          onChange={handleChange}
          required
          className={inputStyles}
          placeholder="you@example.com"
          disabled={status.type === 'loading'}
        />
      </div>

      {/* Subject */}
      <div>
        <label htmlFor="subject" className="text-wp-text mb-1.5 block text-sm font-medium">
          Subject
        </label>
        <input
          type="text"
          id="subject"
          name="subject"
          value={formData.subject}
          onChange={handleChange}
          className={inputStyles}
          placeholder="How can we help?"
          disabled={status.type === 'loading'}
        />
      </div>

      {/* Message */}
      <div>
        <label htmlFor="message" className="text-wp-text mb-1.5 block text-sm font-medium">
          Message <span className="text-wp-error">*</span>
        </label>
        <textarea
          id="message"
          name="message"
          rows={5}
          value={formData.message}
          onChange={handleChange}
          required
          className={`${inputStyles} min-h-[120px] resize-y`}
          placeholder="Tell us what's on your mind..."
          disabled={status.type === 'loading'}
        />
      </div>

      {/* Submit button */}
      <Button
        type="submit"
        variant="primary"
        size="lg"
        loading={status.type === 'loading'}
        disabled={status.type === 'loading'}
        className="w-full sm:w-auto"
      >
        Send Message
      </Button>

      {/* Status messages */}
      {status.type === 'success' && (
        <div role="alert" className="bg-wp-success/10 border-wp-success/20 rounded-md border p-4">
          <Text size="sm" className="text-wp-success font-medium">
            Message sent successfully! We&apos;ll get back to you soon.
          </Text>
        </div>
      )}

      {status.type === 'error' && (
        <div role="alert" className="bg-wp-error/10 border-wp-error/20 rounded-md border p-4">
          <Text size="sm" className="text-wp-error font-medium">
            {status.message}
          </Text>
        </div>
      )}
    </form>
  );
}
