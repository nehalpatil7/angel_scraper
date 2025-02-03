import { useState, useEffect, useRef } from 'react';
import { Search, Download, Loader2, AlertCircle } from 'lucide-react';
import { supabase } from './lib/supabase';
import { searchProfiles } from './lib/serpapi';
import { findEmail } from './lib/apollo';
import { config } from './lib/config';

interface ScrapingResult {
  org: string;
  id: string;
  name: string;
  email: string;
  profileUrl: string;
  platform: string;
}

function App() {
  const [keywords, setKeywords] = useState('');
  const [platforms, setPlatforms] = useState({
    linkedin: false,
    twitter: false,
    instagram: false,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<ScrapingResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  const didLoad = useRef(false);

  useEffect(() => {
    if (!didLoad.current) {
      loadExistingResults();
      didLoad.current = true;
    }
  }, []);

  const loadExistingResults = async () => {
    try {
      const { data, error } = await supabase
        .from('scraped_profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setResults(data || []);
    } catch (error) {
      console.error('Error loading results:', error);
      setError('Failed to load existing results');
    }
  };

  const extractDomainFromTitle = (title: string): string => {
    try {
      return title.split(" - ").pop() || '';
    } catch {
      return '';
    }
  }

  const extractDomainFromUrl = (url: string): string => {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname;
    } catch {
      return '';
    }
  };

  const handleScrape = async () => {
    setIsLoading(true);
    setError(null);

    try {
      if (!config.serpApi.isConfigured || !config.apolloApi.isConfigured) {
        throw new Error("API keys not configured. Please add'em to .env file.");
      }

      const selectedPlatforms = Object.entries(platforms)
        .filter(([_, selected]) => selected)
        .map(([platform]) => platform);

      const profileResults = await Promise.all(
        selectedPlatforms.map(platform => searchProfiles(keywords.toLowerCase(), platform))
      );
      const profiles = profileResults.flat();
      console.log("Profiles:", profiles);
      const newResults: ScrapingResult[] = [];

      for (const profile of profiles) {
        const { data: existing } = await supabase
          .from('scraped_profiles')
          .select('*')
          .eq('url', profile.url)
          .single();

        if (existing) {
          newResults.push(existing as ScrapingResult);
          continue;
        }

        let domain;
        if (profile.platform === 'linkedin') {
          domain = extractDomainFromTitle(profile.title);
        } else {
          domain = extractDomainFromUrl(profile.url);
        }

        console.log("Domain:", domain);
        // const email = await findEmail(profile.first_name + ' ' + profile.last_name, domain);

        const result = {
          id: crypto.randomUUID(),
          name: profile.first_name + ' ' + profile.last_name,
          // email: email.value || '',
          profileUrl: profile.url,
          org: domain,
          platform: profile.platform,
        };
        console.log("Result:", result);

        const { error: dbError } = await supabase
          .from('scraped_profiles')
          .insert([{
            ...result,
            keywords,
          }]);

        if (dbError) {
          console.error('Error saving to database:', dbError);
        } else {
          // newResults.push(result);
        }
      }

      setResults(prevResults => [...newResults, ...prevResults]);
    } catch (error) {
      console.error('Scraping error:', error);
      setError(error instanceof Error ? error.message : 'An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleExportCSV = () => {
    const headers = ['Name', 'Email', 'Profile URL', 'Platform'];
    const csvContent = [
      headers.join(','),
      ...results.map(result =>
        [result.name, result.email, result.profileUrl, result.platform].join(',')
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'scraped_results.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h1 className="text-2xl font-bold mb-6">Profile Scraper</h1>

          {(!config.serpApi.isConfigured || !config.apolloApi.isConfigured) && (
            <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
              <div className="flex items-center text-yellow-800 mb-2">
                <AlertCircle className="w-5 h-5 mr-2" />
                <span className="font-medium">Missing API Configuration</span>
              </div>
              <div className="text-sm text-yellow-700">
                <div className="mb-2">Please add the following environment variables to your .env file:</div>
                <ul className="list-disc ml-5">
                  {!config.serpApi.isConfigured && (
                    <li>VITE_SERP_API_KEY for SerpAPI</li>
                  )}
                  {!config.apolloApi.isConfigured && (
                    <li>VITE_APOLLO_API_KEY for Apollo.io</li>
                  )}
                </ul>
              </div>
            </div>
          )}

          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
              <div className="flex items-center text-red-800">
                <AlertCircle className="w-5 h-5 mr-2" />
                <span>{error}</span>
              </div>
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Bio Keywords
              </label>
              <input
                type="text"
                value={keywords}
                onChange={(e) => setKeywords(e.target.value)}
                placeholder="e.g., Angel Investor, Startup Founder"
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Platforms
              </label>
              <div className="space-y-2">
                {Object.entries(platforms).map(([platform, checked]) => (
                  <label key={platform} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(e) =>
                        setPlatforms(prev => ({
                          ...prev,
                          [platform]: e.target.checked
                        }))
                      }
                      className="rounded text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm capitalize">{platform}</span>
                  </label>
                ))}
              </div>
            </div>

            <button
              onClick={handleScrape}
              disabled={isLoading || !keywords.trim() || !Object.values(platforms).some(v => v)}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:bg-blue-300 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Search className="w-5 h-5" />
              )}
              <span>{isLoading ? 'Scraping...' : 'Start Scraping'}</span>
            </button>
          </div>
        </div>

        {results.length > 0 && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Results</h2>
              <button
                onClick={handleExportCSV}
                className="flex items-center space-x-2 bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700"
              >
                <Download className="w-4 h-4" />
                <span>Export CSV</span>
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Profile URL</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Organization</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Platform</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {results.map((result) => (
                    <tr key={result.id}>
                      <td className="px-6 py-4 whitespace-nowrap">{result.name}</td>
                      <td className="px-6 py-4 whitespace-nowrap">{result.email}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <a
                          href={result.profileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800"
                        >
                          {result.profileUrl}
                        </a>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">{result.org}</td>
                      <td className="px-6 py-4 whitespace-nowrap">{result.platform}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;