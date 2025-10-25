'use client';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { useFinancials } from '@/hooks/useFinancials';
import { Loader2, Folder } from 'lucide-react';
import ProjectForm from './ProjectForm';
import { Button } from './ui/button';
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';

export default function Business() {
  const { isLoading, projects } = useFinancials();
  const [addProjectOpen, setAddProjectOpen] = useState(false);

  return (
    <Dialog open={addProjectOpen} onOpenChange={setAddProjectOpen}>
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Manage Businesses</CardTitle>
              <CardDescription>Add or manage your businesses (projects).</CardDescription>
            </div>
            <DialogTrigger asChild>
                <Button>Add New Business</Button>
            </DialogTrigger>
          </div>
        </CardHeader>
        <CardContent>
           <div>
            <h3 className="text-lg font-medium mb-4">Your Businesses</h3>
            {isLoading ? (
              <div className="flex justify-center items-center h-24">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : projects.length > 0 ? (
              <div className="border rounded-md">
                <ul className="divide-y divide-border">
                  {projects.map(project => (
                    <li key={project.id} className="flex items-center justify-between p-4 hover:bg-muted/50">
                      <div className="flex items-center gap-4">
                          <Folder className="h-6 w-6 text-muted-foreground" />
                          <div>
                            <span className="font-medium">{project.name}</span>
                          </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <div className="text-center py-10 border-dashed border-2 rounded-md">
                <p className="text-muted-foreground text-sm">You haven't added any businesses yet.</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create a new Business</DialogTitle>
        </DialogHeader>
        <ProjectForm onFinished={() => setAddProjectOpen(false)}/>
      </DialogContent>
    </Dialog>
  );
}
