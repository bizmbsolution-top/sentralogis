'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/lib/hooks/useAuth';
import { Calendar as CalendarIcon, MapPin, Clock, Edit3, Camera, Save, ChevronLeft, CheckCircle, Plus, X } from 'lucide-react';
import { format, isToday } from 'date-fns';

export default function MobileSchedule() {
  const { user, profile } = useAuth();
  const [meetings, setMeetings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Execution State
  const [activeMeeting, setActiveMeeting] = useState<any>(null);
  const [locationLoading, setLocationLoading] = useState(false);
  
  // MOM Form State
  const [momText, setMomText] = useState('');
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [savingMom, setSavingMom] = useState(false);

  // Add Meeting State
  const [showAddSheet, setShowAddSheet] = useState(false);
  const [leads, setLeads] = useState<any[]>([]);
  const [newMeeting, setNewMeeting] = useState({ entity_id: '', description: '', activity_date: '' });
  const [savingNew, setSavingNew] = useState(false);

  useEffect(() => {
    if (user) {
      fetchMeetings();
      fetchLeads();
    }
  }, [user]);

  async function fetchMeetings() {
    setLoading(true);
    try {
      const { data } = await supabase
        .from('crm_activities')
        .select(`id, activity_date, status, description, location, check_in_time, check_in_lat, check_in_lng, md_entities(name)`)
        .eq('activity_type', 'MEETING')
        .eq('performed_by', user?.id)
        .order('activity_date', { ascending: true });
        
      setMeetings(data || []);
    } catch (err) {
      console.warn(err);
    } finally {
      setLoading(false);
    }
  }

  async function fetchLeads() {
    try {
      const { data } = await supabase
        .from('md_entities')
        .select('id, name')
        .eq('sales_rep_id', user?.id)
        .order('name', { ascending: true });
      setLeads(data || []);
    } catch (err) {
      console.warn(err);
    }
  }

  const handleCheckIn = async (meetingId: string) => {
    setLocationLoading(true);
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser.");
      setLocationLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(async (position) => {
      try {
        const { latitude, longitude } = position.coords;
        const checkInTime = new Date().toISOString();
        
        const { error } = await supabase
          .from('crm_activities')
          .update({
            status: 'IN_PROGRESS',
            check_in_time: checkInTime,
            check_in_lat: latitude,
            check_in_lng: longitude
          })
          .eq('id', meetingId);

        if (error) throw error;
        fetchMeetings();
      } catch (err: any) {
        alert("Check-in failed: " + err.message);
      } finally {
        setLocationLoading(false);
      }
    }, (error) => {
      alert("Please allow location access to check in.");
      setLocationLoading(false);
    });
  };

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setPhotoFile(file);
      setPhotoPreview(URL.createObjectURL(file));
    }
  };

  const handleSaveMom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeMeeting) return;
    setSavingMom(true);
    
    try {
      let uploadedPhotoUrl = null;

      if (photoFile) {
        const fileExt = photoFile.name.split('.').pop();
        const fileName = `${activeMeeting.id}_${Date.now()}.${fileExt}`;
        const filePath = `meeting_photos/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('crm_attachments')
          .upload(filePath, photoFile);

        if (uploadError) throw uploadError;

        const { data: publicUrlData } = supabase.storage
          .from('crm_attachments')
          .getPublicUrl(filePath);
        
        uploadedPhotoUrl = publicUrlData.publicUrl;
      }

      const updatedDescription = activeMeeting.description + '\n\n=== MINUTES OF MEETING ===\n' + momText;
      
      const { error } = await supabase
        .from('crm_activities')
        .update({
          description: updatedDescription,
          status: 'COMPLETED',
          ...(uploadedPhotoUrl && { photo_url: uploadedPhotoUrl })
        })
        .eq('id', activeMeeting.id);

      if (error) throw error;
      setActiveMeeting(null);
      setMomText('');
      setPhotoFile(null);
      setPhotoPreview(null);
      fetchMeetings();
    } catch (err: any) {
      alert('Failed to save MOM: ' + err.message);
    } finally {
      setSavingMom(false);
    }
  };

  const handleSaveNewMeeting = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMeeting.entity_id || !newMeeting.activity_date) return;
    setSavingNew(true);

    try {
      const { error } = await supabase.from('crm_activities').insert([{
        tenant_id: profile?.tenant_id,
        entity_id: newMeeting.entity_id,
        activity_type: 'MEETING',
        status: 'SCHEDULED',
        activity_date: new Date(newMeeting.activity_date).toISOString(),
        description: newMeeting.description || 'Visit to prospect',
        performed_by: user?.id,
        is_all_day: false
      }]);

      if (error) throw error;
      setShowAddSheet(false);
      setNewMeeting({ entity_id: '', description: '', activity_date: '' });
      fetchMeetings();
    } catch (err: any) {
      alert("Failed to save meeting: " + err.message);
    } finally {
      setSavingNew(false);
    }
  };

  if (activeMeeting) {
    return (
      <div className="flex flex-col h-[100dvh] bg-white fixed inset-0 z-[1000]">
        <div className="bg-indigo-600 px-4 py-4 flex items-center gap-3 sticky top-0 z-10 text-white shadow-md">
          <button onClick={() => setActiveMeeting(null)} className="p-2 -ml-2 rounded-full active:bg-indigo-700">
            <ChevronLeft className="w-6 h-6" />
          </button>
          <div className="flex-1 min-w-0">
            <h2 className="font-bold text-sm truncate">Complete Meeting</h2>
            <p className="text-[10px] text-indigo-200">MOM & Photo Evidence</p>
          </div>
        </div>

        <form onSubmit={handleSaveMom} className="flex-1 overflow-y-auto p-6 space-y-6 pb-24">
          
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-2">Meeting Notes (MOM) *</label>
            <textarea 
              rows={6} 
              required
              placeholder="What was discussed? Next steps?"
              value={momText} 
              onChange={e => setMomText(e.target.value)} 
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
            ></textarea>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 mb-2">Photo Evidence</label>
            <label className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-slate-300 rounded-2xl cursor-pointer bg-slate-50 relative overflow-hidden active:bg-slate-100 transition-colors">
              {photoPreview ? (
                <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
              ) : (
                <div className="flex flex-col items-center justify-center text-slate-400">
                  <div className="w-12 h-12 bg-white rounded-full shadow-sm flex items-center justify-center mb-2">
                    <Camera className="w-6 h-6 text-indigo-500" />
                  </div>
                  <span className="text-xs font-bold">Tap to Take Photo</span>
                </div>
              )}
              <input 
                type="file" 
                accept="image/*" 
                capture="environment" 
                className="hidden" 
                onChange={handlePhotoSelect}
              />
            </label>
            {photoPreview && (
              <button 
                type="button" 
                onClick={() => { setPhotoFile(null); setPhotoPreview(null); }}
                className="mt-3 text-xs text-red-500 font-bold w-full text-center p-2"
              >
                Retake Photo
              </button>
            )}
          </div>

          <button type="submit" disabled={savingMom} className="w-full py-4 bg-indigo-600 text-white rounded-xl font-bold shadow-lg shadow-indigo-200 active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2">
            {savingMom ? 'Uploading...' : <><Save className="w-5 h-5" /> Save & Complete Meeting</>}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-full bg-slate-50 relative">
      <div className="bg-white px-6 pt-10 pb-4 border-b border-slate-100 sticky top-0 z-20">
        <h1 className="text-2xl font-bold text-slate-800 mb-2">My Schedule</h1>
        <p className="text-xs text-slate-500">Tap to check-in when you arrive at the client's location.</p>
      </div>

      <div className="p-4 space-y-4">
        {loading ? (
          <div className="text-center py-10 text-sm text-slate-400">Loading schedule...</div>
        ) : meetings.length === 0 ? (
          <div className="text-center py-10">
            <CalendarIcon className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-sm font-bold text-slate-600">No meetings found.</p>
            <p className="text-xs text-slate-400 mt-1">Tap the + button to schedule a meeting.</p>
          </div>
        ) : (
          meetings.map(meeting => {
            const entityName = Array.isArray(meeting.md_entities) ? meeting.md_entities[0]?.name : (meeting.md_entities as any)?.name;
            const isScheduled = meeting.status === 'SCHEDULED';
            const isInProgress = meeting.status === 'IN_PROGRESS';
            const isCompleted = meeting.status === 'COMPLETED';

            return (
              <div key={meeting.id} className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 text-indigo-600 mb-1">
                      <Clock className="w-3.5 h-3.5" />
                      <span className="text-xs font-bold">{format(new Date(meeting.activity_date), 'dd MMM yyyy, HH:mm')}</span>
                      {isToday(new Date(meeting.activity_date)) && <span className="bg-red-100 text-red-600 text-[9px] px-1.5 py-0.5 rounded font-bold uppercase">Today</span>}
                    </div>
                    <h3 className="font-bold text-slate-800 text-base">{entityName}</h3>
                  </div>
                  {isCompleted && <CheckCircle className="w-5 h-5 text-emerald-500" />}
                </div>

                <p className="text-xs text-slate-500 mb-4 line-clamp-2 bg-slate-50 p-2 rounded-lg border border-slate-100">
                  {(meeting.description || '').split('===')[0]}
                </p>

                <div className="flex gap-2">
                  {isScheduled && (
                    <button 
                      onClick={() => handleCheckIn(meeting.id)}
                      disabled={locationLoading}
                      className="flex-1 py-3 bg-indigo-600 text-white rounded-xl text-sm font-bold active:bg-indigo-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      <MapPin className="w-4 h-4" /> 
                      {locationLoading ? 'Getting GPS...' : 'Check In Here'}
                    </button>
                  )}

                  {isInProgress && (
                    <button 
                      onClick={() => setActiveMeeting(meeting)}
                      className="flex-1 py-3 bg-amber-500 text-white rounded-xl text-sm font-bold active:bg-amber-600 transition-colors flex items-center justify-center gap-2 shadow-lg shadow-amber-200"
                    >
                      <Edit3 className="w-4 h-4" /> Write MOM
                    </button>
                  )}

                  {isCompleted && (
                    <div className="flex-1 py-2 text-center text-xs font-bold text-emerald-600 bg-emerald-50 rounded-xl flex items-center justify-center gap-1 border border-emerald-100">
                      <CheckCircle className="w-3.5 h-3.5" /> Checked In & Completed
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Floating Action Button */}
      <button 
        onClick={() => setShowAddSheet(true)}
        className="fixed bottom-[90px] right-6 w-14 h-14 bg-indigo-600 rounded-full shadow-lg shadow-indigo-200 flex items-center justify-center text-white active:scale-95 transition-transform z-30"
      >
        <Plus className="w-6 h-6" />
      </button>

      {/* Add Meeting Bottom Sheet */}
      {showAddSheet && (
        <div className="fixed inset-0 z-[1000] flex flex-col justify-end">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setShowAddSheet(false)}></div>
          
          {/* Sheet */}
          <div className="bg-white w-full max-w-md mx-auto rounded-t-3xl p-6 relative z-10 shadow-2xl animate-in slide-in-from-bottom-full duration-200">
            <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mb-6"></div>
            
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-slate-800">New Meeting</h2>
              <button onClick={() => setShowAddSheet(false)} className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 text-slate-500">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveNewMeeting} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5 ml-1">Prospect / Lead *</label>
                <select 
                  required 
                  value={newMeeting.entity_id} 
                  onChange={e => setNewMeeting({...newMeeting, entity_id: e.target.value})} 
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all appearance-none"
                >
                  <option value="" disabled>Select a prospect...</option>
                  {leads.map(lead => (
                    <option key={lead.id} value={lead.id}>{lead.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5 ml-1">Meeting Date & Time *</label>
                <input 
                  required 
                  type="datetime-local" 
                  value={newMeeting.activity_date} 
                  onChange={e => setNewMeeting({...newMeeting, activity_date: e.target.value})} 
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all" 
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5 ml-1">Brief Description</label>
                <input 
                  type="text" 
                  value={newMeeting.description} 
                  onChange={e => setNewMeeting({...newMeeting, description: e.target.value})} 
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all" 
                  placeholder="e.g. Initial intro meeting" 
                />
              </div>

              <div className="pt-4">
                <button type="submit" disabled={savingNew} className="w-full py-3.5 bg-indigo-600 text-white rounded-xl font-bold text-sm shadow-md shadow-indigo-200 active:scale-95 transition-all disabled:opacity-50">
                  {savingNew ? 'Saving...' : 'Save Meeting'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
