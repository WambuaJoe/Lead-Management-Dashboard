import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate } from 'react-router-dom';
import { leadSchema, type LeadFormData } from '@/lib/leadSchema';
import { getConfig } from '@/lib/config';
import { createSecureHeaders } from '@/lib/security';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertCircle, Loader2, Send } from 'lucide-react';
import { Link } from 'react-router-dom';

export function LeadForm() {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LeadFormData>({
    resolver: zodResolver(leadSchema),
  });

  const onSubmit = async (data: LeadFormData) => {
    setIsSubmitting(true);
    setError(null);

    const config = getConfig();
    
    if (!config.submitWebhookUrl) {
      setError('Webhook URL not configured. Please configure it in Settings.');
      setIsSubmitting(false);
      return;
    }

    try {
      const payload = {
        ...data,
        submittedAt: new Date().toISOString(),
        status: 'pending',
      };

      const response = await fetch(config.submitWebhookUrl, {
        method: 'POST',
        headers: createSecureHeaders(false), // false = is POST request
        body: JSON.stringify(payload),
        credentials: 'omit', // Don't send cookies to external webhooks
        mode: 'cors', // Explicitly request CORS
      });

      if (!response.ok) {
        throw new Error(`Webhook returned ${response.status}`);
      }

      navigate('/submitted', { state: { lead: payload } });
    } catch (err) {
      setError(
        err instanceof Error 
          ? `Failed to submit lead: ${err.message}` 
          : 'Failed to submit lead. Please try again.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="animate-fade-in">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-foreground">Submit New Lead</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Enter lead information to send to the processing workflow.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 max-w-md">
        <div className="space-y-2">
          <Label htmlFor="name">Name</Label>
          <Input
            id="name"
            placeholder="John Smith"
            {...register('name')}
            className={errors.name ? 'border-destructive' : ''}
          />
          {errors.name && (
            <p className="text-sm text-destructive">{errors.name.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            placeholder="john@company.com"
            {...register('email')}
            className={errors.email ? 'border-destructive' : ''}
          />
          {errors.email && (
            <p className="text-sm text-destructive">{errors.email.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="phone">Phone</Label>
          <Input
            id="phone"
            type="tel"
            placeholder="+1 (555) 123-4567"
            {...register('phone')}
            className={errors.phone ? 'border-destructive' : ''}
          />
          {errors.phone && (
            <p className="text-sm text-destructive">{errors.phone.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="company">Company</Label>
          <Input
            id="company"
            placeholder="Acme Corp"
            {...register('company')}
            className={errors.company ? 'border-destructive' : ''}
          />
          {errors.company && (
            <p className="text-sm text-destructive">{errors.company.message}</p>
          )}
        </div>

        {error && (
          <div className="flex items-start gap-2 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
            <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <Button type="submit" disabled={isSubmitting} className="w-full">
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Submitting...
            </>
          ) : (
            <>
              <Send className="mr-2 h-4 w-4" />
              Submit Lead
            </>
          )}
        </Button>
      </form>
    </div>
  );
}
