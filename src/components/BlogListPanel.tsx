// src/components/BlogListPanel.tsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { X, Loader2, Search, BookText, ArrowLeft, ArrowRight, Tag, List, Image, FileText } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { format } from 'date-fns';
import { TooltipExtended } from '../utils/TooltipExtended';
import { TooltipHelp } from '../utils/TooltipHelp';

interface BlogListPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectBlog: (blogId: number | null) => void; // NEW: Callback to select a blog
  selectedBlogId: number | null; // NEW: ID of the currently selected blog
}

// --- Interfaces for Data Structures ---

interface BlogPost {
  id: number;
  title: string;
  slug: string;
  description: string | null;
  featured_image_url: string | null;
  author_name: string | null;
  created_at: string; // ISO string
  published: boolean ;
}

interface Category {
  id: number;
  name: string;
  slug: string;
}

export function BlogListPanel({ isOpen, onClose, onSelectBlog, selectedBlogId }: BlogListPanelProps) {
  const [blogPosts, setBlogPosts] = useState<BlogPost[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null); // Stores category ID
  const [totalBlogsCount, setTotalBlogsCount] = useState(0);

  const blogsPerPage = 50;

  // --- Fetch Categories on Mount ---
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const { data, error: fetchError } = await supabase
          .from('blog_categories')
          .select('id, name, slug')
          .order('name', { ascending: true });

        if (fetchError) throw fetchError;
        setCategories(data || []);
      } catch (err: any) {
        console.error('Error fetching categories:', err);
        setError('Failed to load categories.');
      }
    };
    fetchCategories();
  }, []);

  // --- Fetch Blog Posts ---
  const fetchBlogPosts = useCallback(async () => {
    if (!isOpen) return;

    setIsLoading(true);
    setError(null);

    try {
      const startIndex = (currentPage - 1) * blogsPerPage;
      const endIndex = startIndex + blogsPerPage - 1;

      let query = supabase
        .from('blog_post')
        .select(`
          id,
          title,
          slug,
          description,
          featured_image_url,
          author_name,
          created_at,
          published,
          blog_post_categories!left(categories_id) // Use left join to filter by category
        `, { count: 'exact' });

      // Apply search filter
      if (searchQuery.trim()) {
        query = query.ilike('title', `%${searchQuery.trim()}%`);
      }

      // Apply category filter
      if (selectedCategory !== null) {
        query = query.filter('blog_post_categories.categories_id', 'eq', selectedCategory);
      }

      // Apply pagination
      query = query.order('created_at', { ascending: false }).range(startIndex, endIndex);

      const { data, error: fetchError, count } = await query;

      if (fetchError) throw fetchError;

      // Map data to BlogPost interface, handling potential nulls from left join if no category matches
      const mappedData: BlogPost[] = (data || []).map((item: any) => ({
        id: item.id,
        title: item.title,
        slug: item.slug,
        description: item.description,
        featured_image_url: item.featured_image_url,
        author_name: item.author_name,
        created_at: item.created_at,
        published: item.published
      }));

      setBlogPosts(mappedData);
      setTotalBlogsCount(count || 0);
    } catch (err: any) {
      console.error('Error fetching blog posts:', err);
      setError('Failed to load blog posts. ' + err.message);
    } finally {
      setIsLoading(false);
    }
  }, [isOpen, currentPage, searchQuery, selectedCategory]);

  useEffect(() => {
    fetchBlogPosts();
  }, [fetchBlogPosts]);

  // --- Pagination Handlers ---
  const totalPages = useMemo(() => Math.ceil(totalBlogsCount / blogsPerPage), [totalBlogsCount]);

  const handlePageChange = (newPage: number) => {
    if (newPage > 0 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };

  // --- Filter Handlers ---
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    setCurrentPage(1); // Reset to first page on new search
  };

  const handleCategoryFilter = (categoryId: number | null) => {
    setSelectedCategory(categoryId);
    setCurrentPage(1); // Reset to first page on new filter
  };

  // NEW: handleBlogPostStatus function
  const handleBlogPostStatus = async (blogId: number, newStatus: boolean) => {
    try {
      // Optimistic UI update
      setBlogPosts(prevPosts =>
        prevPosts.map(post =>
          post.id === blogId ? { ...post, published: newStatus } : post
        )
      );

      const { error: updateError } = await supabase
        .from('blog_post')
        .update({ published: newStatus, updated_at: new Date().toISOString() })
        .eq('id', blogId);

      if (updateError) {
        throw updateError;
      }

      // If successful, the optimistic update is correct.
      // If you want to be absolutely sure, you could re-fetch the single post or the entire list.
      // For now, we'll rely on the optimistic update.
      console.log(`Blog post ${blogId} status updated to published: ${newStatus}`);
    } catch (err: any) {
      console.error('Error updating blog post status:', err);
      setError(`Failed to update status for blog post ${blogId}: ${err.message}`);
      // Revert optimistic update on error
      setBlogPosts(prevPosts =>
        prevPosts.map(post =>
          post.id === blogId ? { ...post, published: !newStatus } : post
        )
      );
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-40"
        onClick={onClose}
      ></div>

      {/* Side Panel Content */}
      <div
        className={`
          fixed top-0 right-0 h-screen w-80 bg-white shadow-lg border-l border-gray-200 z-50
          transform transition-transform duration-300 ease-in-out
          ${isOpen ? 'translate-x-0' : 'translate-x-full'}
        `}
      >
        <div className="p-4 h-full flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <div className="p-2 items-center bg-blue-50 rounded-full">
                <BookText className="h-5 w-5 text-blue-500" />
              </div>
              <h2 className="text-lg font-semibold text-gray-900">Blog Posts ({totalBlogsCount})</h2>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100">
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Search Input */}
          <div className="relative mb-4">
            <input
              type="text"
              placeholder="Search by title..."
              value={searchQuery}
              onChange={handleSearchChange}
              className="w-full text-sm px-4 py-2 pl-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Category Filter */}
          <div className="mb-4">
            <label htmlFor="categoryFilter" className="sr-only">Filter by Category</label>
            <select
              id="categoryFilter"
              value={selectedCategory || ''}
              onChange={(e) => handleCategoryFilter(e.target.value ? Number(e.target.value) : null)}
              className="w-full text-xs px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-700"
            >
              <option value="">All Categories</option>
              {categories.map(category => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center flex-grow">
              <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
            </div>
          ) : error ? (
            <div className="text-red-500 p-4 bg-red-50 rounded-lg">{error}</div>
          ) : (
            <div className="space-y-4 overflow-y-auto flex-grow scrollbar-thin scrollbar-thumb-rounded scrollbar-thumb-gray-300 scrollbar-track-gray-100">
              {blogPosts.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-gray-500">
                  <div className="mx-auto flex items-center justify-center bg-blue-50 rounded-full w-24 h-24">
                    <FileText className="w-12 h-12 font-light text-blue-500" />
                  </div>
                  <p className="text-gray-600 mb-3 mt-4">No blog posts found 😔</p>
                  <p className="text-gray-400 mb-4 text-sm">Try adjusting your search or filters.</p>
                </div>
              ) : (
                blogPosts.map((post) => (
                  <div
                    key={post.id}
                    className={`bg-white p-3 rounded-lg border border-gray-100 hover:border-blue-200 hover:shadow-sm transition-all group ${selectedBlogId === post.id ? 'ring-2 ring-blue-500' : ''}`}
                  >
                    {post.featured_image_url && (
                      <div className="mb-2">
                        <img
                          src={post.featured_image_url}
                          alt={post.title}
                          className="w-full h-24 object-cover rounded-md"
                        />
                      </div>
                    )}
                    <h3 className="font-semibold text-gray-900 mb-1 truncate">{post.title}</h3>
                    <p className="text-xs text-gray-600 mb-2 line-clamp-2">{post.description}</p>
                    <div className="flex justify-between items-center text-xs text-gray-500">
                      <span>By {post.author_name || 'Unknown'}</span>
                      <span>{format(new Date(post.created_at), 'dd MMM, yyyy')}</span>
                    </div>
                    <div className="mt-3 space-x-2 flex justify-end">

                   <TooltipHelp text={post.published ? '⚡Set to Draft':'⚡Click to Publish'}  >
                    <button
                         onClick={(e) => {
                          e.stopPropagation(); // Prevent triggering onSelectBlog
                          handleBlogPostStatus(post.id, !post.published);
                        }}

                        className={`px-3 py-1.5 text-xs rounded-lg transition-colors transition-duration:700 // Base styles
                            ${post.published
                                  ? 'bg-green-100 text-green-500 hover:bg-green-200'
                                  : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                            }`}
                      >
                       {post.published ?  'Published' : 'Draft'}             
                      </button>
                     </TooltipHelp> 
                      
                      <button
                        onClick={() => onSelectBlog(post.id)} // NEW: Call onSelectBlog
                        className="px-3 py-1.5 text-xs bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-200 transition-colors"
                      >
                        Open
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex justify-between items-center mt-4 pt-4 border-t border-gray-200">
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <span className="text-sm text-gray-600">
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50"
              >
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
