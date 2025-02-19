import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Settings, Share2, ChevronLeft } from 'lucide-react';
import { supabase } from '../lib/supabase';
import ProjectSubreddits from '../components/ProjectSubreddits';
import ShareProjectModal from '../components/ShareProjectModal';
import ProjectSettingsModal from '../components/ProjectSettingsModal';

interface Project {
  id: string;
  name: string;
  description: string | null;
  image_url: string | null;
}

function ProjectView() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);

  useEffect(() => {
    if (!projectId) {
      navigate('/projects');
      return;
    }
    fetchProject();
  }, [projectId]);

  const fetchProject = async () => {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('id', projectId)
        .single();

      if (error) throw error;
      if (!data) throw new Error('Project not found');
      
      setProject(data);
    } catch (err) {
      console.error('Error fetching project:', err);
      setError('Failed to load project');
    } finally {
      setLoading(false);
    }
  };

  const handleProjectUpdate = (updatedProject: Project) => {
    setProject(updatedProject);
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-400">Loading project...</div>
        </div>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="p-8">
        <div className="bg-red-900/30 text-red-400 p-4 rounded-lg">
          {error || 'Project not found'}
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-[1200px] mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/projects')}
            className="text-gray-400 hover:text-white p-2 -ml-2 rounded-full hover:bg-white/10"
          >
            <ChevronLeft size={24} />
          </button>
          <div>
            <h1 className="text-4xl font-bold">{project.name}</h1>
            {project.description && (
              <p className="text-gray-400 mt-1">{project.description}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsShareModalOpen(true)}
            className="secondary flex items-center gap-2"
          >
            <Share2 size={20} />
            Share
          </button>
          <button
            onClick={() => setIsSettingsModalOpen(true)}
            className="secondary flex items-center gap-2"
          >
            <Settings size={20} />
            Settings
          </button>
        </div>
      </div>

      {/* Subreddits List */}
      <ProjectSubreddits projectId={project.id} />

      {/* Modals */}
      <ShareProjectModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        projectId={project.id}
        projectName={project.name}
      />
      <ProjectSettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        project={project}
        onUpdate={handleProjectUpdate}
      />
    </div>
  );
}

export default ProjectView;