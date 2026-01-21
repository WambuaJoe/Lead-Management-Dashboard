import { useState } from 'react';
import { Layout } from '@/components/Layout';
import { LeadForm } from '@/components/LeadForm';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Plus } from 'lucide-react';

const Index = () => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formKey, setFormKey] = useState(0);

  const handleDialogClose = (open: boolean) => {
    setIsDialogOpen(open);
    if (!open) {
      // Reset form by remounting it
      setFormKey(prev => prev + 1);
    }
  };

  const handleSuccess = () => {
    setIsDialogOpen(false);
    setFormKey(prev => prev + 1);
  };

  return (
    <Layout>
      <div className="flex flex-col items-center justify-center min-h-[60vh] animate-fade-in">
        <div className="text-center space-y-4">
          <h1 className="text-3xl font-semibold text-foreground">Lead Processor</h1>
          <p className="text-muted-foreground">
            Submit new leads to the processing workflow
          </p>
          <Button
            onClick={() => setIsDialogOpen(true)}
            size="lg"
            className="mt-6"
          >
            <Plus className="mr-2 h-5 w-5" />
            New Lead
          </Button>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={handleDialogClose}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Submit New Lead</DialogTitle>
              <DialogDescription>
                Enter lead information to send to the processing workflow.
              </DialogDescription>
            </DialogHeader>
            <LeadForm key={formKey} onSuccess={handleSuccess} />
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
};

export default Index;
