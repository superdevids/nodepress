'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ContentEditor } from '@/components/content/content-editor';

export default function NewPostPage() {
  const router = useRouter();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Loader2 className="text-muted-foreground h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-0">
      {/* Back button */}
      <div className="mb-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push('/admin/content')}
          className="text-[#50575e] hover:text-[#1d2327]"
        >
          <ArrowLeft className="mr-1.5 h-4 w-4" />
          Back to Posts
        </Button>
      </div>

      {/* Editor component */}
      <ContentEditor contentType="post" />
    </div>
  );
}
