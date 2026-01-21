import { useLocation, Navigate, Link } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { CheckCircle2, ArrowLeft, Clock } from 'lucide-react';
import type { Lead } from '@/lib/types';

export default function Submitted() {
  const location = useLocation();
  const lead = location.state?.lead as Lead | undefined;

  if (!lead) {
    return <Navigate to="/" replace />;
  }

  return (
    <Layout>
      <div className="max-w-md animate-fade-in">
        <div className="rounded-lg border border-border bg-card p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-success/10">
              <CheckCircle2 className="h-5 w-5 text-success" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-foreground">Lead Submitted</h1>
              <p className="text-sm text-muted-foreground">Successfully sent to workflow</p>
            </div>
          </div>

          <div className="space-y-3 border-t border-border pt-4">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Name</span>
              <span className="font-medium text-foreground">{lead.name}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Email</span>
              <span className="font-medium text-foreground">{lead.email}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Phone</span>
              <span className="font-medium text-foreground">{lead.phone}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Company</span>
              <span className="font-medium text-foreground">{lead.company}</span>
            </div>
          </div>

          <div className="mt-4 rounded-md bg-secondary p-3">
            <div className="flex items-start gap-2">
              <Clock className="h-4 w-4 text-muted-foreground mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-foreground">Processing Status</p>
                <p className="text-muted-foreground mt-0.5">
                  Your lead has been submitted and will be processed immediately by the n8n workflow. 
                  It will be added to Google Sheets, ClickUp, and Airtable.
                </p>
              </div>
            </div>
          </div>

          <Link to="/">
            <Button variant="outline" className="w-full mt-4">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Submit Another Lead
            </Button>
          </Link>
        </div>
      </div>
    </Layout>
  );
}
