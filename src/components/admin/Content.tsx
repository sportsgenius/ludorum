import React, { useState } from 'react';
import { Plus, Pencil, Trash2, Save, X, FileText, Image, Video } from 'lucide-react';

interface ContentItem {
  id: string;
  title: string;
  type: 'article' | 'guide' | 'tutorial' | 'blog';
  status: 'draft' | 'published' | 'archived';
  author: string;
  created_at: string;
  updated_at: string;
  excerpt: string;
}

const Content: React.FC = () => {
  const [contentItems] = useState<ContentItem[]>([
    {
      id: '1',
      title: 'Understanding NFL Betting Lines',
      type: 'guide',
      status: 'published',
      author: 'Content Team',
      created_at: '2025-03-10',
      updated_at: '2025-03-12',
      excerpt: 'A comprehensive guide to understanding how NFL betting lines work and how to read them effectively.'
    },
    {
      id: '2',
      title: 'NBA Player Props Strategy',
      type: 'article',
      status: 'draft',
      author: 'Sports Analyst',
      created_at: '2025-03-15',
      updated_at: '2025-03-15',
      excerpt: 'Advanced strategies for betting on NBA player props with statistical analysis and key factors to consider.'
    }
  ]);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    type: 'article' as 'article' | 'guide' | 'tutorial' | 'blog',
    status: 'draft' as 'draft' | 'published' | 'archived',
    excerpt: '',
    content: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Handle content creation/update
    console.log('Content saved:', formData);
    setIsFormOpen(false);
    resetForm();
  };

  const resetForm = () => {
    setFormData({
      title: '',
      type: 'article',
      status: 'draft',
      excerpt: '',
      content: ''
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'published':
        return 'bg-green-100 text-green-800 dark:bg-green-800/30 dark:text-green-300';
      case 'draft':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-800/30 dark:text-yellow-300';
      case 'archived':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800/30 dark:text-gray-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800/30 dark:text-gray-300';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'article':
        return <FileText className="h-4 w-4" />;
      case 'guide':
        return <FileText className="h-4 w-4" />;
      case 'tutorial':
        return <Video className="h-4 w-4" />;
      case 'blog':
        return <Image className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Content Management</h1>
        <button
          onClick={() => setIsFormOpen(true)}
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          <Plus className="h-4 w-4 mr-2" />
          Create Content
        </button>
      </div>

      {/* Form */}
      {isFormOpen && (
        <div className="bg-white dark:bg-gray-800 shadow sm:rounded-lg">
          <form onSubmit={handleSubmit} className="p-6">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
              Create New Content
            </h3>

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Title *
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  required
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white sm:text-sm"
                  placeholder="Enter content title"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Type *
                </label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value as any }))}
                  required
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white sm:text-sm"
                >
                  <option value="article">Article</option>
                  <option value="guide">Guide</option>
                  <option value="tutorial">Tutorial</option>
                  <option value="blog">Blog Post</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Status *
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value as any }))}
                  required
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white sm:text-sm"
                >
                  <option value="draft">Draft</option>
                  <option value="published">Published</option>
                  <option value="archived">Archived</option>
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Excerpt
                </label>
                <textarea
                  value={formData.excerpt}
                  onChange={(e) => setFormData(prev => ({ ...prev, excerpt: e.target.value }))}
                  rows={3}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white sm:text-sm"
                  placeholder="Brief description of the content"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Content *
                </label>
                <textarea
                  value={formData.content}
                  onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
                  rows={10}
                  required
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white sm:text-sm"
                  placeholder="Write your content here..."
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => {
                  setIsFormOpen(false);
                  resetForm();
                }}
                className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-600"
              >
                <X className="h-4 w-4 mr-2" />
                Cancel
              </button>
              <button
                type="submit"
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                <Save className="h-4 w-4 mr-2" />
                Save Content
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Content List */}
      <div className="bg-white dark:bg-gray-800 shadow overflow-hidden sm:rounded-lg">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-700">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Content
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Type
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Author
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Updated
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {contentItems.map((item) => (
              <tr key={item.id}>
                <td className="px-6 py-4">
                  <div>
                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                      {item.title}
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      {item.excerpt}
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    {getTypeIcon(item.type)}
                    <span className="ml-2 text-sm text-gray-900 dark:text-white capitalize">
                      {item.type}
                    </span>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(item.status)}`}>
                    {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                  {item.author}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                  {new Date(item.updated_at).toLocaleDateString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <button className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300 mr-3">
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Content;