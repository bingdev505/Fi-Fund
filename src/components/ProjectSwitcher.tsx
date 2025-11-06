'use client';
import { useFinancials } from '@/hooks/useFinancials';
import { Button } from './ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import { Briefcase, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Project } from '@/lib/types';

export default function ProjectSwitcher() {
  const { projects, activeProject, setActiveProject } = useFinancials();

  if (projects.length <= 1) {
    return null;
  }

  const handleProjectChange = (project: Project | null) => {
    setActiveProject(project);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className="w-full justify-start md:w-auto md:min-w-[200px]"
        >
          <Briefcase className="mr-2 h-4 w-4" />
          <span className="truncate">
            {activeProject ? activeProject.name : 'Select a Business'}
          </span>
          <ChevronsUpDown className="ml-auto h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-[--radix-dropdown-menu-trigger-width]">
        <DropdownMenuItem
            onClick={() => handleProjectChange(null)}
            className={cn({'font-bold': !activeProject || activeProject?.id === 'all'})}
        >
          All Business
        </DropdownMenuItem>
        {projects.map((project) => (
          <DropdownMenuItem
            key={project.id}
            onClick={() => handleProjectChange(project)}
            className={cn({'font-bold': activeProject?.id === project.id})}
          >
            {project.name}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
