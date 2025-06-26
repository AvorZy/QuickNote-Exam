'use client';

import { useState, useEffect } from 'react';
import { PlusIcon, TrashIcon, EyeIcon, PencilIcon, MagnifyingGlassIcon, Bars3BottomLeftIcon } from '@heroicons/react/24/outline';
import { DragDropContext, Droppable, Draggable, DropResult } from 'react-beautiful-dnd';

interface Note {
  id: number;
  title: string;
  content: string;
  created_at: string;
  updated_at: string;
  color?: string;
  order?: number;
}

const API_BASE_URL = 'http://localhost:8000/api';

export default function Home() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [formData, setFormData] = useState({ title: '', content: '' });
  const [loading, setLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingNoteId, setEditingNoteId] = useState<number | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  
  // New state for enhanced features
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'date' | 'title' | 'updated'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Fetch all notes
  const fetchNotes = async () => {
    try {
      console.log('Fetching notes from:', `${API_BASE_URL}/notes`);
      setFetchError(null);
      
      const response = await fetch(`${API_BASE_URL}/notes`);
      console.log('Response status:', response.status);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Received data:', data);
      
      if (data.success) {
        console.log('Setting notes:', data.data);
        setNotes(data.data);
        setFetchError(null);
      } else {
        console.error('API returned success: false', data);
        setFetchError('API returned an error response');
      }
    } catch (error) {
      console.error('Error fetching notes:', error);
      console.error('This might indicate that the backend server is not running on port 8000');
      setFetchError('Cannot connect to the backend server. Make sure the API server is running on port 8000.');
    } finally {
      setIsInitialLoading(false);
    }
  };

  // Create or update a note
  const saveNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.content.trim()) return;

    setLoading(true);
    try {
      const url = isEditing && editingNoteId 
        ? `${API_BASE_URL}/notes/${editingNoteId}`
        : `${API_BASE_URL}/notes`;
      
      const method = isEditing ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          color: '#3B82F6', // Default blue color
          order: isEditing ? undefined : notes.length
        }),
      });
      
      const data = await response.json();
      if (data.success) {
        setFormData({ title: '', content: '' });
        setShowAddForm(false);
        setIsEditing(false);
        setEditingNoteId(null);
        setSelectedNote(null);
        fetchNotes();
      }
    } catch (error) {
      console.error('Error saving note:', error);
    } finally {
      setLoading(false);
    }
  };

  // Start editing a note
  const startEditing = (note: Note) => {
    setFormData({ title: note.title, content: note.content });
    setIsEditing(true);
    setEditingNoteId(note.id);
    setShowAddForm(true);
    setSelectedNote(null);
  };

  // Cancel editing
  const cancelEdit = () => {
    setFormData({ title: '', content: '' });
    setIsEditing(false);
    setEditingNoteId(null);
    setShowAddForm(false);
  };

  // Delete a note
  const deleteNote = async (id: number) => {
    if (!confirm('Are you sure you want to delete this note?')) return;

    try {
      const response = await fetch(`${API_BASE_URL}/notes/${id}`, {
        method: 'DELETE',
      });
      
      const data = await response.json();
      if (data.success) {
        fetchNotes();
        if (selectedNote?.id === id) {
          setSelectedNote(null);
        }
      }
    } catch (error) {
      console.error('Error deleting note:', error);
    }
  };

  // Filter and sort notes
  const getFilteredAndSortedNotes = () => {
    const filteredNotes = notes.filter(note => {
      const matchesSearch = note.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           note.content.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesSearch;
    });

    return filteredNotes.sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case 'title':
          comparison = a.title.localeCompare(b.title);
          break;
        case 'updated':
          comparison = new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime();
          break;
        case 'date':
        default:
          comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
          break;
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });
  };

  // Handle drag and drop
  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;

    const items = Array.from(getFilteredAndSortedNotes());
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    // Update the order property for all notes
    const updatedNotes = items.map((note, index) => ({
      ...note,
      order: index
    }));

    setNotes(prevNotes => {
      const otherNotes = prevNotes.filter(note => !updatedNotes.find(un => un.id === note.id));
      return [...otherNotes, ...updatedNotes];
    });
  };

  // Get color classes for a note
  const getColorClasses = () => {
    // Default to blue color classes
    return { name: 'Blue', value: '#3B82F6', bg: 'bg-blue-100', border: 'border-blue-300', text: 'text-blue-900' };
  };

  // Auto-save functionality
  useEffect(() => {
    const saveToLocalStorage = () => {
      localStorage.setItem('quicknotes-preferences', JSON.stringify({
        searchTerm,
        sortBy,
        sortOrder,
        viewMode
      }));
    };
    
    const timeoutId = setTimeout(saveToLocalStorage, 500);
    return () => clearTimeout(timeoutId);
  }, [searchTerm, sortBy, sortOrder, viewMode]);

  // Load preferences from localStorage
  useEffect(() => {
    const savedPreferences = localStorage.getItem('quicknotes-preferences');
    if (savedPreferences) {
      try {
        const prefs = JSON.parse(savedPreferences);
        setSearchTerm(prefs.searchTerm || '');
        setSortBy(prefs.sortBy || 'date');
        setSortOrder(prefs.sortOrder || 'desc');
        setViewMode(prefs.viewMode || 'grid');
      } catch (error) {
        console.error('Error loading preferences:', error);
      }
    }
  }, []);

  useEffect(() => {
    fetchNotes();
  }, []);

  const filteredAndSortedNotes = getFilteredAndSortedNotes();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col space-y-4 py-6">
            <div className="flex justify-between items-center">
              <h1 className="text-3xl font-bold text-gray-900">QuickNotes</h1>
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => {
                    setShowAddForm(true);
                    setSelectedNote(null);
                  }}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <PlusIcon className="h-5 w-5 mr-2" />
                  Add Note
                </button>
                {fetchError && (
                  <span className="text-sm text-red-600">⚠️ Backend disconnected</span>
                )}
              </div>
            </div>
            
            {/* Search and Filter Controls */}
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
              {/* Search */}
              <div className="relative flex-1 max-w-md">
                <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search notes..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-black placeholder-gray-500"
                />
              </div>
              
              {/* Sort */}
              <div className="flex items-center space-x-2">
                <Bars3BottomLeftIcon className="h-5 w-5 text-gray-400" />
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as 'date' | 'title' | 'updated')}
                  className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500 text-black"
                >
                  <option value="date">Created Date</option>
                  <option value="updated">Updated Date</option>
                  <option value="title">Title</option>
                </select>
                <button
                  onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                  className="px-2 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50"
                >
                  {sortOrder === 'asc' ? '↑' : '↓'}
                </button>
              </div>
              

              {/* View Mode Toggle */}
              <div className="flex border border-gray-300 rounded-md overflow-hidden">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`px-3 py-2 text-sm ${
                    viewMode === 'grid' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  Grid
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`px-3 py-2 text-sm ${
                    viewMode === 'list' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  List
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className={`${showAddForm ? 'grid grid-cols-1 lg:grid-cols-2 gap-8' : 'w-full'}`}>
          {/* Notes List */}
          <div className={`${showAddForm ? '' : 'w-full'}`}>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold text-gray-900">
                Your Notes ({filteredAndSortedNotes.length})
              </h2>
            </div>
            
            {/* Error Message */}
            {fetchError && (
              <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-4">
                <div className="flex">
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-red-800">Connection Error</h3>
                    <div className="mt-2 text-sm text-red-700">
                      <p>{fetchError}</p>
                      <button 
                        onClick={fetchNotes}
                        className="mt-2 text-red-800 underline hover:text-red-900"
                      >
                        Try Again
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            {/* Loading State */}
            {isInitialLoading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-500">Loading notes...</p>
              </div>
            ) : filteredAndSortedNotes.length === 0 && !fetchError ? (
              <div className="text-center py-12">
                <p className="text-gray-500">
                  {searchTerm ? 'No notes match your search.' : 'No notes yet. Create your first note!'}
                </p>
              </div>
            ) : !fetchError ? (
              <DragDropContext onDragEnd={handleDragEnd}>
                <Droppable droppableId="notes" isDropDisabled={false} isCombineEnabled={false}>
                  {(provided) => (
                    <div
                      {...provided.droppableProps}
                      ref={provided.innerRef}
                      className={viewMode === 'grid' 
                        ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4'
                        : 'space-y-3'
                      }
                    >
                      {filteredAndSortedNotes.map((note, index) => {
                        const colorClasses = getColorClasses();
                        return (
                          <Draggable key={note.id} draggableId={note.id.toString()} index={index}>
                            {(provided, snapshot) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                {...provided.dragHandleProps}
                                className={`${colorClasses.bg} ${colorClasses.border} rounded-lg shadow-sm border-2 p-4 cursor-pointer transition-all hover:shadow-md transform ${
                                  snapshot.isDragging ? 'rotate-2 scale-105' : ''
                                } ${
                                  selectedNote?.id === note.id ? 'ring-2 ring-blue-500' : ''
                                } ${
                                  viewMode === 'list' ? 'flex items-center space-x-4' : 'block'
                                }`}
                                onClick={() => setSelectedNote(note)}
                              >
                                {viewMode === 'list' ? (
                                  // List View Layout
                                  <>
                                    <div className="flex-1">
                                      <h3 className={`font-medium ${colorClasses.text} truncate`}>{note.title}</h3>
                                      <p className="text-sm text-gray-600 mt-1">
                                        {note.content.length > 150 ? `${note.content.substring(0, 150)}...` : note.content}
                                      </p>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                      <span className="text-xs text-gray-500">
                                        {new Date(note.created_at).toLocaleDateString()}
                                      </span>
                                      <div className="flex space-x-1">
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setSelectedNote(note);
                                          }}
                                          className="p-1 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded"
                                          title="View"
                                        >
                                          <EyeIcon className="h-4 w-4" />
                                        </button>
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            startEditing(note);
                                          }}
                                          className="p-1 text-green-600 hover:text-green-800 hover:bg-green-50 rounded"
                                          title="Edit"
                                        >
                                          <PencilIcon className="h-4 w-4" />
                                        </button>
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            deleteNote(note.id);
                                          }}
                                          className="p-1 text-red-600 hover:text-red-800 hover:bg-red-50 rounded"
                                          title="Delete"
                                        >
                                          <TrashIcon className="h-4 w-4" />
                                        </button>
                                      </div>
                                    </div>
                                  </>
                                ) : (
                                  // Grid View Layout
                                  <>
                                    <div className="flex justify-between items-start mb-3">
                                      <h3 className={`font-medium ${colorClasses.text} truncate flex-1 mr-2`}>{note.title}</h3>
                                      <div className="flex space-x-1">
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setSelectedNote(note);
                                          }}
                                          className="p-1 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded"
                                          title="View"
                                        >
                                          <EyeIcon className="h-3 w-3" />
                                        </button>
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            startEditing(note);
                                          }}
                                          className="p-1 text-green-600 hover:text-green-800 hover:bg-green-50 rounded"
                                          title="Edit"
                                        >
                                          <PencilIcon className="h-3 w-3" />
                                        </button>
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            deleteNote(note.id);
                                          }}
                                          className="p-1 text-red-600 hover:text-red-800 hover:bg-red-50 rounded"
                                          title="Delete"
                                        >
                                          <TrashIcon className="h-3 w-3" />
                                        </button>
                                      </div>
                                    </div>
                                    <p className="text-sm text-gray-600 mb-3 line-clamp-3">
                                      {note.content.length > 120 ? `${note.content.substring(0, 120)}...` : note.content}
                                    </p>
                                    <div className="flex justify-between items-center text-xs text-gray-500">
                                      <span>{new Date(note.created_at).toLocaleDateString()}</span>
                                      <div className={`w-3 h-3 rounded-full`} style={{backgroundColor: note.color}} title={colorClasses.name}></div>
                                    </div>
                                  </>
                                )}
                              </div>
                            )}
                          </Draggable>
                        );
                      })}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </DragDropContext>
            ) : null}
          </div>

          {/* Note Detail/Add Form */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            {showAddForm ? (
              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-4">
                  {isEditing ? 'Edit Note' : 'Add New Note'}
                </h2>
                <form onSubmit={saveNote} className="space-y-4">
                  <div>
                    <label htmlFor="title" className="block text-sm font-medium text-gray-700">
                      Title
                    </label>
                    <input
                      type="text"
                      id="title"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm px-3 py-2 border text-black placeholder-gray-500"
                      placeholder="Enter note title"
                      required
                    />
                  </div>
                  <div>
                    <label htmlFor="content" className="block text-sm font-medium text-gray-700">
                      Content
                    </label>
                    <textarea
                      id="content"
                      rows={8}
                      value={formData.content}
                      onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm px-3 py-2 border text-black placeholder-gray-500"
                      placeholder="Enter note content"
                      required
                    />
                  </div>
                  

                  <div className="flex space-x-3">
                    <button
                      type="submit"
                      disabled={loading}
                      className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                    >
                      {loading ? 'Saving...' : (isEditing ? 'Update Note' : 'Save Note')}
                    </button>
                    <button
                      type="button"
                      onClick={cancelEdit}
                      className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            ) : selectedNote ? (
              <div>
                <div className="flex justify-between items-start mb-4">
                  <h2 className="text-xl font-semibold text-gray-900">{selectedNote.title}</h2>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => startEditing(selectedNote)}
                      className="text-green-600 hover:text-green-800"
                    >
                      <PencilIcon className="h-5 w-5" />
                    </button>
                    <button
                      onClick={() => deleteNote(selectedNote.id)}
                      className="text-red-600 hover:text-red-800"
                    >
                      <TrashIcon className="h-5 w-5" />
                    </button>
                  </div>
                </div>
                <div className="prose max-w-none">
                  <p className="text-gray-700 whitespace-pre-wrap">{selectedNote.content}</p>
                </div>
                <div className="mt-6 pt-4 border-t border-gray-200">
                  <p className="text-sm text-gray-500">
                    Created: {new Date(selectedNote.created_at).toLocaleString()}
                  </p>
                  <p className="text-sm text-gray-500">
                    Updated: {new Date(selectedNote.updated_at).toLocaleString()}
                  </p>
                </div>
              </div>
            ) : (
              <div className="text-center py-12">
                <p className="text-gray-500">Select a note to view its content or add a new note.</p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
