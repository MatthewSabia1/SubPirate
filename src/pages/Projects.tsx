import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Settings, ChevronRight, Trash2, Share2 } from 'lucide-react';
import ShareProjectModal from '../components/ShareProjectModal';
import ProjectSettingsModal from '../components/ProjectSettingsModal';
import { supabase } from '../lib/supabase';

interface Project {
  id: string;
  name: string;
  description: string | null;
  image_url: string | null;
}

function Projects() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProjects(data || []);
    } catch (err) {
      console.error('Error fetching projects:', err);
      setError('Failed to load projects');
    } finally {
      setLoading(false);
    }
  };

  const openShareModal = (project: Project) => {
    setSelectedProject(project);
    setIsShareModalOpen(true);
  };

  const openSettingsModal = (project: Project) => {
    setSelectedProject(project);
    setIsSettingsModalOpen(true);
  };

  const handleProjectUpdate = (updatedProject: Project) => {
    setProjects(prev => prev.map(p => 
      p.id === updatedProject.id ? updatedProject : p
    ));
  };

  const deleteProject = async (projectId: string) => {
    if (!confirm('Are you sure you want to delete this project?')) return;

    try {
      const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', projectId);

      if (error) throw error;
      setProjects(prev => prev.filter(p => p.id !== projectId));
    } catch (err) {
      console.error('Error deleting project:', err);
      setError('Failed to delete project');
    }
  };

  const getProjectImage = (project: Project) => {
    if (project.image_url) return project.image_url;
    return `https://api.dicebear.com/7.x/shapes/svg?seed=${project.name}&backgroundColor=111111`;
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-400">Loading projects...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl md:text-4xl font-bold">Projects</h1>
        <button className="primary flex items-center gap-2 text-sm md:text-base">
          <Plus size={20} />
          <span className="hidden md:inline">New Project</span>
          <span className="md:hidden">New</span>
        </button>
      </div>

      {error && (
        <div className="mb-8 p-4 bg-red-900/30 text-red-400 rounded-lg">
          {error}
        </div>
      )}

      {projects.length === 0 ? (
        <div className="bg-[#111111] rounded-lg p-8 text-center">
          <h3 className="text-xl font-semibold mb-2">No Projects Yet</h3>
          <p className="text-gray-400 mb-6">
            Create your first project to start analyzing subreddits
          </p>
          <button className="primary flex items-center gap-2 mx-auto">
            <Plus size={20} />
            New Project
          </button>
        </div>
      ) : (
        <div className="bg-[#111111] rounded-lg overflow-hidden">
          <div className="divide-y divide-[#222222]">
            {projects.map((project) => (
              <div
                key={project.id}
                className="flex items-center gap-4 p-4 hover:bg-[#1A1A1A] transition-colors group"
              >
                <div className="w-12 h-12 rounded-lg bg-[#1A1A1A] overflow-hidden group-hover:bg-[#222222] transition-colors">
                  <img 
                    src={getProjectImage(project)}
                    alt={project.name}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.src = `https://api.dicebear.com/7.x/shapes/svg?seed=${project.name}&backgroundColor=111111`;
                    }}
                  />
                </div>

                <div className="flex-1 min-w-0">
                  <h3 className="font-medium mb-1">{project.name}</h3>
                  {project.description && (
                    <p className="text-sm text-gray-400 truncate">
                      {project.description}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-1 md:gap-2">
                  <button 
                    onClick={() => openShareModal(project)}
                    className="text-gray-400 hover:text-white p-1.5 md:p-2 rounded-full hover:bg-white/10"
                    title="Share Project"
                  >
                    <Share2 size={20} />
                  </button>
                  <button 
                    onClick={() => openSettingsModal(project)}
                    className="text-gray-400 hover:text-white p-1.5 md:p-2 rounded-full hover:bg-white/10"
                    title="Project Settings"
                  >
                    <Settings size={20} />
                  </button>
                  <button 
                    onClick={() => deleteProject(project.id)}
                    className="text-gray-400 hover:text-white p-1.5 md:p-2 rounded-full hover:bg-white/10"
                    title="Delete Project"
                  >
                    <Trash2 size={20} />
                  </button>
                  <button 
                    onClick={() => navigate(`/projects/${project.id}`)}
                    className="text-gray-400 hover:text-white p-1.5 md:p-2 rounded-full hover:bg-white/10"
                    title="View Project"
                  >
                    <ChevronRight size={20} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {selectedProject && (
        <>
          <ShareProjectModal
            isOpen={isShareModalOpen}
            onClose={() => {
              setIsShareModalOpen(false);
              setSelectedProject(null);
            }}
            projectId={selectedProject.id}
            projectName={selectedProject.name}
          />
          <ProjectSettingsModal
            isOpen={isSettingsModalOpen}
            onClose={() => {
              setIsSettingsModalOpen(false);
              setSelectedProject(null);
            }}
            project={selectedProject}
            onUpdate={handleProjectUpdate}
          />
        </>
      )}
    </div>
  );
}

export default Projects;