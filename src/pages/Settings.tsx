import { useState, useEffect } from 'react';
import { Layout } from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { getConfig, saveConfig, type AppConfig } from '@/lib/config';
import { validatePasswordStrength } from '@/lib/passwordValidation';
import { Save, CheckCircle2, Info, AlertTriangle, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function Settings() {
  const initialConfig = getConfig();
  // Check if password is already hashed (64 hex chars = SHA-256)
  const isPasswordHashed = /^[a-f0-9]{64}$/i.test(initialConfig.adminPassword);
  
  const [config, setConfig] = useState<AppConfig>({
    ...initialConfig,
    adminPassword: isPasswordHashed ? '' : initialConfig.adminPassword, // Don't show hashed password
  });
  const [saved, setSaved] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [passwordStrength, setPasswordStrength] = useState<ReturnType<typeof validatePasswordStrength> | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [passwordPlaceholder, setPasswordPlaceholder] = useState(
    isPasswordHashed ? 'Password already set (enter new password to change)' : 'Enter admin password (min 8 characters)'
  );

  useEffect(() => {
    const currentConfig = getConfig();
    const isHashed = /^[a-f0-9]{64}$/i.test(currentConfig.adminPassword);
    setConfig({
      ...currentConfig,
      adminPassword: isHashed ? '' : currentConfig.adminPassword,
    });
    setPasswordPlaceholder(
      isHashed ? 'Password already set (enter new password to change)' : 'Enter admin password (min 8 characters)'
    );
  }, []);

  const validateField = (field: keyof AppConfig, value: string) => {
    try {
      if (field === 'adminPassword') {
        const strength = validatePasswordStrength(value);
        setPasswordStrength(strength);
        if (value === '') {
          setErrors(prev => ({ ...prev, [field]: '' }));
          return true;
        }
        if (!strength.isValid) {
          setErrors(prev => ({ ...prev, [field]: 'Password does not meet requirements' }));
          return false;
        }
        setErrors(prev => ({ ...prev, [field]: '' }));
        return true;
      }
      return true;
    } catch {
      return false;
    }
  };

  const handleSave = async () => {
    // Validate all fields
    // Only validate password if it's being changed (not empty)
    const currentConfig = getConfig();
    const isPasswordHashed = /^[a-f0-9]{64}$/i.test(currentConfig.adminPassword);
    const passwordValid = config.adminPassword === '' && isPasswordHashed 
      ? true // Allow empty if password already set
      : validateField('adminPassword', config.adminPassword);

    if (!passwordValid) {
      return;
    }

    setIsSaving(true);
    try {
      // If password is empty and already hashed, don't update it
      const configToSave = config.adminPassword === '' && isPasswordHashed
        ? { ...config, adminPassword: currentConfig.adminPassword }
        : config;
      
      await saveConfig(configToSave);
      setErrors({});
    setSaved(true);
      // Clear password field after saving if it was changed
      if (config.adminPassword) {
        setConfig(prev => ({ ...prev, adminPassword: '' }));
        setPasswordPlaceholder('Password already set (enter new password to change)');
      }
    setTimeout(() => setSaved(false), 2000);
    } catch (error) {
      if (error instanceof Error) {
        setErrors({ general: error.message });
      }
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Layout>
      <div className="max-w-lg animate-fade-in">
        <div className="mb-6">
          <h1 className="text-xl font-semibold text-foreground">Settings</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Configure admin access. Webhook URLs are fixed in code.
          </p>
        </div>

        <div className="rounded-lg border border-border bg-card p-6 space-y-6">
          <div className="space-y-4">
            <h2 className="text-sm font-medium text-foreground">Admin Access</h2>
            
            <div className="space-y-2">
              <Label htmlFor="adminPassword">Admin Password</Label>
              <Input
                id="adminPassword"
                type="password"
                value={config.adminPassword}
                onChange={(e) => {
                  setConfig({ ...config, adminPassword: e.target.value });
                  validateField('adminPassword', e.target.value);
                }}
                onBlur={(e) => validateField('adminPassword', e.target.value)}
                placeholder={passwordPlaceholder}
                className={errors.adminPassword ? 'border-destructive' : ''}
              />
              {passwordStrength && config.adminPassword && (
                <div className="space-y-1">
                  <div className="flex gap-1">
                    {[0, 1, 2, 3, 4].map((level) => (
                      <div
                        key={level}
                        className={cn(
                          "h-1 flex-1 rounded",
                          level < passwordStrength.score
                            ? level < 2
                              ? "bg-destructive"
                              : level < 3
                              ? "bg-warning"
                              : "bg-success"
                            : "bg-muted"
                        )}
                      />
                    ))}
                  </div>
                  <p className={cn(
                    "text-xs",
                    passwordStrength.isValid ? "text-success" : "text-muted-foreground"
                  )}>
                    {passwordStrength.feedback[0]}
                  </p>
                </div>
              )}
              {errors.adminPassword && (
                <p className="text-sm text-destructive flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {errors.adminPassword}
                </p>
              )}
              <p className="text-xs text-muted-foreground">
                Password required to access the admin page. Minimum 8 characters recommended.
              </p>
            </div>
          </div>

          {errors.general && (
            <div className="rounded-md bg-destructive/10 border border-destructive/20 p-3">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
                <p className="text-xs text-destructive">{errors.general}</p>
              </div>
            </div>
          )}

          <div className="rounded-md bg-secondary p-3">
            <div className="flex items-start gap-2">
              <Info className="h-4 w-4 text-muted-foreground mt-0.5" />
              <p className="text-xs text-muted-foreground">
                Settings are stored in your browser's local storage. They will persist across sessions but are specific to this browser.
              </p>
            </div>
          </div>

          <div className="rounded-md bg-warning/10 border border-warning/20 p-3">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-warning mt-0.5 shrink-0" />
              <div className="text-xs text-warning">
                <p className="font-medium mb-1">Security Notice</p>
                <p>
                  This is a frontend-only application. Passwords are hashed and obfuscated but not truly encrypted.
                  For production use, implement a backend authentication system.
                </p>
              </div>
            </div>
          </div>

          <Button onClick={handleSave} disabled={isSaving} className="w-full">
            {saved ? (
              <>
                <CheckCircle2 className="mr-2 h-4 w-4" />
                Saved
              </>
            ) : isSaving ? (
              <>
                <Save className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Save Settings
              </>
            )}
          </Button>
        </div>
      </div>
    </Layout>
  );
}
