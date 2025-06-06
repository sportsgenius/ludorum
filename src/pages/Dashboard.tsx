import React from 'react';
import AnalyzerDemo from '../components/AnalyzerDemo';

const Dashboard: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Sports Genius Dashboard
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Analyze your sports bets with AI-powered insights
          </p>
        </div>
        
        <AnalyzerDemo />
      </div>
    </div>
  );
};

export default Dashboard;