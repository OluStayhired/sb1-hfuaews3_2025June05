// src/components/BlogPageReadEdit.tsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import {
  Edit, Save, Loader2, X, ImagePlus, Tag, List,
  FileText, CheckCircle, AlertCircle, Trash2, Eye, BookText, PlusCircle
} from 'lucide-react';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { TooltipHelp } from '../utils/TooltipHelp';

// --- Interfaces for Data Structures ---

interface BlogPost {
  id: number;
  title: string;
  slug: string;
  description: string | null;
  content: string;
  featured_image_url: string | null;
  author_name: string | null;
  created_at: string;
  updated_at: string | null;
  user_id: string;
  categories: { id: number; name: string }[];
  tags: { id: number; name: string }[];
  inline_images: { id: number; image_url: string; alt_text: string | null }[];
}

interface Category {
  id: number;
  name: string;
}

interface Tag {
  id: number;
  name: string;
}

interface BlogPostForm {
  title: string;
  slug: string;
  description: string;
  content: string;
  featured_image_url: string | null;
  selected_category_ids: number[];
  selected_tag_ids: number[];
}

interface BlogPageReadEditProps {
  blogId: number | null;
  onOpenBlogListPanel: () => void;
  isBlogListPanelOpen: boolean;
  onCreateNewBlog: () => void;
}

// --- Zod Schema for Validation ---
const blogPostSchema = z.object({
  title: z.string().min(1, 'Title is required').max(255, 'Title is too long'),
  slug: z.string().min(1, 'Slug is required').regex(/^[a-z0-9-]+$/, 'Slug must be lowercase, alphanumeric, and hyphenated'),
  description: z.string().min(1, 'Description is required').max(500, 'Description is too long'),
  content: z.string().min(10, 'Content is too short'),
  featured_image_url: z.string().url('Invalid featured image URL').nullable(),
  selected_category_ids: z.array(z.number()).min(1, 'At least one category is required'),
  selected_tag_ids: z.array(z.number()).optional(),
});

export function BlogPageReadEdit({ blogId, onOpenBlogListPanel, isBlogListPanelOpen, onCreateNewBlog }: BlogPageReadEditProps) {
  const navigate = useNavigate();
  const quillRef = useRef<ReactQuill>(null);
  const featuredFileInputRef = useRef<HTMLInputElement>(null);

  const [blogPost, setBlogPost] = useState<BlogPost | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState<BlogPostForm | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [featuredImageFile, setFeaturedImageFile] = useState<File | null>(null);
  const [deletedInlineImageUrls, setDeletedInlineImageUrls] = useState<string[]>([]);

  // --- Helper: Generate Slug from Title ---
  const generateSlug = useCallback((title: string): string => {
    return title
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }, []);

  // --- Helper: Upload Image to Supabase Storage ---
  const uploadImageToStorage = async (file: File): Promise<string | null> => {
    if (!file) return null;
    const { data: { session } } = await supabase.auth.getSession();
    const userId = session?.user?.id;
    if (!userId) {
      setError('User not authenticated for image upload.');
      return null;
    }
    const fileName = `${userId}/${uuidv4()}-${file.name}`;
    const { data, error: uploadError } = await supabase.storage
      .from('blog_images')
      .upload(fileName, file, { cacheControl: '3600', upsert: false });
    if (uploadError) {
      setError(`Failed to upload image: ${uploadError.message}`);
      return null;
    }
    const { data: publicUrlData } = supabase.storage
      .from('blog_images')
      .getPublicUrl(fileName);
    return publicUrlData.publicUrl;
  };

  // --- Helper: Delete Image from Supabase Storage ---
  const deleteImageFromStorage = async (imageUrl: string): Promise<void> => {
    if (!imageUrl) return;
    try {
      const urlParts = imageUrl.split('blog_images/');
      const filePath = urlParts.length > 1 ? urlParts[1] : '';
      if (filePath) {
        const { error: deleteError } = await supabase.storage
          .from('blog_images')
          .remove([filePath]);
        if (deleteError) {
          console.error('Error deleting image from storage:', deleteError);
        } else {
          console.log('Image deleted from storage:', filePath);
        }
      }
    } catch (err) {
      console.error('Error processing image deletion:', err);
    }
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
        const quillEditor = quillRef.current?.getEditor();
        const range = quillEditor?.getSelection();
        if (quillEditor && range) {
          quillEditor.insertEmbed(range.index, 'image', 'uploading...'); // Show placeholder
          const uploadedUrl = await uploadImageToStorage(file);
          if (uploadedUrl) {
            quillEditor.deleteText(range.index, 1); // Remove placeholder
            quillEditor.insertEmbed(range.index, 'image', uploadedUrl);
            quillEditor.setSelection(range.index + 1, 0); // Move cursor after image
          } else {
            quillEditor.deleteText(range.index, 1); // Remove placeholder on error
          }
        }
      }
    };
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

  // --- Fetch Blog Post, Categories, and Tags ---
  useEffect(() => {
    const fetchBlogData = async () => {
      if (!blogId) {
        setIsLoading(false);
        setBlogPost(null);
        setFormData(null);
        //if (!isBlogListPanelOpen) {
          //onOpenBlogListPanel(); // Open side panel if no blog selected
        //}
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        // Fetch blog post with categories and tags
        const { data, error: fetchError } = await supabase
          .from('blog_post')
          .select(`
            *,
            blog_post_categories(categories_id),
            blog_post_tags(tags_id),
            blog_images(id, image_url, alt_text)
          `)
          .eq('id', blogId)
          .single();

        if (fetchError) throw fetchError;

        if (data) {
          const fetchedBlogPost: BlogPost = {
            ...data,
            categories: data.blog_post_categories.map((c: any) => ({ id: c.categories_id, name: '' })), // Name will be filled later
            tags: data.blog_post_tags.map((t: any) => ({ id: t.tags_id, name: '' })), // Name will be filled later
            inline_images: data.blog_images || [],
          };
          setBlogPost(fetchedBlogPost);
          setFormData({
            title: fetchedBlogPost.title,
            slug: fetchedBlogPost.slug,
            description: fetchedBlogPost.description || '',
            content: fetchedBlogPost.content,
            featured_image_url: fetchedBlogPost.featured_image_url,
            selected_category_ids: fetchedBlogPost.blog_post_categories.map((c: any) => c.categories_id),
            selected_tag_ids: fetchedBlogPost.blog_post_tags.map((t: any) => t.tags_id),
          });
        } else {
          setBlogPost(null);
          setFormData(null);
        }

        // Fetch all categories
        const { data: categoriesData, error: categoriesError } = await supabase
          .from('blog_categories')
          .select('id, name')
          .order('name', { ascending: true });
        if (categoriesError) throw categoriesError;
        setCategories(categoriesData || []);

        // Fetch all tags
        const { data: tagsData, error: tagsError } = await supabase
          .from('blog_tags')
          .select('id, name')
          .order('name', { ascending: true });
        if (tagsError) throw tagsError;
        setTags(tagsData || []);

      } catch (err: any) {
        setError(`Failed to load blog post: ${err.message}`);
        setBlogPost(null);
        setFormData(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchBlogData();
  }, [blogId, isBlogListPanelOpen, onOpenBlogListPanel]);

  // --- Handle Form Field Changes ---
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    if (!formData) return;
    const { name, value } = e.target;
    setFormData(prev => {
      if (!prev) return null;
      return {
        ...prev,
        [name]: value,
        ...(name === 'title' && { slug: generateSlug(value) }),
      };
    });
  };

  const handleQuillChange = (content: string) => {
    if (!formData) return;
    setFormData(prev => (prev ? { ...prev, content } : null));
  };

  const handleCategoryToggle = (categoryId: number) => {
    if (!formData) return;
    setFormData(prev => {
      if (!prev) return null;
      const newCategories = prev.selected_category_ids.includes(categoryId)
        ? prev.selected_category_ids.filter(id => id !== categoryId)
        : [...prev.selected_category_ids, categoryId];
      return { ...prev, selected_category_ids: newCategories };
    });
  };

  const handleTagToggle = (tagId: number) => {
    if (!formData) return;
    setFormData(prev => {
      if (!prev) return null;
      const newTags = prev.selected_tag_ids.includes(tagId)
        ? prev.selected_tag_ids.filter(id => id !== tagId)
        : [...prev.selected_tag_ids, tagId];
      return { ...prev, selected_tag_ids: newTags };
    });
  };

  const handleFeaturedFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFeaturedImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => (prev ? { ...prev, featured_image_url: reader.result as string } : null));
      };
      reader.readAsDataURL(file);
    } else {
      setFeaturedImageFile(null);
      setFormData(prev => (prev ? { ...prev, featured_image_url: null } : null));
    }
  };

  const handleRemoveFeaturedImage = async () => {
    if (!formData || !blogPost || !blogPost.featured_image_url) return;

    // Optionally delete from storage if you manage featured images in the same bucket
    // await deleteImageFromStorage(blogPost.featured_image_url);

    setFormData(prev => (prev ? { ...prev, featured_image_url: null } : null));
    setFeaturedImageFile(null);
  };

  // --- Handle Form Submission (Update) ---
  const handleSavePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData || !blogPost) return;

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

      // 2. Upload New Featured Image if changed
      let finalFeaturedImageUrl = formData.featured_image_url;
      if (featuredImageFile) {
        // If there was an old featured image, delete it from storage
        if (blogPost.featured_image_url && blogPost.featured_image_url !== formData.featured_image_url) {
          await deleteImageFromStorage(blogPost.featured_image_url);
        }
        const uploadedUrl = await uploadImageToStorage(featuredImageFile);
        if (!uploadedUrl) {
          throw new Error('Featured image upload failed.');
        }
        finalFeaturedImageUrl = uploadedUrl;
      } else if (blogPost.featured_image_url && !formData.featured_image_url) {
        // Featured image was removed
        await deleteImageFromStorage(blogPost.featured_image_url);
      }

      // 3. Update blog_post table
      const { error: blogPostError } = await supabase
        .from('blog_post')
        .update({
          title: formData.title,
          slug: formData.slug,
          description: formData.description,
          content: formData.content,
          featured_image_url: finalFeaturedImageUrl,
          updated_at: new Date().toISOString(),
        })
        .eq('id', blogPost.id);

      if (blogPostError) throw blogPostError;

      // 4. Update blog_post_categories (delete old, insert new)
      await supabase.from('blog_post_categories').delete().eq('post_id', blogPost.id);
      if (formData.selected_category_ids.length > 0) {
        const categoryInserts = formData.selected_category_ids.map(catId => ({
          post_id: blogPost.id,
          categories_id: catId,
        }));
        const { error: categoriesError } = await supabase
          .from('blog_post_categories')
          .insert(categoryInserts);
        if (categoriesError) console.error('Error updating categories:', categoriesError);
      }

      // 5. Update blog_post_tags (delete old, insert new)
      await supabase.from('blog_post_tags').delete().eq('post_id', blogPost.id);
      if (formData.selected_tag_ids && formData.selected_tag_ids.length > 0) {
        const tagInserts = formData.selected_tag_ids.map(tagId => ({
          post_id: blogPost.id,
          tags_id: tagId,
        }));
        const { error: tagsError } = await supabase
          .from('blog_post_tags')
          .insert(tagInserts);
        if (tagsError) console.error('Error updating tags:', tagsError);
      }

      // 6. Handle inline images (delete removed, update existing, insert new)
      const currentInlineImagesInEditor = extractImagesFromHtml(formData.content);
      const oldInlineImageUrls = blogPost.inline_images.map(img => img.image_url);
      const newInlineImageUrls = currentInlineImagesInEditor.map(img => img.url);

      // Identify images to delete from storage and DB
      const imagesToDelete = oldInlineImageUrls.filter(url => !newInlineImageUrls.includes(url));
      for (const url of imagesToDelete) {
        await deleteImageFromStorage(url);
        await supabase.from('blog_images').delete().eq('image_url', url);
      }

      // Identify new images to insert into DB
      const imagesToInsert = newInlineImageUrls.filter(url => !oldInlineImageUrls.includes(url));
      if (imagesToInsert.length > 0) {
        const inlineImageInserts = imagesToInsert.map(url => ({
          post_id: blogPost.id,
          image_url: url,
          alt_text: currentInlineImagesInEditor.find(img => img.url === url)?.alt || null,
        }));
        const { error: inlineImagesError } = await supabase.from('blog_images').insert(inlineImageInserts);
        if (inlineImagesError) console.error('Error inserting new inline images:', inlineImagesError);
      }

      setSuccessMessage('Blog post updated successfully!');
      setEditMode(false); // Exit edit mode after saving
      // Re-fetch the blog post to update the UI with latest data
      // This will trigger the useEffect at the top
      setBlogPost(null); // Clear to force re-fetch
      setIsLoading(true); // Set loading to true to show spinner while re-fetching
      // A more direct way would be to call fetchBlogData() again, but this works.

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

  const handleCancelEdit = () => {
    setEditMode(false);
    setFormData(blogPost ? {
      title: blogPost.title,
      slug: blogPost.slug,
      description: blogPost.description || '',
      content: blogPost.content,
      featured_image_url: blogPost.featured_image_url,
      selected_category_ids: blogPost.categories.map(c => c.id),
      selected_tag_ids: blogPost.tags.map(t => t.id),
    } : null);
    setFeaturedImageFile(null);
    setError(null);
    setSuccessMessage(null);
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
        ['link', 'image', 'video'],
        ['clean']
      ],
      handlers: {
        image: imageHandler,
      },
    },
  }), [imageHandler]);

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

  if (!blogId || !blogPost || !formData) {
    return (
      <div className="p-4 flex flex-col items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center p-8 space-x-2 bg-white rounded-xl shadow-lg">
          <BookText className="w-16 h-16 text-blue-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">No Blog Post Selected</h2>
          
          <p className="text-gray-600 mb-4">Please select a blog post from the list to view or edit.</p>
          <div className="items-center flex justify-center">
              <button
                  onClick={onOpenBlogListPanel}
                  className="px-4 py-2 bg-blue-600 text-sm text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center space-x-2 mx-auto"
          >
                  <List className="w-5 h-5" />
                  <span>Open Blog List</span>
                </button>

              <button
                onClick={onCreateNewBlog}
               className="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors flex items-center space-x-2">
            <PlusCircle className="w-5 h-5" />
            <span>Create New Blog</span>
          </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4">
      <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-lg p-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-900">
            {editMode ? 'Edit Blog Post' : ''} {/*blogPost.title*/}
          </h1>
          <div className="flex space-x-2">
            {/*
            <button
              onClick={onOpenBlogListPanel}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors flex items-center space-x-2"
            >
              <BookText className="w-5 h-5" />
              <span>Blog List</span>
            </button>
            */}
            <TooltipHelp  text = {editMode ? '⚡Click to Read' : '⚡Click to Edit'}>
            <button
              onClick={() => setEditMode(!editMode)}
              className="px-4 py-2 bg-blue-100 text-blue-600 text-normal text-sm rounded-lg hover:bg-blue-200 hover:text-blue-700 transition-colors flex items-center space-x-2"
            >
 
              
              {editMode ? <Eye className="w-4 h-4" /> : <Edit className="w-4 h-4" />}
              <span>{editMode ? 'View Mode' : 'Edit Mode'}</span>
            </button>
            </TooltipHelp>
          </div>
        </div>

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
          {/* Title */}
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">Title</label>
            {editMode ? (
              <input
                type="text"
                id="title"
                name="title"
                value={formData.title}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                required
              />
            ) : (
              <p className="text-lg font-semibold text-gray-800">{blogPost.title}</p>
            )}
          </div>

          {/* Slug */}
          <div>
            <label htmlFor="slug" className="block text-sm font-medium text-gray-700 mb-1">Slug</label>
            <input
              type="text"
              id="slug"
              name="slug"
              value={formData.slug}
              onChange={handleChange} // Allow changing, but keep auto-generation
              className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 focus:ring-blue-500 focus:border-blue-500"
              readOnly={!editMode}
            />
          </div>

          {/* Description */}
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            {editMode ? (
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                required
              />
            ) : (
              <p className="text-gray-700">{blogPost.description}</p>
            )}
          </div>

          {/* Featured Image */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Featured Image</label>
            {editMode ? (
              <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-lg relative">
                {formData.featured_image_url && (
                  <>
                    <img src={formData.featured_image_url} alt="Featured Preview" className="mx-auto h-32 w-auto object-cover mb-4 rounded-md" />
                    <button
                      type="button"
                      onClick={handleRemoveFeaturedImage}
                      className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                      title="Remove featured image"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </>
                )}
                <div className="space-y-1 text-center">
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
            ) : (
              blogPost.featured_image_url && (
                <img src={blogPost.featured_image_url} alt={blogPost.title} className="w-full h-64 object-cover rounded-lg" />
              )
            )}
          </div>

          {/* Rich Text Editor */}
          <div>
            <label htmlFor="content" className="block text-sm font-medium text-gray-700 mb-1">Content</label>
            {editMode ? (
              <ReactQuill
                ref={quillRef}
                theme="snow"
                value={formData.content}
                onChange={handleQuillChange}
                modules={modules}
                formats={formats}
                className="h-96 mb-12"
              />
            ) : (
              <div className="prose max-w-none" dangerouslySetInnerHTML={{ __html: blogPost.content }} />
            )}
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
                  onClick={() => editMode && handleCategoryToggle(category.id)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                    formData.selected_category_ids.includes(category.id)
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  } ${!editMode ? 'cursor-default opacity-70' : ''}`}
                  disabled={!editMode}
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
                  onClick={() => editMode && handleTagToggle(tag.id)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                    formData.selected_tag_ids?.includes(tag.id)
                      ? 'bg-green-600 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  } ${!editMode ? 'cursor-default opacity-70' : ''}`}
                  disabled={!editMode}
                >
                  {tag.name}
                </button>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          {editMode && (
            <div className="pt-8 flex justify-end space-x-4">
              <button
                type="button"
                onClick={handleCancelEdit}
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
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-5 h-5" />
                    <span>Save Changes</span>
                  </>
                )}
              </button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
