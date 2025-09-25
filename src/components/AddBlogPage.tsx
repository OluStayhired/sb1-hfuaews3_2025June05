// src/components/AddBlogPage.tsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase'; // Assuming your Supabase client is initialized here
import  ReactQuill  from 'react-quill';
import 'react-quill/dist/quill.snow.css'; // Import Quill's CSS
import {
  PlusCircle, Save, Loader2, X, ImagePlus, Tag, List,
  FileText, CheckCircle, AlertCircle, Trash2,
} from 'lucide-react';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid'; // For unique IDs for images
import VideoBlot from './VideoBlot';

// --- Interfaces for Data Structures (Mirroring assumed DB schema) ---

interface BlogPostForm {
  title: string;
  slug: string;
  description: string;
  content: string; // HTML content from Quill
  featured_image_url: string | null;
  selected_categories: string[]; // Array of category IDs
  selected_tags: string[]; // Array of tag IDs
}

interface Category {
  id: string;
  name: string;
}

interface Tag {
  id: string;
  name: string;
}

// --- Zod Schema for Validation ---
const blogPostSchema = z.object({
  title: z.string().min(1, 'Title is required').max(255, 'Title is too long'),
  slug: z.string().min(1, 'Slug is required').regex(/^[a-z0-9-]+$/, 'Slug must be lowercase, alphanumeric, and hyphenated'),
  description: z.string().min(1, 'Description is required').max(500, 'Description is too long'),
  content: z.string().min(10, 'Content is too short'),
  featured_image_url: z.string().url('Invalid featured image URL').nullable(),
  selected_categories: z.array(z.string()).min(1, 'At least one category is required'),
  selected_tags: z.array(z.string()).optional(), // Tags are optional
});

// --- Component Definition ---
export function AddBlogPage() {
  const navigate = useNavigate();
  const quillRef = useRef<ReactQuill>(null);
  const featuredFileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState<BlogPostForm>({
    title: '',
    slug: '',
    description: '',
    content: '',
    featured_image_url: null,
    selected_categories: [],
    selected_tags: [],
  });

  const [categories, setCategories] = useState<Category[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [featuredImageFile, setFeaturedImageFile] = useState<File | null>(null);

  // --- Helper: Generate Slug from Title ---
  const generateSlug = useCallback((title: string): string => {
    return title
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '') // Remove non-word chars
      .replace(/[\s_-]+/g, '-') // Replace spaces/underscores with single hyphen
      .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
  }, []);

  // --- Helper: Handle Featured Image Upload ---
  const handleFeaturedImageUpload = async (file: File): Promise<string | null> => {
    if (!file) return null;

    const { data: { session } } = await supabase.auth.getSession();
    const userId = session?.user?.id;
    if (!userId) {
      setError('User not authenticated for image upload.');
      return null;
    }

    const fileName = `${userId}/${uuidv4()}-${file.name}`;
    const { data, error: uploadError } = await supabase.storage
      .from('blog_images') // Assuming a Supabase storage bucket named 'blog_images'
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (uploadError) {
      setError(`Failed to upload featured image: ${uploadError.message}`);
      return null;
    }

    const { data: publicUrlData } = supabase.storage
      .from('blog_images')
      .getPublicUrl(fileName);

    return publicUrlData.publicUrl;
  };

  // --- Helper: Handle Image Upload from within ReactQuill ---
  const imageHandler = useCallback(() => {
    const input = document.createElement('input');
    input.setAttribute('type', 'file');
    input.setAttribute('accept', 'image/*');
    input.click();

    input.onchange = async () => {
      const file = input.files?.[0];
      if (file) {
        const { data: { session } } = await supabase.auth.getSession();
        const userId = session?.user?.id;
        if (!userId) {
          setError('User not authenticated for image upload.');
          return;
        }

        const quillEditor = quillRef.current?.getEditor();
        const range = quillEditor?.getSelection();
        if (quillEditor && range) {
          quillEditor.insertEmbed(range.index, 'image', 'uploading...'); // Show placeholder

          const fileName = `${userId}/${uuidv4()}-${file.name}`;
          const { data, error: uploadError } = await supabase.storage
            .from('blog_images')
            .upload(fileName, file, {
              cacheControl: '3600',
              upsert: false,
            });

          if (uploadError) {
            setError(`Failed to upload image to editor: ${uploadError.message}`);
            quillEditor.deleteText(range.index, 1); // Remove placeholder
            return;
          }

          const { data: publicUrlData } = supabase.storage
            .from('blog_images')
            .getPublicUrl(fileName);

          quillEditor.deleteText(range.index, 1); // Remove placeholder
          quillEditor.insertEmbed(range.index, 'image', publicUrlData.publicUrl);
          quillEditor.setSelection(range.index + 1, 0); // Move cursor after image
        }
      }
    };
  }, []);


  // --- NEW: Custom Video Handler ---
  const videoHandler = useCallback(() => {
  const url = prompt('Enter YouTube or Vimeo URL:');
  if (url) {
    const youtubeMatch = url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/);
    const quillEditor = quillRef.current?.getEditor();
    const range = quillEditor?.getSelection();

    if (quillEditor && range) {
      let embedUrl = '';
      if (youtubeMatch && youtubeMatch[1]) {
        embedUrl = `https://www.youtube.com/embed/${youtubeMatch[1]}?showinfo=0`;
      } else {
        embedUrl = url;
      }

      if (embedUrl) {
        // Get the current content and selection
        const content = quillEditor.getContents();
        const index = range.index;

        // Create a new block with a div wrapping the video
        const videoHtml = `
          <div class="aspect-w-3 aspect-h-4 my-4">
            <iframe src="${embedUrl}" class="w-full h-full rounded-md" frameborder="0" allowfullscreen></iframe>
          </div>
        `;

        // Insert the new HTML block
        quillEditor.clipboard.dangerouslyPasteHTML(index, videoHtml);
      }
    }
  }
}, []);

  // --- Helper: Extract Images from HTML Content ---
  const extractImagesFromHtml = (htmlContent: string): { url: string; alt: string }[] => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlContent, 'text/html');
    const images: { url: string; alt: string }[] = [];
    doc.querySelectorAll('img').forEach(img => {
      const src = img.getAttribute('src');
      const alt = img.getAttribute('alt') || '';
      if (src) {
        images.push({ url: src, alt });
      }
    });
    return images;
  };

  // --- Fetch Categories and Tags on Mount ---
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        setIsLoading(true);
        const { data: categoriesData, error: categoriesError } = await supabase
          .from('blog_categories') // Assuming a 'categories' table
          .select('id, name');
        if (categoriesError) throw categoriesError;
      
        const stringifiedCategories = categoriesData?.map(cat => ({
          ...cat,
          id: String(cat.id)
        })) || [];
        setCategories(stringifiedCategories);
                                                          
        //setCategories(categoriesData || []);
        //console.log("Actual Categories:", categoriesData);

        const { data: tagsData, error: tagsError } = await supabase
          .from('blog_tags') // Assuming a 'tags' table
          .select('id, name');
        if (tagsError) throw tagsError;
        
        //setTags(tagsData || []);

        // Transform the numeric IDs to strings
        const stringifiedTags = tagsData?.map(tag => ({
          ...tag,
          id: String(tag.id)
        })) || [];
        setTags(stringifiedTags);
        
      } catch (err: any) {
        setError(`Failed to load initial data: ${err.message}`);
      } finally {
        setIsLoading(false);
      }
    };
    fetchInitialData();
  }, []);

  // --- Handle Form Field Changes ---
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
      ...(name === 'title' && { slug: generateSlug(value) }), // Auto-generate slug
    }));
  };

  const handleQuillChange = (content: string) => {
    setFormData(prev => ({ ...prev, content }));
  };

  const handleCategoryToggle = (categoryId: string) => {
    setFormData(prev => {
      const newCategories = prev.selected_categories.includes(categoryId)
        ? prev.selected_categories.filter(id => id !== categoryId)
        : [...prev.selected_categories, categoryId];
      return { ...prev, selected_categories: newCategories };
    });
  };

  const handleTagToggle = (tagId: string) => {
    setFormData(prev => {
      const newTags = prev.selected_tags.includes(tagId)
        ? prev.selected_tags.filter(id => id !== tagId)
        : [...prev.selected_tags, tagId];
      return { ...prev, selected_tags: newTags };
    });
  };

  const handleFeaturedFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFeaturedImageFile(file);
      // Optional: Display a preview of the image
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({ ...prev, featured_image_url: reader.result as string }));
      };
      reader.readAsDataURL(file);
    } else {
      setFeaturedImageFile(null);
      setFormData(prev => ({ ...prev, featured_image_url: null }));
    }
  };

  // --- Handle Form Submission ---
  const handleSavePost = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError(null);
    setSuccessMessage(null);

    try {
      // 1. Client-side Validation
      blogPostSchema.parse(formData);

      const { data: { session } } = await supabase.auth.getSession();
      const userId = session?.user?.id;
      if (!userId) {
        throw new Error('User not authenticated.');
      }

      // 2. Upload Featured Image
      let finalFeaturedImageUrl = formData.featured_image_url;
      if (featuredImageFile) {
        const uploadedUrl = await handleFeaturedImageUpload(featuredImageFile);
        if (!uploadedUrl) {
          throw new Error('Featured image upload failed.');
        }
        finalFeaturedImageUrl = uploadedUrl;
      }

      // 3. Insert into blog_post table
      const { data: blogPostData, error: blogPostError } = await supabase
        .from('blog_post') // Assuming 'blog_post' table
        .insert({
          title: formData.title,
          slug: formData.slug,
          description: formData.description,
          content: formData.content,
          featured_image_url: finalFeaturedImageUrl,
          user_id: userId,
        })
        .select('id')
        .single();

      if (blogPostError) throw blogPostError;
      const postId = blogPostData.id;

      // 4. Insert into blog_post_categories
      if (formData.selected_categories.length > 0) {
        const categoryInserts = formData.selected_categories.map(catId => ({
          post_id: postId,
          categories_id: catId,
        }));
        const { error: categoriesError } = await supabase
          .from('blog_post_categories') // Assuming 'blog_post_categories' table
          .insert(categoryInserts);
        if (categoriesError) throw categoriesError;
      }

      // 5. Insert into blog_post_tags
      if (formData.selected_tags && formData.selected_tags.length > 0) {
        const tagInserts = formData.selected_tags.map(tagId => ({
          post_id: postId,
          tags_id: tagId,
        }));
        const { error: tagsError } = await supabase
          .from('blog_post_tags') // Assuming 'blog_post_tags' table
          .insert(tagInserts);
        if (tagsError) throw tagsError;
      }

      // 6. Extract and Save Images from Rich Text Editor Content
      const imagesInContent = extractImagesFromHtml(formData.content);
      if (imagesInContent.length > 0) {
        const imageInserts = imagesInContent.map(img => ({
          post_id: postId,
          image_url: img.url,
          alt_text: img.alt,
        }));
        const { error: imagesError } = await supabase
          .from('blog_images') // Assuming 'blog_images' table
          .insert(imageInserts);
        if (imagesError) console.error('Error saving inline images:', imagesError);
      }

      setSuccessMessage('Blog post saved successfully!');
      setTimeout(() => {
        navigate('/dashboard/blog-posts'); // Navigate to a list of blog posts
      }, 1500);

    } catch (err: any) {
      if (err instanceof z.ZodError) {
        setError(err.errors.map(e => e.message).join(', '));
      } else {
        setError(err.message || 'An unexpected error occurred.');
      }
    } finally {
      setIsSaving(false);
    }
  };

  // --- ReactQuill Modules and Formats ---
  const modules = React.useMemo(() => ({
    toolbar: {
      container: [
        [{ 'header': [1, 2, 3, 4, 5, 6, false] }],
        ['bold', 'italic', 'underline', 'strike'],
        [{ 'list': 'ordered' }, { 'list': 'bullet' }],
        [{ 'script': 'sub' }, { 'script': 'super' }],
        [{ 'indent': '-1' }, { 'indent': '+1' }],
        [{ 'direction': 'rtl' }],
        [{ 'align': [] }],
        ['link', 'image', 'video'], // Include image and video buttons
        ['clean']
      ],
      handlers: {
        image: imageHandler, // Custom image handler
        video: videoHandler,
      },
    },
  }), [imageHandler, videoHandler]);

  const formats = [
    'header', 'bold', 'italic', 'underline', 'strike', 'blockquote',
    'list', 'bullet', 'script', 'indent', 'direction', 'align',
    'link', 'image', 'video'
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-4">
      <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-lg p-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Create New Blog Post</h1>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 flex items-center space-x-2">
            <AlertCircle className="w-5 h-5" />
            <p>{error}</p>
          </div>
        )}
        {successMessage && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg mb-4 flex items-center space-x-2">
            <CheckCircle className="w-5 h-5" />
            <p>{successMessage}</p>
          </div>
        )}

        <form onSubmit={handleSavePost} className="space-y-6">
          {/* Title and Slug */}
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">Title</label>
            <input
              type="text"
              id="title"
              name="title"
              value={formData.title}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>
          <div>
            <label htmlFor="slug" className="block text-sm font-medium text-gray-700 mb-1">Slug</label>
            <input
              type="text"
              id="slug"
              name="slug"
              value={formData.slug}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 focus:ring-blue-500 focus:border-blue-500"
              readOnly // Slug is auto-generated
            />
          </div>

          {/* Description */}
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>

          {/* Featured Image Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Featured Image</label>
            <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-lg">
              <div className="space-y-1 text-center">
                {formData.featured_image_url && (
                  <img src={formData.featured_image_url} alt="Featured Preview" className="mx-auto h-96 w-auto object-cover mb-4 rounded-md" />
                )}
                <ImagePlus className="mx-auto h-12 w-12 text-gray-400" />
                <div className="flex text-sm text-gray-600">
                  <label
                    htmlFor="featured-file-upload"
                    className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500"
                  >
                    <span>Upload a file</span>
                    <input
                      id="featured-file-upload"
                      name="featured-file-upload"
                      type="file"
                      ref={featuredFileInputRef}
                      className="sr-only"
                      onChange={handleFeaturedFileChange}
                      accept="image/*"
                    />
                  </label>
                  <p className="pl-1">or drag and drop</p>
                </div>
                <p className="text-xs text-gray-500">PNG, JPG, GIF up to 10MB</p>
              </div>
            </div>
          </div>

          {/* Rich Text Editor */}
          <div>
            <label htmlFor="content" className="block text-sm font-medium text-gray-700 mb-1">Content</label>
            <ReactQuill
              ref={quillRef}
              theme="snow"
              value={formData.content}
              onChange={handleQuillChange}
              modules={modules}
              formats={formats}
              className="h-96 mb-12" // Adjust height as needed, mb for toolbar space
            />
          </div>

          {/* Categories Selection */}
          <div className="mt-12 pt-4 border-t border-gray-200">
            <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center space-x-2">
              <List className="w-5 h-5 text-gray-500" />
              <span>Categories</span>
            </label>
            <div className="flex flex-wrap gap-2">
              {categories.map(category => (
                <button
                  key={category.id}
                  type="button"
                  onClick={() => handleCategoryToggle(category.id)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                    formData.selected_categories.includes(category.id)
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  {category.name}
                </button>
              ))}
            </div>
          </div>

          {/* Tags Selection */}
          <div className="mt-6">
            <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center space-x-2">
              <Tag className="w-5 h-5 text-gray-500" />
              <span>Tags (Optional)</span>
            </label>
            <div className="flex flex-wrap gap-2">
              {tags.map(tag => (
                <button
                  key={tag.id}
                  type="button"
                  onClick={() => handleTagToggle(tag.id)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                    formData.selected_tags?.includes(tag.id)
                      ? 'bg-green-600 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  {tag.name}
                </button>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-8 flex justify-end space-x-4">
            <button
              type="button"
              onClick={() => navigate('/dashboard/blog-posts')} // Adjust navigation as needed
              className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-300 flex items-center space-x-2"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Saving Blog...</span>
                </>
              ) : (
                <>
                  <Save className="w-5 h-5" />
                  <span>Save Blog</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
