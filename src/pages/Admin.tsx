import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, Users, BarChart3, Wrench, ShieldCheck } from 'lucide-react';
import { useFeatureAccess } from '../contexts/FeatureAccessContext';
import { supabase } from '../lib/supabase';
import UserManagement from '../components/admin/UserManagement';
import AdminMetrics from '../components/admin/AdminMetrics';
import UserDetails from '../components/admin/UserDetails';
import AdminTools from '../components/admin/AdminTools';

// Define the interface for UserDetails component props
interface UserDetailsProps {
  userId: string;
}

function Admin() {
  const { isAdmin, isLoading } = useFeatureAccess();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'metrics' | 'users' | 'tools'>('metrics');
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [selectedUserName, setSelectedUserName] = useState<string | null>(null);

  // Redirect if not admin
  useEffect(() => {
    if (!isLoading && !isAdmin) {
      navigate('/dashboard');
    }
  }, [isAdmin, isLoading, navigate]);

  // Show loading state while determining admin status
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-[#D4B675] border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="px-6 py-6 md:px-8 w-full max-w-screen-2xl mx-auto">
      <div className="flex items-center mb-8">
        <ShieldCheck className="text-red-500 mr-2" size={24} />
        <h1 className="text-2xl font-bold">Admin Panel</h1>
      </div>

      {/* Navigation */}
      {!selectedUser ? (
        <div className="flex flex-wrap gap-2 mb-6">
          <button
            onClick={() => setActiveTab('metrics')}
            className={`px-4 py-2 rounded-lg flex items-center ${
              activeTab === 'metrics'
                ? 'bg-[#D4B675] text-white'
                : 'bg-[#111111] hover:bg-[#222222]'
            }`}
          >
            <BarChart3 size={18} className="mr-2" />
            Metrics
          </button>
          
          <button
            onClick={() => setActiveTab('users')}
            className={`px-4 py-2 rounded-lg flex items-center ${
              activeTab === 'users'
                ? 'bg-[#D4B675] text-white'
                : 'bg-[#111111] hover:bg-[#222222]'
            }`}
          >
            <Users size={18} className="mr-2" />
            User Management
          </button>
          
          <button
            onClick={() => setActiveTab('tools')}
            className={`px-4 py-2 rounded-lg flex items-center ${
              activeTab === 'tools'
                ? 'bg-[#D4B675] text-white'
                : 'bg-[#111111] hover:bg-[#222222]'
            }`}
          >
            <Wrench size={18} className="mr-2" />
            Admin Tools
          </button>
        </div>
      ) : (
        <div className="flex items-center mb-6">
          <button
            onClick={() => {
              setSelectedUser(null);
              setSelectedUserName(null);
            }}
            className="px-4 py-2 rounded-lg bg-[#111111] hover:bg-[#222222] flex items-center mr-3"
          >
            <Users size={18} className="mr-2" />
            User Management
          </button>
          
          <ChevronRight size={16} className="text-gray-500 mr-3" />
          
          <div className="bg-[#111111] px-4 py-2 rounded-lg">
            {selectedUserName || selectedUser}
          </div>
        </div>
      )}

      {/* Content */}
      {selectedUser ? (
        <UserDetails userId={selectedUser} />
      ) : (
        <>
          {activeTab === 'metrics' && <AdminMetrics />}
          {activeTab === 'users' && (
            <UserManagement 
              onSelectUser={(userId: string, userName: string | null) => {
                setSelectedUser(userId);
                setSelectedUserName(userName);
              }} 
            />
          )}
          {activeTab === 'tools' && <AdminTools />}
        </>
      )}
    </div>
  );
}

export default Admin; 