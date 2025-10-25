'use client';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { useFinancials } from '@/hooks/useFinancials';
import { Loader2, Folder } from 'lucide-react';
import ProjectForm from './ProjectForm';

export default function Business() {
  const { isLoading, projects } = useFinancials();

  return (
    <div className="p-4 md:p-8 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Manage Businesses</CardTitle>
          <CardDescription>Add or manage your businesses (projects).</CardDescription>
        </CardHeader>
        <CardContent>
          <div>
            <h3 className="text-lg font-medium mb-2">Add New Business</h3>
            <ProjectForm onFinished={() => {}} />
          </div>
          <Separator className='my-6' />
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
    </div>
  );
}
