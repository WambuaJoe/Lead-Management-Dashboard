import { useState, useEffect, useRef } from 'react';
import { Layout } from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { getConfig } from '@/lib/config';
import type { Lead } from '@/lib/types';
import { 
  authenticate, 
  isSessionValid, 
  isLockedOut, 
  getLockoutRemaining,
  clearSession
} from '@/lib/auth';
import { createSecureHeaders } from '@/lib/security';
import { 
  Lock, 
  RefreshCw, 
  AlertCircle, 
  User, 
  Mail, 
  Phone, 
  Building2,
  Clock,
  Settings
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { parse } from 'date-fns';

export default function Admin() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [lockoutRemaining, setLockoutRemaining] = useState(0);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const renderSeq = useRef(0);

  // Check if already authenticated
  useEffect(() => {
    if (isSessionValid()) {
      setIsAuthenticated(true);
    }
  }, []);

  useEffect(() => {
    renderSeq.current += 1;
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/29afa269-bf7e-4587-af1a-17a39226d2f4',{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({
        sessionId:'debug-session',
        runId:'run2',
        hypothesisId:'UI1',
        location:'Admin.tsx:render',
        message:'render snapshot',
        data:{
          renderSeq: renderSeq.current,
          isLoading,
          leadsCount: leads.length,
          showSkeleton: Boolean(isLoading && leads.length === 0),
          showTable: Boolean(leads.length > 0)
        },
        timestamp:Date.now()
      })
    }).catch(()=>{});
    // #endregion
  }, [isLoading, leads.length]);

  // Check lockout status
  useEffect(() => {
    if (isLockedOut()) {
      const remaining = getLockoutRemaining();
      setLockoutRemaining(remaining);
      const interval = setInterval(() => {
        const newRemaining = getLockoutRemaining();
        setLockoutRemaining(newRemaining);
        if (newRemaining === 0) {
          clearInterval(interval);
        }
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [authError]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const config = getConfig();
    
    if (!config.adminPassword) {
      setAuthError('Admin password not configured. Please set it in Settings.');
      return;
    }

    setIsLoggingIn(true);
    setAuthError('');

    try {
      const result = await authenticate(password, config.adminPassword);
      
      if (result.success) {
      setIsAuthenticated(true);
      setAuthError('');
        setPassword('');
    } else {
        setAuthError(result.error || 'Authentication failed');
        if (result.lockoutRemaining) {
          setLockoutRemaining(result.lockoutRemaining);
        }
      }
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : 'Authentication failed');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const fetchLeads = async () => {
    const config = getConfig();
    
    if (!config.readWebhookUrl) {
      setFetchError('Read webhook URL not configured. Please configure it in Settings.');
      return;
    }

    setIsLoading(true);
    setFetchError(null);

    try {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/29afa269-bf7e-4587-af1a-17a39226d2f4',{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({
          sessionId:'debug-session',
          runId:'run1',
          hypothesisId:'H1',
          location:'Admin.tsx:fetchLeads',
          message:'fetch start',
          data:{ url: config.readWebhookUrl },
          timestamp:Date.now()
        })
      }).catch(()=>{});
      // #endregion

      const response = await fetch(config.readWebhookUrl, {
        method: 'GET',
        headers: createSecureHeaders(true), // true = is GET request
        credentials: 'omit',
        mode: 'cors', // Explicitly request CORS
      });
      
      // Check if response is OK
      if (!response.ok) {
        // Try to get error message from response
        const contentType = response.headers.get('content-type') || '';
        let errorMessage = `Webhook returned ${response.status}`;
        
        try {
          if (contentType.includes('application/json')) {
            const errorData = await response.json();
            errorMessage = errorData.message || errorMessage;
          } else {
            const errorText = await response.text();
            // Check if it's an HTML error page
            if (errorText.trim().startsWith('<!DOCTYPE') || errorText.trim().startsWith('<html')) {
              errorMessage = `Server returned HTML error page (status ${response.status}). This is usually a CORS issue. Please configure CORS in n8n to allow requests from this domain.`;
            } else {
              errorMessage = `${errorMessage}: ${errorText.substring(0, 100)}`;
            }
          }
        } catch {
          // If we can't parse the error, just use the status
        }
        
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/29afa269-bf7e-4587-af1a-17a39226d2f4',{
          method:'POST',
          headers:{'Content-Type':'application/json'},
          body:JSON.stringify({
            sessionId:'debug-session',
            runId:'run1',
            hypothesisId:'H2',
            location:'Admin.tsx:fetchLeads',
            message:'non-200 response',
            data:{ status: response.status, contentType },
            timestamp:Date.now()
          })
        }).catch(()=>{});
        // #endregion

        throw new Error(errorMessage);
      }

      // Get response as text first to check if it's actually JSON
      // Some servers don't set content-type correctly
      const responseText = await response.text();
      const contentType = response.headers.get('content-type') || '';
      
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/29afa269-bf7e-4587-af1a-17a39226d2f4',{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({
          sessionId:'debug-session',
          runId:'run1',
          hypothesisId:'H3',
          location:'Admin.tsx:fetchLeads',
          message:'response received',
          data:{ contentType, sample: responseText.substring(0,120) },
          timestamp:Date.now()
        })
      }).catch(()=>{});
      // #endregion

      // Check if response looks like HTML (common for CORS errors)
      if (responseText.trim().startsWith('<!DOCTYPE') || responseText.trim().startsWith('<html')) {
        throw new Error(
          `The webhook returned HTML instead of JSON. This usually indicates a CORS (Cross-Origin Resource Sharing) issue.\n\n` +
          `To fix this:\n` +
          `1. In n8n, go to Settings → Security\n` +
          `2. Add your frontend domain to "CORS Allowed Origins"\n` +
          `3. Or set environment variable: N8N_CORS_ORIGIN=https://your-domain.com\n\n` +
          `If using n8n Cloud, configure CORS in the webhook settings.\n\n` +
          `Response preview: ${responseText.substring(0, 200)}...`
        );
      }

      // Try to parse as JSON even if content-type is wrong
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (parseError) {
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/29afa269-bf7e-4587-af1a-17a39226d2f4',{
          method:'POST',
          headers:{'Content-Type':'application/json'},
          body:JSON.stringify({
            sessionId:'debug-session',
            runId:'run1',
            hypothesisId:'H4',
            location:'Admin.tsx:fetchLeads',
            message:'json parse failed',
            data:{ contentType, sample: responseText.substring(0,120) },
            timestamp:Date.now()
          })
        }).catch(()=>{});
        // #endregion

        // If it's not JSON and not HTML, it's something else
        throw new Error(
          `Invalid response format. Expected JSON but received ${contentType || 'unknown'}.\n\n` +
          `Response preview: ${responseText.substring(0, 200)}...\n\n` +
          `Please verify:\n` +
          `1. The webhook URL is correct\n` +
          `2. The n8n workflow is active\n` +
          `3. The webhook returns JSON, not HTML`
        );
      }
      
      // Handle both array response and wrapped response
      // Based on your n8n workflow, it returns { success: true, leads: [...], ... }
      let leadsData: Lead[] = [];
      
      if (Array.isArray(data)) {
        leadsData = data;
      } else if (data.leads && Array.isArray(data.leads)) {
        leadsData = data.leads;
      } else if (data.success && data.leads) {
        leadsData = data.leads;
      } else {
        // If structure is unexpected, log it but don't crash
        console.warn('Unexpected response structure:', data);
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/29afa269-bf7e-4587-af1a-17a39226d2f4',{
          method:'POST',
          headers:{'Content-Type':'application/json'},
          body:JSON.stringify({
            sessionId:'debug-session',
            runId:'run1',
            hypothesisId:'H5',
            location:'Admin.tsx:fetchLeads',
            message:'unexpected structure',
            data:{ keys: Object.keys(data || {}) },
            timestamp:Date.now()
          })
        }).catch(()=>{});
        // #endregion

        leadsData = [];
      }
      
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/29afa269-bf7e-4587-af1a-17a39226d2f4',{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({
          sessionId:'debug-session',
          runId:'run1',
          hypothesisId:'H6',
          location:'Admin.tsx:fetchLeads',
          message:'leads parsed',
          data:{ count: leadsData.length },
          timestamp:Date.now()
        })
      }).catch(()=>{});
      // #endregion

      const normalizeDate = (raw: string | number | undefined | null) => {
        if (!raw) return '';
        const asString = String(raw);
        const native = Date.parse(asString);
        if (!Number.isNaN(native)) return new Date(native).toISOString();
        const parsed = parse(asString, 'dd-MM-yyyy HH:mm:ss', new Date());
        if (!Number.isNaN(parsed.getTime())) return parsed.toISOString();
        return '';
      };

      const normalizeStatus = (raw: string | undefined | null) => {
        const s = (raw || '').toString().toLowerCase();
        if (s.includes('fail')) return 'failed';
        if (s.includes('process') || s.includes('complete') || s === 'yes') return 'completed';
        if (s.includes('pending') || s.includes('queue')) return 'pending';
        return 'processing';
      };

      const normalizedLeads = leadsData.map((lead: any, idx) => {
        const name = lead.Name ?? lead.name ?? '';
        const email = lead.Email ?? lead.email ?? '';
        const phone = lead.Phone ?? lead.phone ?? '';
        const company = lead.Company ?? lead.company ?? '';
        const rawDate = lead.SubmittedAt ?? lead.submittedAt ?? lead.submitted_at ?? lead.createdAt ?? lead.ProcessedDate;
        const submittedAt = normalizeDate(rawDate) || new Date().toISOString();
        const status = normalizeStatus(lead.Status ?? lead.status ?? lead.Processed);
        const id = lead.LeadId ?? lead.id ?? lead.row_number ?? idx;
        return {
          id: String(id),
          name,
          email,
          phone: String(phone),
          company,
          submittedAt,
          status: status as Lead['status'],
        };
      });

      setLeads(normalizedLeads);
    } catch (err) {
      let errorMessage = 'Failed to fetch leads';
      
      if (err instanceof Error) {
        // Check for common error patterns
        if (err.message.includes('Unexpected token') || err.message.includes('<!DOCTYPE')) {
          errorMessage = 
            'The webhook returned HTML instead of JSON. This usually means:\n' +
            '1. The webhook URL is incorrect\n' +
            '2. The webhook is not active in n8n\n' +
            '3. There is a CORS or authentication issue\n\n' +
            'Please verify the webhook URL in Settings and ensure the n8n workflow is active.';
        } else if (err.message.includes('Failed to fetch') || err.message.includes('NetworkError')) {
          errorMessage = 
            'Network error: Could not reach the webhook. Please check:\n' +
            '1. The webhook URL is correct\n' +
            '2. The n8n server is accessible\n' +
            '3. There are no CORS restrictions';
        } else {
          errorMessage = err.message;
        }
      }
      
      setFetchError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = (status: Lead['status']) => {
    switch (status) {
      case 'completed':
        return 'bg-success/10 text-success';
      case 'processing':
        return 'bg-warning/10 text-warning';
      case 'failed':
        return 'bg-destructive/10 text-destructive';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  if (!isAuthenticated) {
    return (
      <Layout>
        <div className="max-w-sm mx-auto animate-fade-in">
          <div className="rounded-lg border border-border bg-card p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary">
                <Lock className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <h1 className="text-lg font-semibold text-foreground">Admin Access</h1>
                <p className="text-sm text-muted-foreground">Enter password to continue</p>
              </div>
            </div>

            {isLockedOut() && lockoutRemaining > 0 && (
              <div className="rounded-md bg-warning/10 border border-warning/20 p-3 mb-4">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-warning mt-0.5 shrink-0" />
                  <div className="text-sm text-warning">
                    <p className="font-medium">Account Locked</p>
                    <p className="text-xs mt-0.5">
                      Too many failed attempts. Try again in {Math.ceil(lockoutRemaining / 60)} minute{Math.ceil(lockoutRemaining / 60) !== 1 ? 's' : ''}.
                    </p>
                  </div>
                </div>
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter admin password"
                  disabled={isLockedOut() || isLoggingIn}
                  className={authError ? 'border-destructive' : ''}
                />
                {authError && (
                  <p className="text-sm text-destructive flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {authError}
                  </p>
                )}
              </div>
              <Button 
                type="submit" 
                className="w-full" 
                disabled={isLockedOut() || isLoggingIn}
              >
                {isLoggingIn ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Authenticating...
                  </>
                ) : (
                  <>
                    <Lock className="mr-2 h-4 w-4" />
                Unlock
                  </>
                )}
              </Button>
            </form>
          </div>
        </div>
      </Layout>
    );
  }

  const config = getConfig();
  const isReadConfigured = Boolean(config.readWebhookUrl);

  return (
    <Layout>
      <div className="animate-fade-in">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-semibold text-foreground">Submitted Leads</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              View recently submitted leads from the n8n workflow.
            </p>
          </div>
          <Button 
            onClick={fetchLeads} 
            disabled={isLoading || !isReadConfigured}
            variant="outline"
          >
            <RefreshCw className={cn("mr-2 h-4 w-4", isLoading && "animate-spin")} />
            {isLoading ? 'Loading...' : 'Refresh'}
          </Button>
        </div>

        {!isReadConfigured && (
          <div className="rounded-lg border border-border bg-card p-6 mb-6">
            <div className="flex items-start gap-3">
              <Settings className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <h3 className="font-medium text-foreground">Read Webhook Not Configured</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Configure the read webhook URL in Settings to fetch leads from n8n.
                </p>
                <Link to="/settings">
                  <Button className="mt-4" size="sm">
                    Go to Settings
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        )}

        {fetchError && (
          <div className="rounded-md bg-destructive/10 border border-destructive/20 p-4 text-sm text-destructive mb-6">
            <div className="flex items-start gap-2">
            <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
              <div className="flex-1">
                <p className="font-medium mb-1">Error Fetching Leads</p>
                <pre className="text-xs whitespace-pre-wrap font-sans">{fetchError}</pre>
                <div className="mt-3 pt-3 border-t border-destructive/20">
                  <p className="text-xs font-medium mb-1">Troubleshooting:</p>
                  <ul className="text-xs list-disc list-inside space-y-1 opacity-90">
                    <li>Verify the webhook URL is correct in Settings</li>
                    <li>Ensure the n8n workflow is active and the webhook is enabled</li>
                    <li>Check that the webhook path matches: <code className="bg-destructive/20 px-1 rounded">/webhook/list-leads</code></li>
                    <li>Verify CORS is configured in n8n to allow requests from this domain</li>
                    <li>Check the n8n execution logs for errors</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}

        {isLoading && leads.length === 0 && (
          <div className="rounded-lg border border-border bg-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-secondary/50">
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4" />
                        Name
                      </div>
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4" />
                        Email
                      </div>
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4" />
                        Phone
                      </div>
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4" />
                        Company
                      </div>
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        Submitted
                      </div>
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {[...Array(5)].map((_, index) => (
                    <tr key={index} className="border-b border-border last:border-0">
                      <td className="px-4 py-3"><Skeleton className="h-4 w-24" /></td>
                      <td className="px-4 py-3"><Skeleton className="h-4 w-32" /></td>
                      <td className="px-4 py-3"><Skeleton className="h-4 w-28" /></td>
                      <td className="px-4 py-3"><Skeleton className="h-4 w-20" /></td>
                      <td className="px-4 py-3"><Skeleton className="h-4 w-20" /></td>
                      <td className="px-4 py-3"><Skeleton className="h-5 w-16 rounded-full" /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {leads.length === 0 && !fetchError && !isLoading && isReadConfigured && (
          <div className="rounded-lg border border-dashed border-border bg-card/50 p-8 text-center">
            <p className="text-sm text-muted-foreground">
              No leads loaded. Click "Refresh" to fetch leads from the workflow.
            </p>
          </div>
        )}

        {leads.length > 0 && (
          <div className="rounded-lg border border-border bg-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-secondary/50">
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4" />
                        Name
                      </div>
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4" />
                        Email
                      </div>
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4" />
                        Phone
                      </div>
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4" />
                        Company
                      </div>
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        Submitted
                      </div>
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {leads.map((lead, index) => (
                    <tr 
                      key={lead.id || index} 
                      className="border-b border-border last:border-0 hover:bg-secondary/30 transition-colors"
                    >
                      <td className="px-4 py-3 font-medium text-foreground">{lead.name}</td>
                      <td className="px-4 py-3 text-muted-foreground">{lead.email}</td>
                      <td className="px-4 py-3 text-muted-foreground">{lead.phone}</td>
                      <td className="px-4 py-3 text-muted-foreground">{lead.company}</td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {new Date(lead.submittedAt).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3">
                        <span className={cn(
                          "inline-flex px-2 py-0.5 rounded-full text-xs font-medium capitalize",
                          getStatusColor(lead.status)
                        )}>
                          {lead.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
